// controllers/authController.js
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const userModel = require('../models/userModel');
require('dotenv').config();

// Lấy Secret Key từ biến môi trường (hoặc dùng key mặc định nếu quên config)
const JWT_SECRET = process.env.JWT_SECRET || 'secret_key_tam_thoi_123';

const generateToken = (userId) => {
  return jwt.sign({ id: userId }, JWT_SECRET, {
    expiresIn: '7d',
  });
};

// 1. ĐĂNG KÝ
const register = async (req, res) => {
  const { name, email, password } = req.body;

  try {
    // Check user tồn tại
    const existingUser = await userModel.findUserByEmail(email);
    if (existingUser) {
      return res.status(400).json({ message: 'Email này đã được sử dụng!' });
    }

    // Mã hóa pass
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Lưu DB
    const newUser = await userModel.createUser(name, email, hashedPassword);

    // Tạo token để user tự đăng nhập ngay lập tức
    const token = generateToken(newUser.id);

    res.status(201).json({ 
      message: 'Đăng ký thành công!', 
      token, 
      user: newUser // Model đã return (id, name, email, avatar) nên an toàn
    });
  } catch (error) {
    console.error("Register Error:", error);
    res.status(500).json({ message: 'Lỗi Server khi đăng ký' });
  }
};

// 2. ĐĂNG NHẬP
const login = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await userModel.findUserByEmail(email);
    if (!user) {
      return res.status(400).json({ message: 'Email hoặc mật khẩu không đúng!' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Email hoặc mật khẩu không đúng!' });
    }

    // Tạo Token
    const token = generateToken(user.id);

    // Trả về đầy đủ info để Frontend hiển thị
    res.json({
      message: 'Đăng nhập thành công!',
      token,
      user: { 
        id: user.id, 
        name: user.name, 
        email: user.email, 
        avatar: user.avatar // Quan trọng cho UI
      }
    });
  } catch (error) {
    console.error("Login Error:", error);
    res.status(500).json({ message: 'Lỗi Server khi đăng nhập' });
  }
};

module.exports = { register, login };