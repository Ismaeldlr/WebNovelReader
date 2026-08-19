const db = require('../db/db');

const EMPTY_TIPTAP_DOC = '{"type":"doc","content":[{"type":"paragraph"}]}';
const PROJECT_STATUSES = new Set(['active', 'archived']);
const DOCUMENT_TYPES = new Set(['part', 'chapter', 'scene', 'note']);
const DOCUMENT_STATUSES = new Set(['draft', 'in_progress', 'done']);
const PENDING_TAGS = new Set(['urgent', 'idea', 'scene']);
const EMPTY_CONTEXT = {
  setting: '',
  timeline: '',
  tone: '',
  themes: '',
  globalNotes: '',
};

function httpError(message, status = 400) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function asOptionalText(value) {
  if (value == null) return null;
  return String(value).trim();
}

function asWordCount(value) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function normalizeProject(row) {
  if (!row) return null;
  return {
    ...row,
    word_count: Number(row.word_count || 0),
    document_count: Number(row.document_count || 0),
    total_word_count: Number(row.total_word_count || row.word_count || 0),
  };
}

function normalizeDocument(row) {
  if (!row) return null;
  return {
    ...row,
    order_index: Number(row.order_index || 0),
    word_count: Number(row.word_count || 0),
    word_count_target: row.word_count_target == null ? null : Number(row.word_count_target),
  };
}

function normalizeVersion(row) {
  if (!row) return null;
  return {
    ...row,
    word_count: Number(row.word_count || 0),
  };
}

function normalizePendingItem(row) {
  if (!row) return null;
  return {
    ...row,
    order_index: Number(row.order_index || 0),
  };
}

function getObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

async function refreshProjectWordCount(client, projectId, userId) {
  await client.query(
    `UPDATE projects p
     SET word_count = COALESCE((
       SELECT SUM(d.word_count)::int
       FROM documents d
       WHERE d.project_id = p.id
     ), 0)
     WHERE p.id = $1 AND p.user_id = $2`,
    [projectId, userId]
  );
}

class WriteService {
  static async listProjects(userId, { includeArchived = false } = {}) {
    const params = [userId];
    const conditions = ['p.user_id = $1'];

    if (!includeArchived) {
      params.push('active');
      conditions.push(`p.status = $${params.length}::project_status`);
    }

    const { rows } = await db.query(
      `SELECT
         p.*,
         COUNT(d.id)::int AS document_count,
         COALESCE(SUM(d.word_count), 0)::int AS total_word_count
       FROM projects p
       LEFT JOIN documents d ON d.project_id = p.id
       WHERE ${conditions.join(' AND ')}
       GROUP BY p.id
       ORDER BY p.updated_at DESC`,
      params
    );

    return rows.map(normalizeProject);
  }

  static async createProject(userId, payload) {
    const title = asOptionalText(payload.title);
    if (!title) throw httpError('Project title is required');

    const { rows } = await db.query(
      `INSERT INTO projects (user_id, title, description, genre)
       VALUES ($1, $2, $3, $4)
       RETURNING *, 0::int AS document_count, 0::int AS total_word_count`,
      [
        userId,
        title,
        asOptionalText(payload.description),
        asOptionalText(payload.genre),
      ]
    );

    return normalizeProject(rows[0]);
  }

  static async getProject(userId, projectId) {
    const { rows } = await db.query(
      `SELECT
         p.*,
         COUNT(d.id)::int AS document_count,
         COALESCE(SUM(d.word_count), 0)::int AS total_word_count
       FROM projects p
       LEFT JOIN documents d ON d.project_id = p.id
       WHERE p.id = $1 AND p.user_id = $2
       GROUP BY p.id`,
      [projectId, userId]
    );

    return normalizeProject(rows[0]);
  }

