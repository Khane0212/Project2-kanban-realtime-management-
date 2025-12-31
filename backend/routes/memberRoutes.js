const express = require('express');
const router = express.Router();
const memberController = require('../controllers/memberController');
const authMiddleware = require('../middleware/authMiddleware'); 


router.get('/:projectId', authMiddleware, memberController.getProjectMembers);
router.post('/:projectId/add', authMiddleware, memberController.addMemberByEmail); 
router.delete('/:projectId/:userId', authMiddleware, memberController.removeMember);

module.exports = router;