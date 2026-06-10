const db = require('../db/db');
const { hashPassword, verifyPassword } = require('./authService');

const ALLOWED_WIDTHS = ['narrow', 'medium', 'wide'];
const LIBRARY_STATUSES = ['reading', 'following', 'on_hold', 'dropped', 'completed'];
const SOURCE_SITES = ['ranobes', 'wtr_lab', 'royal_road', 'epub'];

function validatePreferences(changes) {
  const allowedFields = ['font_size', 'line_spacing', 'content_width'];
  const invalidField = Object.keys(changes).find((key) => !allowedFields.includes(key));

  if (invalidField) {
    const error = new Error(`Field "${invalidField}" cannot be updated here.`);
    error.status = 400;
    throw error;
  }

  if (Object.prototype.hasOwnProperty.call(changes, 'font_size')) {
    const value = Number(changes.font_size);
    if (!Number.isInteger(value) || value < 14 || value > 28) {
      const error = new Error('Font size must be between 14 and 28.');
      error.status = 400;
      throw error;
    }
  }

  if (Object.prototype.hasOwnProperty.call(changes, 'line_spacing')) {
    const value = Number(changes.line_spacing);
    if (!Number.isFinite(value) || value < 1.4 || value > 2.2) {
      const error = new Error('Line spacing must be between 1.4 and 2.2.');
      error.status = 400;
      throw error;
    }
  }

  if (
    Object.prototype.hasOwnProperty.call(changes, 'content_width')
    && !ALLOWED_WIDTHS.includes(changes.content_width)
  ) {
    const error = new Error('Content width must be narrow, medium, or wide.');
    error.status = 400;
    throw error;
  }
}

function mapPreferences(row) {
  return {
    theme: row.theme,
    font_size: Number(row.font_size),
    line_spacing: Number(row.line_spacing),
    content_width: row.content_width,
    prefetch_count: Number(row.prefetch_count),
    update_interval_hours: Number(row.update_interval_hours),
  };
}

function toDateKey(value) {
  if (!value) return null;
  if (typeof value === 'string') return value.slice(0, 10);
  return value.toISOString().slice(0, 10);
}

function addDays(date, days) {
  const nextDate = new Date(date);
  nextDate.setUTCDate(nextDate.getUTCDate() + days);
  return nextDate;
}

function startOfUtcDay(date = new Date()) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function buildActivityWindow(activityRows) {
  const countsByDate = new Map(activityRows.map((row) => [toDateKey(row.date), Number(row.count) || 0]));
  const today = startOfUtcDay();
  const startDate = addDays(today, -89);

  return Array.from({ length: 90 }, (_, index) => {
    const date = addDays(startDate, index);
    const dateKey = date.toISOString().slice(0, 10);
    return {
      date: dateKey,
      count: countsByDate.get(dateKey) || 0,
    };
  });
}

function calculateStreaks(dateRows) {
  // Fetch all distinct DATE(read_at) values for the user ordered descending, then walk the array counting consecutive days.
  const readDates = dateRows
    .map((row) => toDateKey(row.date))
    .filter(Boolean);

  if (readDates.length === 0) {
    return { current: 0, longest: 0 };
  }

  const today = startOfUtcDay();
  const yesterday = addDays(today, -1);
  const dateSet = new Set(readDates);
  let current = 0;
  let cursor = dateSet.has(today.toISOString().slice(0, 10)) ? today : yesterday;

  while (dateSet.has(cursor.toISOString().slice(0, 10))) {
    current += 1;
    cursor = addDays(cursor, -1);
  }

  let longest = 0;
  let run = 0;
  let previousDate = null;

  readDates.forEach((dateKey) => {
    const currentDate = new Date(`${dateKey}T00:00:00.000Z`);
    if (!previousDate) {
      run = 1;
    } else {
      const expectedPrevious = addDays(previousDate, -1).toISOString().slice(0, 10);
      run = expectedPrevious === dateKey ? run + 1 : 1;
    }

    longest = Math.max(longest, run);
    previousDate = currentDate;
  });

  return { current, longest };
}

