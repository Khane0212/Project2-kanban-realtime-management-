const projectModel = require('../models/projectModel');
const memberModel = require('../models/memberModel');

// 1. TẠO DỰ ÁN
const createProject = async (req, res) => {
  const { name, description } = req.body;
  const userId = req.user.id;
  try {
    const newProject = await projectModel.createProject(name, description, userId);
    if (req.io) {
      req.io.to(userId.toString()).emit('project_created', newProject);
    }
    res.status(201).json(newProject);
  } catch (error) {
    console.error("Create project error:", error);
    res.status(500).json({ message: 'Lỗi khi tạo dự án' });
  }
};

// 2. LẤY DANH SÁCH DỰ ÁN
const getMyProjects = async (req, res) => {
  const userId = req.user.id;
  try {
    const projects = await projectModel.getProjectsByUserId(userId);
    res.json(projects);
  } catch (error) {
    console.error("Get my projects error:", error);
    res.status(500).json({ message: 'Lỗi khi lấy danh sách dự án' });
  }
};

// 3. LẤY CHI TIẾT 1 DỰ ÁN
const getProjectById = async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  try {
    const project = await projectModel.getProjectById(id);

    if (!project) return res.status(404).json({ message: 'Dự án không tồn tại' });
    const isMember = await memberModel.checkMembership(id, userId);
    if (!isMember) {
      return res.status(403).json({ message: 'Bạn không có quyền truy cập dự án này' });
    }
    res.json(project);
  } catch (error) {
    console.error("Get project detail error:", error);
    res.status(500).json({ message: 'Lỗi server' });

  }

};

// 4. CẬP NHẬT DỰ ÁN
const updateProject = async (req, res) => { 
  const { id } = req.params;
  const { name, description } = req.body;

  try {
    const updatedProject = await projectModel.updateProject(id, name, description);

    if (req.io) {
      const roomName = `project_${id}`;
      req.io.to(roomName).emit('project_updated', updatedProject);
      console.log(`Đã phát tin tới ${roomName}`);
    }

    res.json(updatedProject);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi cập nhật' });
  }
};

// 5. XÓA DỰ ÁN
const deleteProject = async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  try {
    const isAdmin = await memberModel.checkIsAdmin(id, userId);
    if (!isAdmin) {
      return res.status(403).json({ message: 'Chỉ Admin mới được xóa dự án' });
    }

    const members = await memberModel.getMembers(id);   

    await projectModel.deleteProject(id);

    // SOCKET
    if (req.io) {
      req.io.to(`project_${id}`).emit('project_deleted', id);
      members.forEach(member => {
         req.io.to(member.user_id.toString()).emit('project_deleted', id);
      });

    }

    res.json({ message: 'Đã xóa dự án' });

  } catch (error) {

    console.error("Delete project error:", error);

    res.status(500).json({ message: 'Lỗi xóa dự án' });

  }

};

module.exports = {
  createProject,
  getMyProjects,
  getProjectById,
  updateProject,
  deleteProject
};