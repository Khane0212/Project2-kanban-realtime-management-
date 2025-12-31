const fs = require('fs');
const path = require('path');
const AttachmentModel = require('../models/attachmentModel');
const taskModel = require('../models/taskModel');
const memberModel = require('../models/memberModel');

// 1. UPLOAD FILE
exports.uploadFile = async (req, res) => {
  try {
    const { taskId } = req.params;
    const userId = req.user.id; 
    
    // Check 1: Có file không?
    if (!req.file) {
      return res.status(400).json({ message: 'Chưa chọn file nào' });
    }

    // Check 2: Task có tồn tại không & lấy Project ID
    const task = await taskModel.getTaskById(taskId);
    if (!task) {
        // Nếu task không tồn tại, phải xóa ngay file vừa upload lên
        if (req.file) fs.unlinkSync(req.file.path);
        return res.status(404).json({ message: 'Task không tồn tại' });
    }

    const projectId = task.project_id;

    // Check 3: User có phải thành viên dự án không?
    const isMember = await memberModel.checkMembership(projectId, userId);
    if (!isMember) {
        if (req.file) fs.unlinkSync(req.file.path); // Xóa file rác ngay
        return res.status(403).json({ message: 'Bạn không có quyền upload vào dự án này!' });
    }

    // Tiến hành lưu DB
    const { originalname, mimetype, size, filename } = req.file;
    // Lưu đường dẫn tương đối để dễ xử lý static file
    const filePath = `/uploads/${filename}`; 

    const newAttachment = await AttachmentModel.create({
      taskId,
      fileName: originalname,
      filePath,
      fileType: mimetype,
      fileSize: size,
      userId
    });

    // SOCKET: Báo cho mọi người trong Project
    if (req.io) {
        req.io.to(`project_${projectId}`).emit('attachment_added', newAttachment);
    }

    res.status(201).json(newAttachment);
  } catch (err) {
    console.error("Upload error:", err);
    // Xóa file nếu lỗi server xảy ra
    if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ message: 'Lỗi upload file' });
  }
};

// 2. LẤY DANH SÁCH FILE
exports.getFilesByTask = async (req, res) => {
  try {
    const { taskId } = req.params;
    const files = await AttachmentModel.getByTaskId(taskId);
    res.json(files);
  } catch (err) {
    console.error("Get files error:", err);
    res.status(500).json({ message: 'Lỗi tải danh sách file' });
  }
};

// 3. XÓA FILE
exports.deleteFile = async (req, res) => {
  try {
    const { id } = req.params;
    const currentUserId = req.user.id;

    const attachment = await AttachmentModel.getById(id);
    if (!attachment) return res.status(404).json({ message: 'File không tồn tại' });

    const task = await taskModel.getTaskById(attachment.task_id);
    const projectId = task.project_id;
    const role = await memberModel.getMemberRole(projectId, currentUserId);

    // 🔥 SỬA TẠI ĐÂY: Dùng uploaded_by thay vì user_id
    // Đồng thời ép kiểu String để so sánh chính xác giữa String và Number
    const isOwner = String(attachment.uploaded_by) === String(currentUserId);
    const isAdmin = role === 'admin';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: 'Bạn không có quyền xóa file này!' });
    }

    // Xử lý xóa file vật lý (Dùng đúng cột file_path)
    const dbFilePath = attachment.file_path; 
    if (dbFilePath) {
        const absolutePath = path.resolve(__dirname, '..', dbFilePath.startsWith('/') ? dbFilePath.substring(1) : dbFilePath);
        if (fs.existsSync(absolutePath)) fs.unlinkSync(absolutePath);
    }

    // Xóa trong DB
    await AttachmentModel.deleteById(id);

    // 🔥 CẬP NHẬT SOCKET: Gửi kèm taskId để Frontend biết task nào cần cập nhật
    if (req.io) {
      req.io.to(`project_${projectId}`).emit('attachment_deleted', { 
          taskId: attachment.task_id, 
          fileId: id 
      });
    }
    
    res.json({ message: 'Đã xóa file thành công' });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi server: ' + err.message });
  }
};