const express = require('express');
const router = express.Router();
const projectController = require('../controllers/projectController');

const protect = require('../middleware/authMiddleware'); 

router.get('/', protect, projectController.getMyProjects);
router.post('/', protect, projectController.createProject);

router.get('/:id', protect, projectController.getProjectById);
router.put('/:id', protect, projectController.updateProject);
router.delete('/:id', protect, projectController.deleteProject);

module.exports = router;