const fs = require('fs/promises');
const path = require('path');
const crypto = require('crypto');
const AdmZip = require('adm-zip');
const { parseStringPromise } = require('xml2js');
const db = require('../db/db');

const COVER_DIR = path.join(__dirname, '..', '..', 'public', 'covers');

function asArray(value) {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function textValue(value) {
  if (value == null) return '';
  if (typeof value === 'string') return value.trim();
  if (Array.isArray(value)) return textValue(value[0]);
  if (typeof value === 'object') {
    if (typeof value._ === 'string') return value._.trim();
    if (typeof value['#text'] === 'string') return value['#text'].trim();
  }
  return String(value).trim();
}

function stripHtml(html = '') {
  return String(html)
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

function slugify(value) {
  return String(value || 'novel')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'novel';
}

function dirnamePosix(filePath) {
  const normalized = filePath.replace(/\\/g, '/');
  const index = normalized.lastIndexOf('/');
  return index === -1 ? '' : normalized.slice(0, index);
}

function joinPosix(base, target) {
  if (!base) return target.replace(/^\/+/, '');
  return `${base.replace(/\/+$/, '')}/${target.replace(/^\/+/, '')}`;
}

function normalizeZipPath(filePath) {
  return filePath.replace(/\\/g, '/').replace(/^\/+/, '');
}

function getEntryText(zip, filePath) {
  const entry = zip.getEntry(normalizeZipPath(filePath));
  return entry ? entry.getData().toString('utf8') : '';
}

function getEntryBuffer(zip, filePath) {
  const entry = zip.getEntry(normalizeZipPath(filePath));
  return entry ? entry.getData() : null;
}

function getMetadata(metadata, key) {
  const direct = metadata[key];
  if (direct) return textValue(direct);

  const match = Object.keys(metadata).find((metadataKey) => metadataKey.toLowerCase() === key.toLowerCase());
  return match ? textValue(metadata[match]) : '';
}

function getManifestItems(manifest) {
  const items = asArray(manifest?.item);
  const byId = new Map();

  for (const item of items) {
    const attrs = item.$ || {};
    if (attrs.id) {
      byId.set(attrs.id, {
        id: attrs.id,
        href: attrs.href,
        mediaType: attrs['media-type'],
        properties: attrs.properties || '',
      });
    }
  }

  return byId;
}

function getTocMap(ncxText) {
  const titles = new Map();
  if (!ncxText) return titles;

  const navPointRe = /<navPoint[\s\S]*?<\/navPoint>/gi;
  const srcRe = /<content[^>]+src=["']([^"']+)["'][^>]*>/i;
  const titleRe = /<navLabel>[\s\S]*?<text[^>]*>([\s\S]*?)<\/text>[\s\S]*?<\/navLabel>/i;
  const points = ncxText.match(navPointRe) || [];

  for (const point of points) {
    const src = point.match(srcRe)?.[1]?.split('#')[0];
    const title = stripHtml(point.match(titleRe)?.[1] || '');
    if (src && title) titles.set(normalizeZipPath(src), title);
  }

  return titles;
}

function parseNavTitles(navHtml) {
  const titles = new Map();
  if (!navHtml) return titles;

  const linkRe = /<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match;
  while ((match = linkRe.exec(navHtml)) !== null) {
    const href = normalizeZipPath(match[1].split('#')[0]);
    const title = stripHtml(match[2]);
    if (href && title) titles.set(href, title);
  }

  return titles;
}

function detectImageExtension(mediaType = '', filePath = '') {
  if (mediaType.includes('png') || /\.png$/i.test(filePath)) return 'png';
  if (mediaType.includes('webp') || /\.webp$/i.test(filePath)) return 'webp';
  return 'jpg';
}

async function parseEpub(buffer) {
  let zip;
  try {
    zip = new AdmZip(buffer);
  } catch (err) {
    const error = new Error('Could not parse EPUB - the file may be corrupt or unsupported.');
    error.status = 400;
    throw error;
  }

  const containerText = getEntryText(zip, 'META-INF/container.xml');
  if (!containerText) {
    const error = new Error('Could not parse EPUB - missing container metadata.');
    error.status = 400;
    throw error;
  }

  const container = await parseStringPromise(containerText);
  const rootfile = container?.container?.rootfiles?.[0]?.rootfile?.[0]?.$?.['full-path'];
  if (!rootfile) {
    const error = new Error('Could not parse EPUB - missing package file.');
    error.status = 400;
    throw error;
  }

  const opfText = getEntryText(zip, rootfile);
  const opf = await parseStringPromise(opfText);
  const pkg = opf.package;
  const metadata = pkg?.metadata?.[0] || {};
  const manifest = getManifestItems(pkg?.manifest?.[0]);
  const spineItems = asArray(pkg?.spine?.[0]?.itemref);
  const opfDir = dirnamePosix(rootfile);

  const title = getMetadata(metadata, 'dc:title') || 'Untitled EPUB';
  const author = getMetadata(metadata, 'dc:creator') || 'Unknown author';
  const description = stripHtml(getMetadata(metadata, 'dc:description'));
  const identifier = getMetadata(metadata, 'dc:identifier');

  const ncxId = pkg?.spine?.[0]?.$?.toc;
  const ncxItem = ncxId ? manifest.get(ncxId) : null;
  const ncxText = ncxItem?.href ? getEntryText(zip, joinPosix(opfDir, ncxItem.href)) : '';
  const ncxTitles = getTocMap(ncxText);

  const navItem = [...manifest.values()].find((item) => item.properties.split(/\s+/).includes('nav'));
  const navText = navItem?.href ? getEntryText(zip, joinPosix(opfDir, navItem.href)) : '';
  const navTitles = parseNavTitles(navText);

  const coverMetaName = Object.keys(metadata).find((key) => key.toLowerCase() === 'meta');
  const coverMeta = asArray(coverMetaName ? metadata[coverMetaName] : []).find((item) => item.$?.name === 'cover');
  const coverId = coverMeta?.$?.content;
  const coverItem = coverId
    ? manifest.get(coverId)
    : [...manifest.values()].find((item) => item.properties.split(/\s+/).includes('cover-image'));
  const cover = coverItem?.href
    ? {
        buffer: getEntryBuffer(zip, joinPosix(opfDir, coverItem.href)),
        extension: detectImageExtension(coverItem.mediaType, coverItem.href),
      }
    : null;

  const chapters = spineItems
    .map((itemRef, index) => {
      const idref = itemRef.$?.idref;
      const item = idref ? manifest.get(idref) : null;
      if (!item?.href || !/^application\/xhtml\+xml|text\/html$/i.test(item.mediaType || '')) return null;

      const fullPath = joinPosix(opfDir, item.href);
      const rawHtml = getEntryText(zip, fullPath);
      const relativePath = normalizeZipPath(item.href);
      const title =
        ncxTitles.get(relativePath) ||
        navTitles.get(relativePath) ||
        ncxTitles.get(normalizeZipPath(fullPath)) ||
        navTitles.get(normalizeZipPath(fullPath)) ||
        stripHtml(rawHtml.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || '') ||
        `Chapter ${index + 1}`;
      const content = stripHtml(rawHtml);

      return {
        chapterNumber: index + 1,
        title,
        sourceUrl: `epub:${normalizeZipPath(item.href)}`,
        content,
        wordCount: content ? content.split(/\s+/).filter(Boolean).length : 0,
      };
    })
    .filter(Boolean);

  if (chapters.length === 0) {
    const error = new Error('Could not parse EPUB - no readable chapters were found.');
    error.status = 400;
    throw error;
  }

  return {
    title,
    author,
    description,
    identifier,
    cover: cover?.buffer ? cover : null,
    chapters,
  };
}

async function saveCover(novelId, cover) {
  if (!cover?.buffer) return null;

  await fs.mkdir(COVER_DIR, { recursive: true });
  const filename = `${novelId}.${cover.extension}`;
  const filepath = path.join(COVER_DIR, filename);
  await fs.writeFile(filepath, cover.buffer);
  return `/covers/${filename}`;
}

class ImportService {
  static async importEpub(userId, file) {
    const parsed = await parseEpub(file.buffer);
    const identifierHash = parsed.identifier
      ? crypto.createHash('sha256').update(parsed.identifier).digest('hex').slice(0, 16)
      : null;
    const sourceUrl = identifierHash
      ? `epub:${identifierHash}`
      : `epub:${slugify(parsed.title)}-${crypto.createHash('sha256').update(file.buffer).digest('hex').slice(0, 12)}`;

    return db.withTransaction(async (client) => {
      const duplicate = await client.query(
        `SELECT id FROM novels
         WHERE source_url = $1
            OR (LOWER(title::text) = LOWER($2) AND LOWER(COALESCE(author::text, '')) = LOWER($3))
         LIMIT 1`,
        [sourceUrl, parsed.title, parsed.author || '']
      );

      if (duplicate.rowCount > 0) {
        const error = new Error('This novel already exists in your library.');
        error.status = 409;
        throw error;
      }

      const novelResult = await client.query(
        `INSERT INTO novels (
          source_site, source_url, title, author, description, total_chapters, last_scraped_at
        )
        VALUES ('epub', $1, $2, $3, $4, $5, NOW())
        RETURNING id, title, author`,
        [sourceUrl, parsed.title, parsed.author, parsed.description, parsed.chapters.length]
      );

      const novel = novelResult.rows[0];
      const coverUrl = await saveCover(novel.id, parsed.cover);
      if (coverUrl) {
        await client.query('UPDATE novels SET cover_url = $1 WHERE id = $2', [coverUrl, novel.id]);
      }

      for (const chapter of parsed.chapters) {
        const chapterResult = await client.query(
          `INSERT INTO chapters (
            novel_id, chapter_number, title, source_url, is_fetched, discovered_at, fetched_at
          )
          VALUES ($1, $2, $3, $4, true, NOW(), NOW())
          RETURNING id`,
          [novel.id, chapter.chapterNumber, chapter.title, `${sourceUrl}#${chapter.chapterNumber}`]
        );

        await client.query(
          `INSERT INTO chapter_contents (chapter_id, content, word_count)
           VALUES ($1, $2, $3)`,
          [chapterResult.rows[0].id, chapter.content, chapter.wordCount]
        );
      }

      await client.query(
        `INSERT INTO library_entries (user_id, novel_id, status)
         VALUES ($1, $2, 'following')`,
        [userId, novel.id]
      );

      await client.query(
        `INSERT INTO scrape_jobs (
          type, status, triggered_by, novel_id, payload, result,
          progress_percent, progress_message, started_at, completed_at
        )
        VALUES (
          'novel_ingestion',
          'completed',
          $1,
          $2,
          $3,
          $4,
          100,
          'Import complete',
          NOW(),
          NOW()
        )`,
        [
          userId,
          novel.id,
          JSON.stringify({ source: 'epub', filename: file.originalname }),
          JSON.stringify({ title: parsed.title, author: parsed.author, chapterCount: parsed.chapters.length }),
        ]
      );

      return {
        id: novel.id,
        title: novel.title,
        author: novel.author,
        chapterCount: parsed.chapters.length,
      };
    });
  }

  static async getRecentImports(userId) {
    const { rows } = await db.query(
      `SELECT
          sj.id,
          sj.status,
          sj.created_at,
          sj.completed_at,
          sj.payload,
          sj.error_message,
          sj.progress_percent,
          sj.progress_message,
          sj.progress_current,
          sj.progress_total,
          sj.started_at,
          n.id AS novel_id,
          n.title AS novel_title,
          n.source_site
        FROM scrape_jobs sj
        LEFT JOIN novels n ON n.id = sj.novel_id
        WHERE sj.type = 'novel_ingestion'
          AND sj.triggered_by = $1
        ORDER BY sj.created_at DESC
        LIMIT 10`,
      [userId]
    );

    return rows.map((row) => ({
      id: row.id,
      status: row.status,
      createdAt: row.created_at,
      completedAt: row.completed_at,
      startedAt: row.started_at,
      payload: row.payload,
      errorMessage: row.error_message,
      progress: {
        percent: Number(row.progress_percent || 0),
        message: row.progress_message || null,
        current: row.progress_current == null ? null : Number(row.progress_current),
        total: row.progress_total == null ? null : Number(row.progress_total),
      },
      novelId: row.novel_id,
      novelTitle: row.novel_title,
      sourceSite: row.source_site || row.payload?.source || 'epub',
    }));
  }
}

module.exports = ImportService;
