const pool = require('../config/db');

// 1. Tạo Task mới
const createTask = async (taskData) => {
  const { title, description, project_id, assigned_to, created_by, due_date, priority } = taskData;
  const query = `
    INSERT INTO tasks (title, description, project_id, assigned_to, created_by, due_date, priority)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING *
  `;
  // Mặc định Priority là 'Medium' 
  const values = [title, description, project_id, assigned_to, created_by, due_date, priority || 'Medium'];
  const result = await pool.query(query, values);
  return result.rows[0];
};

// 2. Lấy tất cả Task trong 1 dự án
const getTasksByProject = async (projectId) => {
  const query = `
    SELECT t.*, u.name as assigned_name, u.avatar 
    FROM tasks t
    LEFT JOIN users u ON t.assigned_to = u.id
    WHERE t.project_id = $1
    ORDER BY t.created_at DESC
  `;
  const result = await pool.query(query, [projectId]);
  return result.rows;
};

// 3. Lấy chi tiết 1 task
const getTaskById = async (id) => {
  const result = await pool.query('SELECT * FROM tasks WHERE id = $1', [id]);
  return result.rows[0];
};

// 4. Cập nhật Task
const updateTask = async (id, updates) => {
  const keys = Object.keys(updates);
  const values = Object.values(updates);

  if (keys.length === 0) return null;

  // Tạo chuỗi: "title = $1, status = $2, ..."
  const setString = keys.map((key, index) => `${key} = $${index + 1}`).join(', ');

  // Để DB tự động cập nhật thời gian sửa đổi
  const query = `
    UPDATE tasks 
    SET ${setString}, updated_at = CURRENT_TIMESTAMP 
    WHERE id = $${keys.length + 1} 
    RETURNING *
  `;

  const result = await pool.query(query, [...values, id]);
  return result.rows[0];
};

// 5. Xóa Task
const deleteTask = async (id) => {
  await pool.query('DELETE FROM tasks WHERE id = $1', [id]);
};

module.exports = { 
  createTask, 
  getTasksByProject, 
  updateTask, 
  getTaskById, 
  deleteTask 
};