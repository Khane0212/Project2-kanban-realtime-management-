const express = require('express');
const router = express.Router();
const taskController = require('../controllers/taskController');
const attachmentController = require('../controllers/uploadController');
const authMiddleware = require('../middleware/authMiddleware');
const uploadMiddleware = require('../middleware/uploadMiddleware'); 
const commentController = require('../controllers/commentController');

router.post('/', authMiddleware, taskController.createTask);
router.get('/project/:projectId', authMiddleware, taskController.getProjectTasks);
router.put('/:id', authMiddleware, taskController.updateTask);
router.delete('/:id', authMiddleware, taskController.deleteTask);

router.post('/:taskId/upload', authMiddleware, (req, res, next) => {
    uploadMiddleware(req, res, (err) => {
        if (err) return res.status(400).json({ message: err.message });
        next();
    });
}, attachmentController.uploadFile);
router.get('/:taskId/files', authMiddleware, attachmentController.getFilesByTask);
router.delete('/files/:id', authMiddleware, attachmentController.deleteFile);

router.get('/:taskId/comments', authMiddleware, commentController.getComments);
router.post('/:taskId/comments', authMiddleware, commentController.addComment);

module.exports = router;