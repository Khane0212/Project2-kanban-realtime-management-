const commentModel = require('../models/commentModel');
const taskModel = require('../models/taskModel');

exports.addComment = async (req, res) => {
    const { taskId } = req.params;
    const { content } = req.body;
    const userId = req.user.id;

    try {
        const newComment = await commentModel.create(taskId, userId, content);        
        // Gửi Socket để mọi người trong dự án thấy comment mới
        const task = await taskModel.getTaskById(taskId);
    if (req.io && task) {
        // Ép kiểu ID dự án về String để khớp với room mà Member đã Join
        const roomName = `project_${String(task.project_id)}`;
        
        req.io.to(roomName).emit('new_comment', {
            taskId: parseInt(taskId), // Frontend dùng số nên giữ nguyên parseInt
            comment: newComment
        });
        console.log(`Đã bắn comment vào phòng: ${roomName}`); 
    }

            res.status(201).json(newComment);
        } catch (err) {
            res.status(500).json({ message: 'Lỗi khi gửi bình luận' });
        }
};

exports.getComments = async (req, res) => {
    try {
        const comments = await commentModel.getByTaskId(req.params.taskId);
        res.json(comments);
    } catch (err) {
        res.status(500).json({ message: 'Lỗi tải bình luận' });
    }
};