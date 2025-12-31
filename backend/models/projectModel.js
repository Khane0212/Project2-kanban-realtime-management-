const pool = require('../config/db');

// 1. TẠO DỰ ÁN MỚI
const createProject = async (name, description, userId) => {
  const client = await pool.connect(); // Dùng transaction
  try {
    await client.query('BEGIN'); // Bắt đầu giao dịch

    // 1.1. Tạo Project
    const projectQuery = `
      INSERT INTO projects (name, description, created_by)
      VALUES ($1, $2, $3)
      RETURNING *
    `;
    const projectResult = await client.query(projectQuery, [name, description, userId]);
    const newProject = projectResult.rows[0];

    // 1.2. Tự động thêm người tạo thành Leader (Admin)
    const memberQuery = `
      INSERT INTO project_members (project_id, user_id, role)
      VALUES ($1, $2, 'admin')
    `;
    await client.query(memberQuery, [newProject.id, userId]);

    await client.query('COMMIT'); // Lưu tất cả
    return newProject;
  } catch (error) {
    await client.query('ROLLBACK'); // Nếu lỗi thì hủy hết
    throw error;
  } finally {
    client.release();
  }
};

// 2. LẤY DANH SÁCH DỰ ÁN
const getProjectsByUserId = async (userId) => {
  const query = `
    SELECT p.*, pm.role 
    FROM projects p
    JOIN project_members pm ON p.id = pm.project_id
    WHERE pm.user_id = $1
    ORDER BY p.created_at DESC
  `;
  const result = await pool.query(query, [userId]);
  return result.rows;
};

// 3. LẤY CHI TIẾT 1 DỰ ÁN
const getProjectById = async (projectId) => {
  const query = 'SELECT * FROM projects WHERE id = $1';
  const result = await pool.query(query, [projectId]);
  return result.rows[0];
};

// 4. CẬP NHẬT DỰ ÁN 
const updateProject = async (id, name, description) => {
  const query = `
    UPDATE projects 
    SET 
      name = COALESCE($1, name), -- Nếu $1 null/undefined thì giữ nguyên name cũ
      description = COALESCE($2, description), 
      updated_at = CURRENT_TIMESTAMP 
    WHERE id = $3 
    RETURNING *
  `;
  const result = await pool.query(query, [name, description, id]);
  return result.rows[0];
};

// 5. XÓA DỰ ÁN
const deleteProject = async (id) => {
  await pool.query('DELETE FROM projects WHERE id = $1', [id]);
};

module.exports = { 
  createProject, 
  getProjectsByUserId, 
  getProjectById, 
  updateProject,  
  deleteProject   
};