  static async updateProject(userId, projectId, payload) {
    const updates = [];
    const params = [projectId, userId];

    if (Object.prototype.hasOwnProperty.call(payload, 'title')) {
      const title = asOptionalText(payload.title);
      if (!title) throw httpError('Project title is required');
      params.push(title);
      updates.push(`title = $${params.length}`);
    }

    if (Object.prototype.hasOwnProperty.call(payload, 'description')) {
      params.push(asOptionalText(payload.description));
      updates.push(`description = $${params.length}`);
    }

    if (Object.prototype.hasOwnProperty.call(payload, 'genre')) {
      params.push(asOptionalText(payload.genre));
      updates.push(`genre = $${params.length}`);
    }

    if (Object.prototype.hasOwnProperty.call(payload, 'settings')) {
      if (payload.settings == null || Array.isArray(payload.settings) || typeof payload.settings !== 'object') {
        throw httpError('Project settings must be an object');
      }
      params.push(payload.settings);
      updates.push(`settings = $${params.length}::jsonb`);
    }

    if (Object.prototype.hasOwnProperty.call(payload, 'status')) {
      if (!PROJECT_STATUSES.has(payload.status)) {
        throw httpError('Invalid project status');
      }
      params.push(payload.status);
      updates.push(`status = $${params.length}::project_status`);
    }

    if (updates.length === 0) {
      return this.getProject(userId, projectId);
    }

    const { rows } = await db.query(
      `UPDATE projects
       SET ${updates.join(', ')}
       WHERE id = $1 AND user_id = $2
       RETURNING *`,
      params
    );

    if (rows.length === 0) throw httpError('Project not found', 404);
    return this.getProject(userId, projectId);
  }

  static async listDocuments(userId, projectId) {
    const { rows } = await db.query(
      `SELECT
         d.id,
         d.project_id,
         d.user_id,
         d.title,
         d.doc_type,
         d.order_index,
         d.status,
         d.word_count,
         d.word_count_target,
         d.summary,
         d.parent_id,
         d.created_at,
         d.updated_at
       FROM documents d
       JOIN projects p ON p.id = d.project_id
       WHERE d.project_id = $1 AND d.user_id = $2 AND p.user_id = $2
       ORDER BY d.order_index ASC, d.created_at ASC`,
      [projectId, userId]
    );

    return rows.map(normalizeDocument);
  }

  static async createDocument(userId, projectId, payload) {
    const title = asOptionalText(payload.title) || 'Untitled document';
    const docType = payload.doc_type || payload.docType || 'chapter';
    const status = payload.status || 'draft';

    if (!DOCUMENT_TYPES.has(docType)) throw httpError('Invalid document type');
    if (!DOCUMENT_STATUSES.has(status)) throw httpError('Invalid document status');

    return db.withTransaction(async (client) => {
      const projectRes = await client.query(
        `SELECT id FROM projects WHERE id = $1 AND user_id = $2`,
        [projectId, userId]
      );

      if (projectRes.rowCount === 0) throw httpError('Project not found', 404);

      const parentId = payload.parent_id || payload.parentId || null;
      if (parentId) {
        const parentRes = await client.query(
          `SELECT id FROM documents WHERE id = $1 AND project_id = $2 AND user_id = $3`,
          [parentId, projectId, userId]
        );
        if (parentRes.rowCount === 0) throw httpError('Parent document not found', 404);
      }

      const requestedOrder = Number(payload.order_index ?? payload.orderIndex);
      let orderIndex = Number.isFinite(requestedOrder) ? requestedOrder : null;
      if (orderIndex == null) {
        const orderRes = await client.query(
          `SELECT COALESCE(MAX(order_index), 0) + 1000 AS next_order
           FROM documents
           WHERE project_id = $1
             AND user_id = $2
             AND (($3::uuid IS NULL AND parent_id IS NULL) OR parent_id = $3::uuid)`,
          [projectId, userId, parentId]
        );
        orderIndex = orderRes.rows[0].next_order;
      }

      const content = docType === 'part'
        ? EMPTY_TIPTAP_DOC
        : (typeof payload.content === 'string' ? payload.content : EMPTY_TIPTAP_DOC);
      const wordCount = docType === 'part' ? 0 : asWordCount(payload.word_count ?? payload.wordCount);

      const { rows } = await client.query(
        `INSERT INTO documents (
           project_id, user_id, title, content, doc_type, order_index,
           status, word_count, word_count_target, summary, parent_id
         )
         VALUES ($1, $2, $3, $4, $5::document_type, $6, $7::doc_status, $8, $9, $10, $11)
         RETURNING *`,
        [
          projectId,
          userId,
          title,
          content,
          docType,
          orderIndex,
          status,
          wordCount,
          payload.word_count_target == null ? null : asWordCount(payload.word_count_target),
          asOptionalText(payload.summary),
          parentId,
        ]
      );

      await refreshProjectWordCount(client, projectId, userId);
      return normalizeDocument(rows[0]);
    });
  }

