const WriteService = require('../services/writeService');

function send(res, data, status = 200) {
  res.status(status).json({ success: true, data, error: null });
}

exports.listProjects = async (req, res, next) => {
  try {
    const projects = await WriteService.listProjects(req.user.id, {
      includeArchived: req.query.includeArchived === 'true',
    });
    send(res, projects);
  } catch (err) {
    next(err);
  }
};

exports.createProject = async (req, res, next) => {
  try {
    const project = await WriteService.createProject(req.user.id, req.body);
    send(res, project, 201);
  } catch (err) {
    next(err);
  }
};

exports.getProject = async (req, res, next) => {
  try {
    const project = await WriteService.getProject(req.user.id, req.params.id);
    if (!project) {
      res.status(404).json({ success: false, data: null, error: 'Project not found' });
      return;
    }
    send(res, project);
  } catch (err) {
    next(err);
  }
};

exports.updateProject = async (req, res, next) => {
  try {
    const project = await WriteService.updateProject(req.user.id, req.params.id, req.body);
    send(res, project);
  } catch (err) {
    next(err);
  }
};

exports.getProjectContext = async (req, res, next) => {
  try {
    const context = await WriteService.getProjectContext(req.user.id, req.params.id);
    send(res, context);
  } catch (err) {
    next(err);
  }
};

exports.updateProjectContext = async (req, res, next) => {
  try {
    const context = await WriteService.updateProjectContext(req.user.id, req.params.id, req.body);
    send(res, context);
  } catch (err) {
    next(err);
  }
};

exports.listDocuments = async (req, res, next) => {
  try {
    const documents = await WriteService.listDocuments(req.user.id, req.params.id);
    send(res, documents);
  } catch (err) {
    next(err);
  }
};

exports.createDocument = async (req, res, next) => {
  try {
    const document = await WriteService.createDocument(req.user.id, req.params.id, req.body);
    send(res, document, 201);
  } catch (err) {
    next(err);
  }
};

exports.getDocument = async (req, res, next) => {
  try {
    const document = await WriteService.getDocument(req.user.id, req.params.id);
    if (!document) {
      res.status(404).json({ success: false, data: null, error: 'Document not found' });
      return;
    }
    send(res, document);
  } catch (err) {
    next(err);
  }
};

exports.updateDocument = async (req, res, next) => {
  try {
    const document = await WriteService.updateDocument(req.user.id, req.params.id, req.body);
    send(res, document);
  } catch (err) {
    next(err);
  }
};

exports.deleteDocument = async (req, res, next) => {
  try {
    await WriteService.deleteDocument(req.user.id, req.params.id);
    send(res, null);
  } catch (err) {
    next(err);
  }
};

exports.reorderDocument = async (req, res, next) => {
  try {
    const document = await WriteService.reorderDocument(req.user.id, req.params.id, req.body.order_index);
    send(res, document);
  } catch (err) {
    next(err);
  }
};

exports.listVersions = async (req, res, next) => {
  try {
    const versions = await WriteService.listVersions(req.user.id, req.params.id);
    send(res, versions);
  } catch (err) {
    next(err);
  }
};

exports.getVersion = async (req, res, next) => {
  try {
    const version = await WriteService.getVersion(req.user.id, req.params.id, req.params.versionId);
    if (!version) {
      res.status(404).json({ success: false, data: null, error: 'Version not found' });
      return;
    }
    send(res, version);
  } catch (err) {
    next(err);
  }
};

exports.createVersion = async (req, res, next) => {
  try {
    const version = await WriteService.createVersion(req.user.id, req.params.id, req.body);
    send(res, version, 201);
  } catch (err) {
    next(err);
  }
};

exports.listPendingItems = async (req, res, next) => {
  try {
    const items = await WriteService.listPendingItems(req.user.id, req.params.id, {
      includeResolved: req.query.resolved === 'true',
    });
    send(res, items);
  } catch (err) {
    next(err);
  }
};

exports.createPendingItem = async (req, res, next) => {
  try {
    const item = await WriteService.createPendingItem(req.user.id, req.params.id, req.body);
    send(res, item, 201);
  } catch (err) {
    next(err);
  }
};

exports.updatePendingItem = async (req, res, next) => {
  try {
    const item = await WriteService.updatePendingItem(req.user.id, req.params.itemId, req.body);
    send(res, item);
  } catch (err) {
    next(err);
  }
};

exports.deletePendingItem = async (req, res, next) => {
  try {
    await WriteService.deletePendingItem(req.user.id, req.params.itemId);
    send(res, null);
  } catch (err) {
    next(err);
  }
};
