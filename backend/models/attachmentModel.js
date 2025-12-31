const pool = require('../config/db');

const AttachmentModel = {
  // 1. Hàm thêm file mới
  create: async ({ taskId, fileName, filePath, fileType, fileSize, userId }) => {
    const query = `
        INSERT INTO attachments 
        (task_id, file_name, file_path, file_type, file_size, uploaded_by) 
        VALUES ($1, $2, $3, $4, $5, $6) 
        RETURNING *
    `;
    const values = [taskId, fileName, filePath, fileType, fileSize, userId];
    const result = await pool.query(query, values);
    return result.rows[0];
  },

  // 2. Hàm lấy danh sách file theo Task
  getByTaskId: async (taskId) => {
    const query = `
        SELECT a.*, u.name as uploader_name, u.avatar 
        FROM attachments a
        LEFT JOIN users u ON a.uploaded_by = u.id
        WHERE a.task_id = $1 
        ORDER BY a.created_at DESC
    `;
    const result = await pool.query(query, [taskId]);
    return result.rows;
  },

  // 3. Hàm lấy chi tiết 1 file
  getById: async (id) => {
    const query = 'SELECT * FROM attachments WHERE id = $1';
    const result = await pool.query(query, [id]);
    return result.rows[0];
  },

  // 4. Hàm xóa file
  deleteById: async (id) => {
    const query = 'DELETE FROM attachments WHERE id = $1 RETURNING id';
    const result = await pool.query(query, [id]);
    return result.rowCount > 0; // Trả về true nếu xóa thành công
  }
};

module.exports = AttachmentModel;