  static async getDocument(userId, documentId) {
    const { rows } = await db.query(
      `SELECT d.*
       FROM documents d
       JOIN projects p ON p.id = d.project_id
       WHERE d.id = $1 AND d.user_id = $2 AND p.user_id = $2`,
      [documentId, userId]
    );

    return normalizeDocument(rows[0]);
  }

  static async updateDocument(userId, documentId, payload) {
    const updates = [];
    const params = [documentId, userId];

    if (Object.prototype.hasOwnProperty.call(payload, 'content')) {
      if (typeof payload.content !== 'string') throw httpError('Document content must be a string');
      params.push(payload.content);
      updates.push(`content = $${params.length}`);
    }

    if (Object.prototype.hasOwnProperty.call(payload, 'title')) {
      const title = asOptionalText(payload.title);
      if (!title) throw httpError('Document title is required');
      params.push(title);
      updates.push(`title = $${params.length}`);
    }

    if (Object.prototype.hasOwnProperty.call(payload, 'status')) {
      if (!DOCUMENT_STATUSES.has(payload.status)) throw httpError('Invalid document status');
      params.push(payload.status);
      updates.push(`status = $${params.length}::doc_status`);
    }

    if (Object.prototype.hasOwnProperty.call(payload, 'summary')) {
      params.push(asOptionalText(payload.summary));
      updates.push(`summary = $${params.length}`);
    }

    if (
      Object.prototype.hasOwnProperty.call(payload, 'word_count') ||
      Object.prototype.hasOwnProperty.call(payload, 'wordCount')
    ) {
      params.push(asWordCount(payload.word_count ?? payload.wordCount));
      updates.push(`word_count = $${params.length}`);
    }

    if (Object.prototype.hasOwnProperty.call(payload, 'word_count_target')) {
      const target = payload.word_count_target == null ? null : asWordCount(payload.word_count_target);
      params.push(target);
      updates.push(`word_count_target = $${params.length}`);
    }

    if (
      Object.prototype.hasOwnProperty.call(payload, 'parent_id') ||
      Object.prototype.hasOwnProperty.call(payload, 'parentId')
    ) {
      params.push(payload.parent_id || payload.parentId || null);
      updates.push(`parent_id = $${params.length}`);
    }

    if (updates.length === 0) {
      return this.getDocument(userId, documentId);
    }

    return db.withTransaction(async (client) => {
      const { rows } = await client.query(
        `UPDATE documents
         SET ${updates.join(', ')}
         WHERE id = $1 AND user_id = $2
         RETURNING *`,
        params
      );

      if (rows.length === 0) throw httpError('Document not found', 404);

      await refreshProjectWordCount(client, rows[0].project_id, userId);
      return normalizeDocument(rows[0]);
    });
  }

  static async reorderDocument(userId, documentId, orderIndex) {
    const parsed = Number(orderIndex);
    if (!Number.isFinite(parsed)) throw httpError('Order index must be a number');

    return db.withTransaction(async (client) => {
      const { rows } = await client.query(
        `UPDATE documents
         SET order_index = $3
         WHERE id = $1 AND user_id = $2
         RETURNING *`,
        [documentId, userId, parsed]
      );

      if (rows.length === 0) throw httpError('Document not found', 404);
      await refreshProjectWordCount(client, rows[0].project_id, userId);
      return normalizeDocument(rows[0]);
    });
  }

