// config/db.js
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
});

// Kiểm tra kết nối
pool.connect((err) => {
  if (err) {
    console.error('Lỗi kết nối Database:', err.message);
  } else {
    console.log('Đã kết nối thành công tới PostgreSQL!');
  }
});

module.exports = pool;