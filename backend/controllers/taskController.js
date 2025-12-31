const taskModel = require('../models/taskModel');
const memberModel = require('../models/memberModel'); 

// 1. TẠO TASK
const createTask = async (req, res) => {
  const { title, description, project_id, assigned_to, due_date, priority } = req.body;
  const created_by = req.user.id;

  try {
    // Check xem người tạo có trong dự án không
    const isMember = await memberModel.checkMembership(project_id, created_by);
    if (!isMember) return res.status(403).json({ message: 'Bạn không phải thành viên dự án này!' });

    const newTask = await taskModel.createTask({ 
      title, description, project_id, assigned_to, created_by, due_date, priority 
    });
    
    // SOCKET: Gửi vào Room project
    if (req.io) req.io.to(`project_${project_id}`).emit('task_created', newTask);
    
    res.status(201).json(newTask);
  } catch (error) {
    console.error("Create task error:", error);
    res.status(500).json({ message: 'Lỗi server' });
  }
};

// 2. LẤY TASK
const getProjectTasks = async (req, res) => {
  const { projectId } = req.params;
  try {
    const tasks = await taskModel.getTasksByProject(projectId);
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi tải công việc' });
  }
};

// 3. CẬP NHẬT TASK
const updateTask = async (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  const currentUserId = req.user.id;

  try {
    // 1. Lấy thông tin task cũ từ Model
    const currentTask = await taskModel.getTaskById(id);
    if (!currentTask) return res.status(404).json({ message: 'Task không tồn tại' });

    const { project_id: projectId, due_date: oldDueDate, assigned_to: currentAssignee } = currentTask;

    // 2. Lấy role của user trong dự án
    const userRole = await memberModel.getMemberRole(projectId, currentUserId);
    
    if (!userRole) return res.status(403).json({ message: 'Bạn không thuộc dự án này!' });

    // Tạo object chứa các trường được phép update để tránh injection
    let safeUpdates = {};

    // NẾU LÀ ADMIN: Được sửa tất cả
    if (userRole === 'admin') {
        safeUpdates = { ...updates }; // Copy hết
    } 
    // NẾU LÀ MEMBER: Bị kiểm soát
    else {
        // Cấm Member duyệt 'done'
        if (updates.status === 'done') {
            return res.status(403).json({ message: 'Chỉ trưởng nhóm mới được duyệt hoàn thành!' });
        }

        // Cấm Member dời Deadline
        if (updates.due_date) {
            const newDate = new Date(updates.due_date).toISOString().split('T')[0];
            const oldDate = oldDueDate ? new Date(oldDueDate).toISOString().split('T')[0] : null;
            if (newDate !== oldDate) {
                return res.status(403).json({ message: 'Chỉ trưởng nhóm mới được đổi Deadline!' });
            }
        }

        // Nếu task đã có người nhận VÀ người đó không phải mình
        if (currentAssignee && currentAssignee !== currentUserId) {
             // Cấm sửa nội dung quan trọng
             if (updates.title || updates.description || updates.priority) {
                 return res.status(403).json({ message: 'Đừng sửa nội dung công việc của người khác!' });
             }
             // Cấm đổi trạng thái
             if (updates.status) { 
                 return res.status(403).json({ message: 'Hãy để họ tự cập nhật tiến độ!' });
             }
             // Cấm assign lại
             if (updates.assigned_to && updates.assigned_to !== currentUserId) {
                 return res.status(403).json({ message: 'Bạn không được đẩy việc của người khác!' });
             }
        }

        // Lọc các trường an toàn cho Member
        // Chỉ lấy những gì cần thiết, loại bỏ project_id, created_by...
        if (updates.title) safeUpdates.title = updates.title;
        if (updates.description) safeUpdates.description = updates.description;
        if (updates.status) safeUpdates.status = updates.status;
        if (updates.priority) safeUpdates.priority = updates.priority;
        if (updates.assigned_to) safeUpdates.assigned_to = updates.assigned_to;
    }

    // Chỉ update nếu có trường thay đổi
    if (Object.keys(safeUpdates).length === 0) {
        return res.json(currentTask); // Không có gì thay đổi
    }

    const updatedTask = await taskModel.updateTask(id, safeUpdates);
    
    if (req.io) req.io.to(`project_${projectId}`).emit('task_updated', updatedTask);
    
    res.json(updatedTask);

  } catch (error) {
    console.error("Update task error:", error);
    res.status(500).json({ message: 'Lỗi server' });
  }
};

// 4. XÓA TASK
const deleteTask = async (req, res) => {
  const { id } = req.params;
  const currentUserId = req.user.id;

  try {
    const currentTask = await taskModel.getTaskById(id);
    if (!currentTask) return res.status(404).json({ message: 'Task không tồn tại' });
    
    const projectId = currentTask.project_id;

    const isAdmin = await memberModel.checkIsAdmin(projectId, currentUserId);
    if (!isAdmin) {
      return res.status(403).json({ message: 'Chỉ trưởng nhóm mới được xóa công việc!' });
    }

    await taskModel.deleteTask(id);
    
    if (req.io) req.io.to(`project_${projectId}`).emit('task_deleted', id);
    
    res.json({ message: 'Đã xóa thành công' });
  } catch (error) {
    console.error("Delete task error:", error);
    res.status(500).json({ message: 'Lỗi server' });
  }
};

module.exports = { createTask, getProjectTasks, updateTask, deleteTask };