  static async deleteDocument(userId, documentId) {
    return db.withTransaction(async (client) => {
      const docRes = await client.query(
        `SELECT project_id FROM documents WHERE id = $1 AND user_id = $2`,
        [documentId, userId]
      );

      if (docRes.rowCount === 0) throw httpError('Document not found', 404);

      await client.query(
        `WITH RECURSIVE descendants AS (
           SELECT id FROM documents WHERE id = $1 AND user_id = $2
           UNION ALL
           SELECT d.id
           FROM documents d
           JOIN descendants x ON d.parent_id = x.id
           WHERE d.user_id = $2
         )
         DELETE FROM documents
         WHERE id IN (SELECT id FROM descendants) AND user_id = $2`,
        [documentId, userId]
      );
      await refreshProjectWordCount(client, docRes.rows[0].project_id, userId);
      return true;
    });
  }

  static async getProjectContext(userId, projectId) {
    const project = await this.getProject(userId, projectId);
    if (!project) throw httpError('Project not found', 404);

    return {
      ...EMPTY_CONTEXT,
      ...getObject(project.settings?.context),
    };
  }

  static async updateProjectContext(userId, projectId, payload) {
    const allowedKeys = Object.keys(EMPTY_CONTEXT);
    const incoming = {};
    allowedKeys.forEach((key) => {
      if (Object.prototype.hasOwnProperty.call(payload, key)) {
        incoming[key] = payload[key] == null ? '' : String(payload[key]);
      }
    });

    const project = await this.getProject(userId, projectId);
    if (!project) throw httpError('Project not found', 404);

    const settings = getObject(project.settings);
    const context = {
      ...EMPTY_CONTEXT,
      ...getObject(settings.context),
      ...incoming,
    };
    const nextSettings = {
      ...settings,
      context,
    };

    await this.updateProject(userId, projectId, { settings: nextSettings });
    return context;
  }

  static async listPendingItems(userId, projectId, { includeResolved = false } = {}) {
    const params = [projectId, userId];
    const conditions = ['pi.project_id = $1', 'pi.user_id = $2', 'p.user_id = $2'];

    if (!includeResolved) {
      conditions.push('pi.is_resolved = false');
    }

    const { rows } = await db.query(
      `SELECT pi.*
       FROM pending_items pi
       JOIN projects p ON p.id = pi.project_id
       WHERE ${conditions.join(' AND ')}
       ORDER BY pi.is_resolved ASC, pi.order_index ASC, pi.created_at ASC`,
      params
    );

    return rows.map(normalizePendingItem);
  }

  static async createPendingItem(userId, projectId, payload) {
    const content = asOptionalText(payload.content);
    const tag = payload.tag;
    if (!content) throw httpError('Pending item content is required');
    if (!PENDING_TAGS.has(tag)) throw httpError('Invalid pending item tag');

    return db.withTransaction(async (client) => {
      const projectRes = await client.query(
        `SELECT id FROM projects WHERE id = $1 AND user_id = $2`,
        [projectId, userId]
      );
      if (projectRes.rowCount === 0) throw httpError('Project not found', 404);

      const orderRes = await client.query(
        `SELECT COALESCE(MAX(order_index), 0) + 1000 AS next_order
         FROM pending_items
         WHERE project_id = $1 AND user_id = $2`,
        [projectId, userId]
      );

      const { rows } = await client.query(
        `INSERT INTO pending_items (project_id, user_id, content, tag, order_index)
         VALUES ($1, $2, $3, $4::pending_tag, $5)
         RETURNING *`,
        [projectId, userId, content, tag, orderRes.rows[0].next_order]
      );

      return normalizePendingItem(rows[0]);
    });
  }

