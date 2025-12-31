const pool = require('../config/db');

// 1. Tạo user mới
const createUser = async (name, email, password) => {

  const query = `
    INSERT INTO users (name, email, password, avatar) 
    VALUES ($1, $2, $3, $4) 
    RETURNING id, name, email, avatar, created_at
  `;

  const defaultAvatar = null; 

  const values = [name, email, password, defaultAvatar];
  const result = await pool.query(query, values);
  return result.rows[0];
};

// 2. Tìm user bằng email
const findUserByEmail = async (email) => {
  const query = 'SELECT * FROM users WHERE email = $1';
  const result = await pool.query(query, [email]);
  return result.rows[0];
};

// 3. Tìm user bằng ID 
const findUserById = async (id) => {
  const query = 'SELECT id, name, email, avatar FROM users WHERE id = $1';
  const result = await pool.query(query, [id]);
  return result.rows[0];
};

// 4. Tìm kiếm User
const searchUsers = async (keyword) => {
  const query = `
    SELECT id, name, email, avatar 
    FROM users 
    WHERE email ILIKE $1 OR name ILIKE $1 
    LIMIT 5
  `;
  // ILIKE là tìm kiếm không phân biệt hoa thường
  // %keyword% giúp tìm kiếm tương đối
  const result = await pool.query(query, [`%${keyword}%`]);
  return result.rows;
};

module.exports = { createUser, findUserByEmail, findUserById, searchUsers };