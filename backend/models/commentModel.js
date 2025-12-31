const pool = require('../config/db');

const commentModel = {
    // Tạo bình luận mới
    create: async (taskId, userId, content) => {
        const res = await pool.query(
            `INSERT INTO task_comments (task_id, user_id, content) 
             VALUES ($1, $2, $3) 
             RETURNING id, content, created_at, 
             (SELECT name FROM users WHERE id = $2) as user_name`,
            [taskId, userId, content]
        );
        return res.rows[0];
    },

    // Lấy danh sách bình luận của 1 Task
    getByTaskId: async (taskId) => {
        const res = await pool.query(
            `SELECT c.*, u.name as user_name 
             FROM task_comments c
             JOIN users u ON c.user_id = u.id
             WHERE c.task_id = $1
             ORDER BY c.created_at ASC`,
            [taskId]
        );
        return res.rows;
    }
};

module.exports = commentModel;