function mapBreakdown(rows, keys) {
  const counts = new Map(rows.map((row) => [row.key, Number(row.count) || 0]));
  return keys.map((key) => ({
    key,
    count: counts.get(key) || 0,
  }));
}

class UserService {
  static async getProfile(userId) {
    const [
      userResult,
      libraryTotalResult,
      readingStatsResult,
      wordsResult,
      completedResult,
      statusBreakdownResult,
      sourceBreakdownResult,
      topNovelsResult,
      activityResult,
      readDatesResult,
      longestNovelResult,
    ] = await Promise.all([
      db.query(
        `
          SELECT id, username, created_at
          FROM users
          WHERE id = $1
        `,
        [userId]
      ),
      db.query(
        `
          SELECT COUNT(*)::int AS total
          FROM library_entries
          WHERE user_id = $1
        `,
        [userId]
      ),
      db.query(
        `
          SELECT
            COUNT(rh.id)::int AS chapters_read,
            COUNT(DISTINCT rh.novel_id)::int AS novels_started,
            COUNT(DISTINCT NULLIF(n.author::text, ''))::int AS authors_explored,
            COUNT(DISTINCT DATE(rh.read_at))::int AS active_days
          FROM reading_history rh
          INNER JOIN novels n
            ON n.id = rh.novel_id
          WHERE rh.user_id = $1
        `,
        [userId]
      ),
      db.query(
        `
          SELECT COALESCE(SUM(cc.word_count), 0)::bigint AS words_read
          FROM reading_history rh
          INNER JOIN chapters c
            ON c.id = rh.chapter_id
          LEFT JOIN chapter_contents cc
            ON cc.chapter_id = c.id
          WHERE rh.user_id = $1
        `,
        [userId]
      ),
      db.query(
        `
          SELECT COUNT(*)::int AS completed_count
          FROM library_entries
          WHERE user_id = $1
            AND status = 'completed'
        `,
        [userId]
      ),
      db.query(
        `
          SELECT status::text AS key, COUNT(*)::int AS count
          FROM library_entries
          WHERE user_id = $1
          GROUP BY status
        `,
        [userId]
      ),
      db.query(
        `
          SELECT n.source_site::text AS key, COUNT(*)::int AS count
          FROM library_entries le
          INNER JOIN novels n
            ON n.id = le.novel_id
          WHERE le.user_id = $1
          GROUP BY n.source_site
        `,
        [userId]
      ),
      db.query(
        `
          SELECT
            n.id,
            n.title,
            n.author,
            n.cover_url,
            COUNT(rh.id)::int AS reads_count
          FROM reading_history rh
          INNER JOIN novels n
            ON n.id = rh.novel_id
          WHERE rh.user_id = $1
          GROUP BY n.id, n.title, n.author, n.cover_url
          ORDER BY reads_count DESC, n.title ASC
          LIMIT 5
        `,
        [userId]
      ),
      db.query(
        `
          SELECT DATE(read_at) AS date, COUNT(*)::int AS count
          FROM reading_history
          WHERE user_id = $1
            AND read_at >= CURRENT_DATE - INTERVAL '89 days'
          GROUP BY DATE(read_at)
          ORDER BY date ASC
        `,
        [userId]
      ),
      db.query(
        `
          SELECT DISTINCT DATE(read_at) AS date
          FROM reading_history
          WHERE user_id = $1
          ORDER BY date DESC
        `,
        [userId]
      ),
      db.query(
        `
          SELECT
            n.id,
            n.title,
            MAX(c.chapter_number)::int AS chapter_number
          FROM reading_history rh
          INNER JOIN novels n
            ON n.id = rh.novel_id
          INNER JOIN chapters c
            ON c.id = rh.chapter_id
          WHERE rh.user_id = $1
          GROUP BY n.id, n.title
          ORDER BY chapter_number DESC, n.title ASC
          LIMIT 1
        `,
        [userId]
      ),
    ]);

    const user = userResult.rows[0];
    if (!user) {
      const error = new Error('User not found.');
      error.status = 404;
      throw error;
    }

    const readingStats = readingStatsResult.rows[0] || {};
    const chaptersRead = Number(readingStats.chapters_read) || 0;
    const activeDays = Number(readingStats.active_days) || 0;
    const longestNovel = longestNovelResult.rows[0];

    return {
      user,
      stats: {
        total_novels: libraryTotalResult.rows[0]?.total || 0,
        chapters_read: chaptersRead,
        words_read: Number(wordsResult.rows[0]?.words_read) || 0,
        novels_started: Number(readingStats.novels_started) || 0,
        novels_completed: completedResult.rows[0]?.completed_count || 0,
        authors_explored: Number(readingStats.authors_explored) || 0,
        average_chapters_per_day: activeDays > 0 ? chaptersRead / activeDays : 0,
        longest_novel_read: longestNovel
          ? {
              id: longestNovel.id,
              title: longestNovel.title,
              chapter_number: longestNovel.chapter_number,
            }
          : null,
        streak: calculateStreaks(readDatesResult.rows),
        library_status_breakdown: mapBreakdown(statusBreakdownResult.rows, LIBRARY_STATUSES),
        library_source_breakdown: mapBreakdown(sourceBreakdownResult.rows, SOURCE_SITES),
        top_novels: topNovelsResult.rows,
        activity: buildActivityWindow(activityResult.rows),
      },
    };
  }

