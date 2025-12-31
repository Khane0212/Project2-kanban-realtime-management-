import { useState, useEffect } from 'react';
import { X, Search, UserPlus, Trash2, Shield, User } from 'lucide-react';
import api from '../api';
import { toast } from 'react-toastify';

const MemberModal = ({ projectId, members, onClose, onUpdate }) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Lấy user hiện tại để biết mình có phải Admin ko
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
  const myRole = members.find(m => m.email === currentUser.email)?.role;
  const iAmAdmin = myRole === 'admin';

  const handleInvite = async (e) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    try {
      await api.post(`/members/${projectId}/add`, { email });
      toast.success(`Đã mời ${email} vào dự án`);
      setEmail('');
      onUpdate(); // Refresh list
    } catch (err) {
      toast.error(err.response?.data?.message || 'Không tìm thấy email này!');
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (userId) => {
    if(!window.confirm("Chắc chắn muốn xóa thành viên này?")) return;
    try {
        await api.delete(`/members/${projectId}/${userId}`);
        toast.success("Đã xóa thành viên");
        onUpdate();
    } catch(err) {
        toast.error("Lỗi khi xóa thành viên");
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-fadeIn">
        <div className="p-4 border-b flex justify-between items-center bg-gray-50">
          <h3 className="font-bold text-lg text-gray-800">Thành viên dự án ({members.length})</h3>
          <button onClick={onClose}><X className="text-gray-400 hover:text-gray-600" /></button>
        </div>

        {/* Form mời (Chỉ Admin) */}
        {iAmAdmin && (
            <div className="p-4 border-b">
            <form onSubmit={handleInvite} className="flex gap-2">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-2.5 text-gray-400" size={18}/>
                    <input 
                        type="email" 
                        placeholder="Nhập email để mời..." 
                        className="w-full pl-10 pr-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        required
                    />
                </div>
                <button disabled={loading} className="bg-blue-600 text-white px-3 rounded-lg hover:bg-blue-700 disabled:opacity-50">
                    <UserPlus size={20}/>
                </button>
            </form>
            </div>
        )}

        <div className="max-h-80 overflow-y-auto p-2 space-y-1 custom-scrollbar">
          {members.map(mem => (
            <div key={mem.user_id} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg group">
              <div className="flex items-center gap-3">
                <img src={mem.avatar || `https://ui-avatars.com/api/?name=${mem.name}`} className="w-10 h-10 rounded-full bg-gray-200" alt=""/>
                <div>
                    <p className="font-bold text-gray-800 text-sm flex items-center gap-1">
                        {mem.name} 
                        {mem.user_id === currentUser.id && <span className="text-xs text-blue-500">(Bạn)</span>}
                    </p>
                    <p className="text-xs text-gray-500">{mem.email}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${mem.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-green-100 text-green-700'}`}>
                    {mem.role === 'admin' ? 'Trưởng nhóm' : 'Thành viên'}
                </span>
                
                {/* Nút xóa (Chỉ Admin xóa được người khác) */}
                {iAmAdmin && mem.user_id !== currentUser.id && (
                    <button onClick={() => handleRemove(mem.user_id)} className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded transition">
                        <Trash2 size={16} />
                    </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default MemberModal;