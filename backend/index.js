const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const http = require('http'); 
const { Server } = require('socket.io'); 

// Import Routes
const authRoutes = require('./routes/authRoutes');
const projectRoutes = require('./routes/projectRoutes');
const taskRoutes = require('./routes/taskRoutes');
const memberRoutes = require('./routes/memberRoutes');
const uploadRoutes = require('./routes/uploadRoutes');

dotenv.config();

const app = express();
const server = http.createServer(app); 

// Cấu hình Socket.io
const io = new Server(server, {
  cors: {
    // Cho phép Frontend ở cổng 5173 (Vite) hoặc 3000 (React thường) truy cập
    origin: ["http://localhost:5173", "http://localhost:3000"], 
    methods: ["GET", "POST", "PUT", "DELETE"]
  }
});

app.use(cors());
app.use(express.json());

// Middleware gắn "io" vào mọi request để Controller sử dụng
app.use((req, res, next) => {
  req.io = io;
  next();
});

// ROUTES
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/members', memberRoutes);
app.use('/api/uploads', uploadRoutes);
app.use('/uploads', express.static('uploads'));

// SOCKET.IO
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  // 1. Room Dự án
  socket.on('join_project', (projectId) => {
    const roomName = `project_${projectId}`; 
    socket.join(roomName); 
    console.log(`Socket ${socket.id} đã vào phòng: ${roomName}`);
  });

  socket.on('leave_project', (projectId) => {
    const roomName = `project_${projectId}`;
    socket.leave(roomName);
    console.log(`Socket ${socket.id} đã rời phòng: ${roomName}`);
  });

  // 2. Room Cá nhân
  socket.on('setup_user', (userId) => {
    if (userId) {
        const roomName = userId.toString();
        socket.join(roomName);
        console.log(`User ${userId} đã online tại phòng riêng: ${roomName}`);
    }
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server đang chạy tại http://localhost:${PORT}`);
  console.log(`Uploads folder: http://localhost:${PORT}/uploads`);
});