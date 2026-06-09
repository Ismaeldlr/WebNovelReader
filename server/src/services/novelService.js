const db = require('../db/db');
const fs = require('fs/promises');
const path = require('path');

function mapNovelDetail(row) {
  if (!row) return null;

  return {
    id: row.id,
    source_site: row.source_site,
    source_url: row.source_url,
    title: row.title,
    author: row.author,
    description: row.description,
    cover_url: row.cover_url,
    tags: row.tags || [],
    total_chapters: row.total_chapters,
    is_update_failed: row.is_update_failed,
    ingested_at: row.ingested_at,
    last_scraped_at: row.last_scraped_at,
    library_entry: row.library_id
      ? {
          id: row.library_id,
          status: row.library_status,
          is_favorite: row.is_favorite,
          current_chapter_number: row.current_chapter_number,
          added_at: row.added_at,
          last_read_at: row.last_read_at,
        }
      : null,
    new_chapters_count: parseInt(row.new_chapters_count, 10) || 0,
  };
}

class NovelService {
  static async ensureEditableEpub(novelId, client = db) {
    const { rows } = await client.query(
      `SELECT id, source_site FROM novels WHERE id = $1`,
      [novelId]
    );

    if (!rows[0]) {
      const error = new Error('Novel not found');
      error.status = 404;
      throw error;
    }

    if (rows[0].source_site !== 'epub') {
      const error = new Error('Only EPUB imports can be edited.');
      error.status = 403;
      throw error;
    }

    return rows[0];
  }

  static async getNovelDetail(novelId, userId) {
    const { rows } = await db.query(
      `
        SELECT
          n.id,
          n.source_site,
          n.source_url,
          n.title,
          n.author,
          n.description,
          n.cover_url,
          n.tags,
          n.total_chapters,
          n.is_update_failed,
          n.ingested_at,
          n.last_scraped_at,

          le.id AS library_id,
          le.status AS library_status,
          le.is_favorite,
          le.current_chapter_number,
          le.added_at,
          le.last_read_at,

          COUNT(unc.id) FILTER (WHERE unc.seen_at IS NULL) AS new_chapters_count
        FROM novels n
        LEFT JOIN library_entries le
          ON le.novel_id = n.id
          AND le.user_id = $2
        LEFT JOIN user_new_chapters unc
          ON unc.novel_id = n.id
          AND unc.user_id = $2
        WHERE n.id = $1
        GROUP BY n.id, le.id
      `,
      [novelId, userId]
    );

    return mapNovelDetail(rows[0]);
  }

