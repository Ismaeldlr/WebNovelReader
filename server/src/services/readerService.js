const db = require('../db/db');

const DEFAULT_PREFERENCES = {
  theme: 'dark',
  font_size: 18,
  line_spacing: 1.8,
  content_width: 'medium',
  prefetch_count: 3,
  update_interval_hours: 6,
};

function parseChapterNumber(value) {
  const chapterNumber = parseInt(value, 10);
  if (!Number.isInteger(chapterNumber) || chapterNumber < 1) {
    const error = new Error('Invalid chapter number');
    error.status = 400;
    throw error;
  }

  return chapterNumber;
}

function mapPreferences(row) {
  return {
    theme: row.pref_theme || DEFAULT_PREFERENCES.theme,
    font_size: Number(row.pref_font_size || DEFAULT_PREFERENCES.font_size),
    line_spacing: Number(row.pref_line_spacing || DEFAULT_PREFERENCES.line_spacing),
    content_width: row.pref_content_width || DEFAULT_PREFERENCES.content_width,
    prefetch_count: Number(row.pref_prefetch_count || DEFAULT_PREFERENCES.prefetch_count),
    update_interval_hours: Number(
      row.pref_update_interval_hours || DEFAULT_PREFERENCES.update_interval_hours
    ),
  };
}

function mapLibraryEntry(row) {
  if (!row.library_id) return null;

  return {
    id: row.library_id,
    status: row.library_status,
    is_favorite: row.library_is_favorite,
    current_chapter_number: row.library_current_chapter_number,
    added_at: row.library_added_at,
    last_read_at: row.library_last_read_at,
  };
}

function mapChapter(row) {
  return {
    novel_id: row.novel_id,
    novel_title: row.novel_title,
    chapter_id: row.chapter_id,
    chapter_number: row.chapter_number,
    chapter_title: row.chapter_title,
    content: row.content,
    word_count: row.word_count,
    previous_chapter_number: row.previous_chapter_number,
    next_chapter_number: row.next_chapter_number,
    reader_preferences: mapPreferences(row),
    library_entry: mapLibraryEntry(row),
  };
}

class ReaderService {
  static async getChapter(novelId, rawChapterNumber, userId) {
    const chapterNumber = parseChapterNumber(rawChapterNumber);

    const { rows } = await db.query(
      `
        SELECT
          n.id AS novel_id,
          n.title AS novel_title,
          c.id AS chapter_id,
          c.chapter_number,
          c.title AS chapter_title,
          c.is_fetched,
          cc.content,
          cc.word_count,
          (
            SELECT MAX(prev.chapter_number)
            FROM chapters prev
            WHERE prev.novel_id = c.novel_id
              AND prev.chapter_number < c.chapter_number
          ) AS previous_chapter_number,
          (
            SELECT MIN(next.chapter_number)
            FROM chapters next
            WHERE next.novel_id = c.novel_id
              AND next.chapter_number > c.chapter_number
          ) AS next_chapter_number,
          rp.theme AS pref_theme,
          rp.font_size AS pref_font_size,
          rp.line_spacing AS pref_line_spacing,
          rp.content_width AS pref_content_width,
          rp.prefetch_count AS pref_prefetch_count,
          rp.update_interval_hours AS pref_update_interval_hours,
          le.id AS library_id,
          le.status AS library_status,
          le.is_favorite AS library_is_favorite,
          le.current_chapter_number AS library_current_chapter_number,
          le.added_at AS library_added_at,
          le.last_read_at AS library_last_read_at
        FROM chapters c
        INNER JOIN novels n
          ON n.id = c.novel_id
        LEFT JOIN chapter_contents cc
          ON cc.chapter_id = c.id
        LEFT JOIN reader_preferences rp
          ON rp.user_id = $3
        LEFT JOIN library_entries le
          ON le.novel_id = n.id
          AND le.user_id = $3
        WHERE c.novel_id = $1
          AND c.chapter_number = $2
      `,
      [novelId, chapterNumber, userId]
    );

    const row = rows[0];
    if (!row) {
      const error = new Error('Chapter not found');
      error.status = 404;
      throw error;
    }

    if (!row.is_fetched || !row.content) {
      const error = new Error('Chapter content is not available yet.');
      error.status = 404;
      throw error;
    }

    return mapChapter(row);
  }

  static async markChapterRead(novelId, rawChapterNumber, userId) {
    const chapterNumber = parseChapterNumber(rawChapterNumber);

    await db.withTransaction(async (client) => {
      const { rows } = await client.query(
        `
          SELECT c.id, c.chapter_number
          FROM chapters c
          INNER JOIN chapter_contents cc
            ON cc.chapter_id = c.id
          WHERE c.novel_id = $1
            AND c.chapter_number = $2
            AND c.is_fetched = TRUE
        `,
        [novelId, chapterNumber]
      );

      const chapter = rows[0];
      if (!chapter) return;

      await client.query(
        `
          UPDATE library_entries
          SET
            current_chapter_number = GREATEST(current_chapter_number, $3),
            current_chapter_id = CASE
              WHEN current_chapter_number <= $3 THEN $4
              ELSE current_chapter_id
            END,
            last_read_at = NOW(),
            updated_at = NOW()
          WHERE user_id = $1
            AND novel_id = $2
        `,
        [userId, novelId, chapter.chapter_number, chapter.id]
      );

      await client.query(
        `
          INSERT INTO reading_history (user_id, novel_id, chapter_id)
          VALUES ($1, $2, $3)
        `,
        [userId, novelId, chapter.id]
      );

      await client.query(
        `
          UPDATE user_new_chapters
          SET seen_at = NOW()
          WHERE user_id = $1
            AND novel_id = $2
            AND chapter_id = $3
            AND seen_at IS NULL
        `,
        [userId, novelId, chapter.id]
      );
    });
  }
}

module.exports = ReaderService;
