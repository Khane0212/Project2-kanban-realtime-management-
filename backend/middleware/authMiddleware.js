const jwt = require('jsonwebtoken');
const userModel = require('../models/userModel');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || 'secret_key_tam_thoi_123';

const authMiddleware = async (req, res, next) => {
  // 1. Lấy token
  const authHeader = req.header('Authorization');
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Không tìm thấy Token xác thực!' });
  }

  try {
    // 2. Giải mã Token
    const decoded = jwt.verify(token, JWT_SECRET);

    // 3. CHECK DATABASE
    // Đảm bảo user này vẫn còn tồn tại trong hệ thống
    const user = await userModel.findUserById(decoded.id);
    
    if (!user) {
      return res.status(401).json({ message: 'Tài khoản này không còn tồn tại!' });
    }

    // 4. Gán thông tin user vào request
    req.user = user; 
    
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token đã hết hạn! Vui lòng đăng nhập lại.' });
    }
    console.error("Auth Middleware Error:", error.message);
    return res.status(403).json({ message: 'Token không hợp lệ.' });
  }
};

module.exports = authMiddleware;