  static async getNovelChapters(novelId, userId, { page = 1, limit = 100, order = 'asc' } = {}) {
    const safePage = Math.max(parseInt(page, 10) || 1, 1);
    const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 100, 1), 200);
    const safeOrder = String(order).toLowerCase() === 'desc' ? 'DESC' : 'ASC';
    const offset = (safePage - 1) * safeLimit;

    const [chapterResult, countResult] = await Promise.all([
      db.query(
        `
          SELECT
            c.id,
            c.chapter_number,
            c.title,
            c.source_url,
            c.is_fetched,
            c.discovered_at,
            CASE
              WHEN unc.id IS NOT NULL AND unc.seen_at IS NULL THEN TRUE
              ELSE FALSE
            END AS is_user_new
          FROM chapters c
          LEFT JOIN user_new_chapters unc
            ON unc.chapter_id = c.id
            AND unc.user_id = $2
          WHERE c.novel_id = $1
          ORDER BY c.chapter_number ${safeOrder}
          LIMIT $3 OFFSET $4
        `,
        [novelId, userId, safeLimit, offset]
      ),
      db.query(
        `SELECT COUNT(*) AS total FROM chapters WHERE novel_id = $1`,
        [novelId]
      ),
    ]);

    const total = parseInt(countResult.rows[0].total, 10) || 0;

    return {
      chapters: chapterResult.rows,
      total,
      page: safePage,
      limit: safeLimit,
      has_more: offset + chapterResult.rows.length < total,
    };
  }

  static validateNovelPatch(changes) {
    const allowedFields = ['title', 'author', 'description', 'tags'];
    const invalidField = Object.keys(changes).find((key) => !allowedFields.includes(key));
    if (invalidField) {
      const error = new Error(`Field "${invalidField}" cannot be edited.`);
      error.status = 400;
      throw error;
    }

    if (Object.prototype.hasOwnProperty.call(changes, 'title')) {
      if (typeof changes.title !== 'string' || changes.title.trim() === '') {
        const error = new Error('Title cannot be empty.');
        error.status = 400;
        throw error;
      }
    }

    for (const key of ['author', 'description']) {
      if (
        Object.prototype.hasOwnProperty.call(changes, key) &&
        changes[key] != null &&
        typeof changes[key] !== 'string'
      ) {
        const error = new Error(`${key} must be text.`);
        error.status = 400;
        throw error;
      }
    }

    if (Object.prototype.hasOwnProperty.call(changes, 'tags')) {
      if (!Array.isArray(changes.tags) || changes.tags.some((tag) => typeof tag !== 'string')) {
        const error = new Error('Tags must be an array of strings.');
        error.status = 400;
        throw error;
      }
    }
  }

  static async updateNovel(novelId, userId, changes) {
    changes = changes || {};
    this.validateNovelPatch(changes);

    return db.withTransaction(async (client) => {
      await this.ensureEditableEpub(novelId, client);

      const setClauses = [];
      const values = [];
      let paramIndex = 1;

      if (Object.prototype.hasOwnProperty.call(changes, 'title')) {
        setClauses.push(`title = $${paramIndex++}`);
        values.push(changes.title.trim());
      }

      if (Object.prototype.hasOwnProperty.call(changes, 'author')) {
        setClauses.push(`author = $${paramIndex++}`);
        values.push(changes.author?.trim() || null);
      }

      if (Object.prototype.hasOwnProperty.call(changes, 'description')) {
        setClauses.push(`description = $${paramIndex++}`);
        values.push(changes.description?.trim() || null);
      }

      if (Object.prototype.hasOwnProperty.call(changes, 'tags')) {
        const tags = [...new Set(changes.tags.map((tag) => tag.trim()).filter(Boolean))];
        setClauses.push(`tags = $${paramIndex++}`);
        values.push(tags);
      }

      if (setClauses.length > 0) {
        values.push(novelId);
        await client.query(
          `UPDATE novels
           SET ${setClauses.join(', ')}, updated_at = NOW()
           WHERE id = $${paramIndex}`,
          values
        );
      }

      const { rows } = await client.query(
        `
          SELECT
            n.id,
            n.source_site,
            n.source_url,
            n.title,
            n.author,
            n.description,
            n.cover_url,
            n.tags,
            n.total_chapters,
            n.is_update_failed,
            n.ingested_at,
            n.last_scraped_at,

            le.id AS library_id,
            le.status AS library_status,
            le.is_favorite,
            le.current_chapter_number,
            le.added_at,
            le.last_read_at,

            COUNT(unc.id) FILTER (WHERE unc.seen_at IS NULL) AS new_chapters_count
          FROM novels n
          LEFT JOIN library_entries le
            ON le.novel_id = n.id
            AND le.user_id = $2
          LEFT JOIN user_new_chapters unc
            ON unc.novel_id = n.id
            AND unc.user_id = $2
          WHERE n.id = $1
          GROUP BY n.id, le.id
        `,
        [novelId, userId]
      );

      return mapNovelDetail(rows[0]);
    });
  }

  static async updateCover(novelId, file) {
    await this.ensureEditableEpub(novelId);

    const coverUrl = `/covers/${file.filename}`;
    await db.query(
      `UPDATE novels SET cover_url = $1, updated_at = NOW() WHERE id = $2`,
      [coverUrl, novelId]
    );

    const coversDir = path.dirname(file.path);
    await Promise.all(
      ['.jpg', '.png', '.webp']
        .map((extension) => path.join(coversDir, `${novelId}${extension}`))
        .filter((candidate) => candidate !== file.path)
        .map((candidate) => fs.rm(candidate, { force: true }).catch(() => undefined))
    );

    return coverUrl;
  }
}

module.exports = NovelService;