  static async updatePendingItem(userId, itemId, payload) {
    const updates = [];
    const params = [itemId, userId];

    if (Object.prototype.hasOwnProperty.call(payload, 'content')) {
      const content = asOptionalText(payload.content);
      if (!content) throw httpError('Pending item content is required');
      params.push(content);
      updates.push(`content = $${params.length}`);
    }

    if (Object.prototype.hasOwnProperty.call(payload, 'tag')) {
      if (!PENDING_TAGS.has(payload.tag)) throw httpError('Invalid pending item tag');
      params.push(payload.tag);
      updates.push(`tag = $${params.length}::pending_tag`);
    }

    if (Object.prototype.hasOwnProperty.call(payload, 'is_resolved')) {
      params.push(Boolean(payload.is_resolved));
      updates.push(`is_resolved = $${params.length}`);
    }

    if (Object.prototype.hasOwnProperty.call(payload, 'order_index')) {
      const parsed = Number(payload.order_index);
      if (!Number.isFinite(parsed)) throw httpError('Order index must be a number');
      params.push(parsed);
      updates.push(`order_index = $${params.length}`);
    }

    if (updates.length === 0) {
      const { rows } = await db.query(
        `SELECT * FROM pending_items WHERE id = $1 AND user_id = $2`,
        [itemId, userId]
      );
      if (rows.length === 0) throw httpError('Pending item not found', 404);
      return normalizePendingItem(rows[0]);
    }

    const { rows } = await db.query(
      `UPDATE pending_items
       SET ${updates.join(', ')}
       WHERE id = $1 AND user_id = $2
       RETURNING *`,
      params
    );

    if (rows.length === 0) throw httpError('Pending item not found', 404);
    return normalizePendingItem(rows[0]);
  }

  static async deletePendingItem(userId, itemId) {
    const { rowCount } = await db.query(
      `DELETE FROM pending_items WHERE id = $1 AND user_id = $2`,
      [itemId, userId]
    );

    if (rowCount === 0) throw httpError('Pending item not found', 404);
    return true;
  }

  static async listVersions(userId, documentId) {
    const { rows } = await db.query(
      `SELECT v.id, v.document_id, v.word_count, v.snapshot_at
       FROM document_versions v
       JOIN documents d ON d.id = v.document_id
       JOIN projects p ON p.id = d.project_id
       WHERE v.document_id = $1 AND d.user_id = $2 AND p.user_id = $2
       ORDER BY v.snapshot_at DESC`,
      [documentId, userId]
    );

    return rows.map(normalizeVersion);
  }

  static async getVersion(userId, documentId, versionId) {
    const { rows } = await db.query(
      `SELECT v.*
       FROM document_versions v
       JOIN documents d ON d.id = v.document_id
       JOIN projects p ON p.id = d.project_id
       WHERE v.id = $1 AND v.document_id = $2 AND d.user_id = $3 AND p.user_id = $3`,
      [versionId, documentId, userId]
    );

    return normalizeVersion(rows[0]);
  }

  static async createVersion(userId, documentId, payload = {}) {
    return db.withTransaction(async (client) => {
      const docRes = await client.query(
        `SELECT d.*
         FROM documents d
         JOIN projects p ON p.id = d.project_id
         WHERE d.id = $1 AND d.user_id = $2 AND p.user_id = $2
         FOR UPDATE OF d`,
        [documentId, userId]
      );

      if (docRes.rowCount === 0) throw httpError('Document not found', 404);

      const document = docRes.rows[0];
      const content = typeof payload.content === 'string' ? payload.content : document.content;
      const wordCount = (
        Object.prototype.hasOwnProperty.call(payload, 'word_count') ||
        Object.prototype.hasOwnProperty.call(payload, 'wordCount')
      )
        ? asWordCount(payload.word_count ?? payload.wordCount)
        : Number(document.word_count || 0);

      const { rows } = await client.query(
        `INSERT INTO document_versions (document_id, content, word_count)
         VALUES ($1, $2, $3)
         RETURNING *`,
        [documentId, content, wordCount]
      );

      return normalizeVersion(rows[0]);
    });
  }
}

module.exports = WriteService;
