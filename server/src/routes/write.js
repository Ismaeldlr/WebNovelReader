const express = require('express');
const writeController = require('../controllers/writeController');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

router.use(authMiddleware);

router.get('/projects', writeController.listProjects);
router.post('/projects', writeController.createProject);
router.get('/projects/:id/context', writeController.getProjectContext);
router.patch('/projects/:id/context', writeController.updateProjectContext);
router.get('/projects/:id/pending', writeController.listPendingItems);
router.post('/projects/:id/pending', writeController.createPendingItem);
router.get('/projects/:id', writeController.getProject);
router.patch('/projects/:id', writeController.updateProject);

router.get('/projects/:id/documents', writeController.listDocuments);
router.post('/projects/:id/documents', writeController.createDocument);

router.get('/documents/:id', writeController.getDocument);
router.patch('/documents/:id', writeController.updateDocument);
router.delete('/documents/:id', writeController.deleteDocument);
router.patch('/documents/:id/reorder', writeController.reorderDocument);
router.get('/documents/:id/versions', writeController.listVersions);
router.get('/documents/:id/versions/:versionId', writeController.getVersion);
router.post('/documents/:id/versions', writeController.createVersion);

router.patch('/pending/:itemId', writeController.updatePendingItem);
router.delete('/pending/:itemId', writeController.deletePendingItem);

module.exports = router;