  static async updatePassword(userId, currentPassword, newPassword) {
    if (typeof currentPassword !== 'string' || typeof newPassword !== 'string') {
      const error = new Error('Current password and new password are required.');
      error.status = 400;
      throw error;
    }

    if (newPassword.length < 8 || newPassword.length > 128) {
      const error = new Error('New password must be 8-128 characters.');
      error.status = 400;
      throw error;
    }

    const { rows } = await db.query(
      `
        SELECT password_hash
        FROM users
        WHERE id = $1
      `,
      [userId]
    );

    const user = rows[0];
    if (!user || !(await verifyPassword(currentPassword, user.password_hash))) {
      const error = new Error('Current password is incorrect.');
      error.status = 400;
      throw error;
    }

    const nextHash = await hashPassword(newPassword);
    await db.query(
      `
        UPDATE users
        SET password_hash = $2
        WHERE id = $1
      `,
      [userId, nextHash]
    );
  }

  static async updateReaderPreferences(userId, changes) {
    changes = changes || {};
    validatePreferences(changes);

    const fontSize = Object.prototype.hasOwnProperty.call(changes, 'font_size')
      ? Number(changes.font_size)
      : null;
    const lineSpacing = Object.prototype.hasOwnProperty.call(changes, 'line_spacing')
      ? Number(changes.line_spacing)
      : null;
    const contentWidth = Object.prototype.hasOwnProperty.call(changes, 'content_width')
      ? changes.content_width
      : null;

    const { rows } = await db.query(
      `
        INSERT INTO reader_preferences (
          user_id,
          font_size,
          line_spacing,
          content_width
        )
        VALUES (
          $1,
          COALESCE($2::smallint, 18),
          COALESCE($3::numeric, 1.8),
          COALESCE($4::content_width, 'medium'::content_width)
        )
        ON CONFLICT (user_id) DO UPDATE
        SET
          font_size = COALESCE($2::smallint, reader_preferences.font_size),
          line_spacing = COALESCE($3::numeric, reader_preferences.line_spacing),
          content_width = COALESCE($4::content_width, reader_preferences.content_width),
          updated_at = NOW()
        RETURNING
          theme,
          font_size,
          line_spacing,
          content_width,
          prefetch_count,
          update_interval_hours
      `,
      [userId, fontSize, lineSpacing, contentWidth]
    );

    return mapPreferences(rows[0]);
  }
}

module.exports = UserService;
