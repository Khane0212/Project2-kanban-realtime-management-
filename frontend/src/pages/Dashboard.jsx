import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Folder, LogOut, Loader, Clock, Search } from 'lucide-react';
import api from '../api';
import { toast } from 'react-toastify';
import { io } from 'socket.io-client';

const Dashboard = () => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [newProject, setNewProject] = useState({ name: '', description: '' });
  
  // Lấy thông tin user để hiển thị và join socket room
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const navigate = useNavigate();

  useEffect(() => {
    fetchProjects();

    // 1. Kết nối Socket
    // Nếu deploy thì thay localhost bằng biến môi trường
    const socket = io('http://localhost:5000');

    // 2. Join vào phòng cá nhân
    if (user.id) {
        socket.emit('setup_user', user.id);
    }

    socket.on('project_created', (newProject) => {
        setProjects((prev) => [newProject, ...prev]);
        toast.info(`Dự án mới: ${newProject.name}`);
    });
    
    socket.on('project_deleted', (projectId) => {
        setProjects((prev) => prev.filter(p => p.id !== parseInt(projectId)));
        toast.warn('Một dự án vừa bị xóa.');
    });

    socket.on('project_updated', (updatedProject) => {
        setProjects((prev) => prev.map(p => p.id === updatedProject.id ? updatedProject : p));
    });

    socket.on('member_updated', () => {
        fetchProjects();
        toast.info('Bạn vừa được mời vào một dự án mới!');
    });

    return () => socket.disconnect();
  }, []);

  const fetchProjects = async () => {
    try {
      const res = await api.get('/projects');
      setProjects(res.data);
    } catch (err) {
      toast.error('Không thể tải danh sách dự án');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      // Gọi API tạo 
      const res = await api.post('/projects', newProject);

      setShowModal(false);
      setNewProject({ name: '', description: '' });
      toast.success('Tạo dự án thành công!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi khi tạo dự án');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/');
    toast.info('Đã đăng xuất');
  };

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-900">
      {/* HEADER */}
      <header className="bg-white shadow-sm sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-lg shadow-blue-200 shadow-md">
              <Folder className="text-white" size={24} />
            </div>
            <h1 className="text-xl font-bold text-gray-800 tracking-tight hidden sm:block">WorkManager</h1>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="text-right hidden sm:block">
              <p className="text-xs text-gray-500 uppercase font-semibold tracking-wider">Xin chào</p>
              <div className="flex items-center gap-2">
                 <img src={user.avatar || `https://ui-avatars.com/api/?name=${user.name}&background=random`} className="w-6 h-6 rounded-full" alt="avatar"/>
                 <p className="font-bold text-gray-800">{user.name}</p>
              </div>
            </div>
            <button 
              onClick={handleLogout} 
              className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition duration-200"
              title="Đăng xuất"
            >
              <LogOut size={22} />
            </button>
          </div>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
          <div>
            <h2 className="text-3xl font-bold text-gray-800">Dự án của tôi</h2>
            <p className="text-gray-500 mt-1">Quản lý tất cả công việc của bạn tại một nơi.</p>
          </div>
          <button 
            onClick={() => setShowModal(true)}
            className="bg-blue-600 text-white px-6 py-3 rounded-xl flex items-center gap-2 hover:bg-blue-700 shadow-lg shadow-blue-500/30 transition transform hover:-translate-y-0.5 active:scale-95 font-medium"
          >
            <Plus size={20} /> Tạo dự án mới
          </button>
        </div>

        {/* LOADING STATE */}
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <Loader className="animate-spin text-blue-600" size={48} />
          </div>
        ) : (
          /* DANH SÁCH DỰ ÁN */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in-up">
            {projects.length === 0 ? (
              <div className="col-span-full flex flex-col items-center justify-center py-16 bg-white rounded-3xl border-2 border-dashed border-gray-200">
                <div className="bg-gray-50 p-4 rounded-full mb-4">
                    <Folder className="text-gray-300" size={64} />
                </div>
                <h3 className="text-xl font-bold text-gray-700 mb-2">Chưa có dự án nào</h3>
                <p className="text-gray-500 mb-6">Hãy bắt đầu bằng cách tạo dự án đầu tiên của bạn.</p>
                <button onClick={() => setShowModal(true)} className="text-blue-600 font-bold hover:underline">
                  + Tạo dự án ngay
                </button>
              </div>
            ) : (
              projects.map((project) => (
                <div 
                  key={project.id} 
                  onClick={() => navigate(`/project/${project.id}`, { state: { project } })}
                  className="group bg-white p-6 rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer border border-gray-100 hover:border-blue-300 relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity translate-x-2 group-hover:translate-x-0">
                    <Clock size={18} className="text-blue-500" />
                  </div>
                  
                  <div className="mb-4">
                      <h3 className="text-xl font-bold text-gray-800 mb-2 group-hover:text-blue-600 transition-colors line-clamp-1">
                        {project.name}
                      </h3>
                      <p className="text-gray-500 text-sm line-clamp-2 h-10 leading-relaxed">
                        {project.description || 'Chưa có mô tả cho dự án này.'}
                      </p>
                  </div>
                  
                  <div className="flex justify-between items-center pt-4 border-t border-gray-100 mt-4">
                    <span className={`text-xs px-3 py-1 rounded-full ${
                      project.role === 'admin' 
                        ? 'bg-purple-100 text-purple-700 border border-purple-200' 
                        : 'bg-green-100 text-green-700 border border-green-200'
                    } font-bold uppercase tracking-wider`}>
                      {project.role}
                    </span>
                    <span className="text-xs text-gray-400 font-medium">
                      {new Date(project.created_at).toLocaleDateString('vi-VN')}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </main>

      {/* MODAL TẠO DỰ ÁN */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div 
            className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden transform transition-all scale-100"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-8">
              <div className="flex justify-between items-center mb-6">
                  <h3 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
                    <div className="bg-blue-100 p-2 rounded-lg">
                        <Plus className="text-blue-600" size={24}/>
                    </div>
                    Tạo dự án mới
                  </h3>
                  <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                      ✕
                  </button>
              </div>
              
              <form onSubmit={handleCreate} className="space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Tên dự án <span className="text-red-500">*</span></label>
                  <input 
                    type="text" 
                    placeholder="VD: Website E-commerce, Marketing Campaign..."
                    className="w-full border border-gray-300 rounded-xl p-3.5 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                    value={newProject.name}
                    onChange={e => setNewProject({...newProject, name: e.target.value})}
                    required
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Mô tả ngắn</label>
                  <textarea 
                    placeholder="Dự án này dùng để làm gì?"
                    className="w-full border border-gray-300 rounded-xl p-3.5 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition resize-none"
                    rows="3"
                    value={newProject.description}
                    onChange={e => setNewProject({...newProject, description: e.target.value})}
                  ></textarea>
                </div>
                
                <div className="flex justify-end gap-3 pt-4">
                  <button 
                    type="button" 
                    onClick={() => setShowModal(false)}
                    className="px-6 py-3 text-gray-600 hover:bg-gray-100 rounded-xl font-bold transition"
                  >
                    Hủy bỏ
                  </button>
                  <button 
                    type="submit" 
                    className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-bold shadow-lg shadow-blue-500/30 transition flex items-center gap-2"
                  >
                    Tạo Dự Án <ArrowRightIcon />
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const ArrowRightIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M5 12H19M19 12L12 5M19 12L12 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
)

export default Dashboard;