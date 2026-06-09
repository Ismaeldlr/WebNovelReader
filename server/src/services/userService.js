const db = require('../db/db');

const ALLOWED_WIDTHS = ['narrow', 'medium', 'wide'];

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

class UserService {
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
