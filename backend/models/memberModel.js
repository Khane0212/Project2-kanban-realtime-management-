const pool = require('../config/db');

const memberModel = {
  // 1. Kiểm tra có phải Admin không (Trả về true/false)
  checkIsAdmin: async (projectId, userId) => {
    const result = await pool.query(
      'SELECT role FROM project_members WHERE project_id = $1 AND user_id = $2',
      [projectId, userId]
    );
    return result.rows.length > 0 && result.rows[0].role === 'admin';
  },

  // 2. Kiểm tra có phải thành viên không (Trả về true/false)
  checkMembership: async (projectId, userId) => {
    const result = await pool.query(
      'SELECT 1 FROM project_members WHERE project_id = $1 AND user_id = $2',
      [projectId, userId]
    );
    return result.rows.length > 0;
  },

  // 3. Lấy role cụ thể (Trả về string 'admin'/'member' hoặc undefined)
  getMemberRole: async (projectId, userId) => {
    const result = await pool.query(
      'SELECT role FROM project_members WHERE project_id = $1 AND user_id = $2',
      [projectId, userId]
    );
    return result.rows[0]?.role;
  },

  // 4. Lấy danh sách thành viên
  getMembers: async (projectId) => {
    const query = `
      SELECT pm.project_id, pm.user_id, pm.role, u.name, u.email, u.avatar 
      FROM project_members pm
      JOIN users u ON pm.user_id = u.id
      WHERE pm.project_id = $1
    `;
    const result = await pool.query(query, [projectId]);
    return result.rows; 
  },

  // 5. Thêm thành viên mới
  addMember: async (projectId, userId, role = 'member') => {
    const query = `
      INSERT INTO project_members (project_id, user_id, role)
      VALUES ($1, $2, $3)
      RETURNING *
    `;
    const result = await pool.query(query, [projectId, userId, role]);
    return result.rows[0];
  },

  // 6. Xóa thành viên
  removeMember: async (projectId, userId) => {
    const query = `
      DELETE FROM project_members 
      WHERE project_id = $1 AND user_id = $2
      RETURNING *
    `;
    const result = await pool.query(query, [projectId, userId]);
    return result.rowCount > 0;
  }
};

module.exports = memberModel;