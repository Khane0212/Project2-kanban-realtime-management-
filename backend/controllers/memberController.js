const memberModel = require('../models/memberModel');
const userModel = require('../models/userModel');
const projectModel = require('../models/projectModel');

// 1. LẤY DANH SÁCH THÀNH VIÊN
const getProjectMembers = async (req, res) => {
  const { projectId } = req.params;
  try {
    const members = await memberModel.getMembers(projectId);
    res.json(members);
  } catch (error) {
    console.error("Get members error:", error); 
    res.status(500).json({ message: 'Lỗi lấy danh sách thành viên' });
  }
};

// 2. MỜI THÀNH VIÊN
const addMemberByEmail = async (req, res) => {
  const { projectId } = req.params;
  const { email } = req.body;
  const currentUserId = req.user.id;

  try {
    // Check quyền Admin 
    const isAdmin = await memberModel.checkIsAdmin(projectId, currentUserId);
    if (!isAdmin) return res.status(403).json({ message: 'Bạn không có quyền mời thành viên!' });

    // Tìm user theo email
    const user = await userModel.findUserByEmail(email);
    if (!user) return res.status(404).json({ message: 'Email chưa đăng ký!' });

    const newUserId = user.id;

    // Check đã là thành viên chưa
    const isMember = await memberModel.checkMembership(projectId, newUserId);
    if (isMember) return res.status(400).json({ message: 'User đã là thành viên!' });

    // Thêm thành viên
    await memberModel.addMember(projectId, newUserId, 'member');

    // XỬ LÝ SOCKET
    if (req.io) {
      // 1. Gửi riêng cho người mới
      const project = await projectModel.getProjectById(projectId);
      req.io.to(newUserId.toString()).emit('project_created', project);

      // 2. Gửi cho các thành viên cũ đang online trong project đó
      req.io.to(`project_${projectId}`).emit('member_updated', projectId);
    }

    res.status(201).json({ message: 'Đã thêm thành viên' });
  } catch (error) {
    console.error("Add member error:", error);
    res.status(500).json({ message: 'Lỗi server' });
  }
};

// 3. XÓA THÀNH VIÊN
const removeMember = async (req, res) => {
  const { projectId, userId } = req.params;
  const currentUserId = req.user.id;

  try {
    // Validation cơ bản
    if (parseInt(userId) === currentUserId) {
      return res.status(400).json({ message: 'Không thể tự xóa chính mình!' });
    }

    const isAdmin = await memberModel.checkIsAdmin(projectId, currentUserId);
    if (!isAdmin) return res.status(403).json({ message: 'Chỉ Admin mới được xóa!' });

    await memberModel.removeMember(projectId, userId);

    // XỬ LÝ SOCKET
    if (req.io) {
        // 1. Báo cho người bị xóa
        req.io.to(userId.toString()).emit('project_deleted', projectId);

        // 2. Refresh danh sách cho những người còn lại
        req.io.to(`project_${projectId}`).emit('member_updated', projectId);
    }

    res.json({ message: 'Đã xóa thành viên' });
  } catch (error) {
    console.error("Remove member error:", error);
    res.status(500).json({ message: 'Lỗi khi xóa thành viên' });
  }
};

module.exports = {
  getProjectMembers,
  addMemberByEmail,
  removeMember
};