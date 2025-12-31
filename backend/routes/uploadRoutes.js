const express = require('express');
const router = express.Router();
const uploadController = require('../controllers/uploadController');
const uploadMiddleware = require('../middleware/uploadMiddleware'); 
const protect = require('../middleware/authMiddleware'); 

router.post('/:taskId', protect, (req, res, next) => {
    uploadMiddleware(req, res, (err) => {
        if (err) {
            return res.status(400).json({ message: err.message });
        }
        next();
    });
}, uploadController.uploadFile);

router.get('/:taskId', protect, uploadController.getFilesByTask);
router.delete('/:id', protect, uploadController.deleteFile);

module.exports = router;