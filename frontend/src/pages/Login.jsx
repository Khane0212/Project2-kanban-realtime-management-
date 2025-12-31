import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { User, Lock, Mail, ArrowRight, Loader2 } from 'lucide-react';
import api from '../api';

const Login = () => {
  const [isRegister, setIsRegister] = useState(false);
  const [isLoading, setIsLoading] = useState(false); 
  const [formData, setFormData] = useState({ name: '', email: '', password: '' });
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true); // Bắt đầu load
    const endpoint = isRegister ? '/auth/register' : '/auth/login';

    try {
      const res = await api.post(endpoint, formData);
      if (res.data.token) {
        localStorage.setItem('token', res.data.token);
        localStorage.setItem('user', JSON.stringify(res.data.user));
        
        toast.success(isRegister ? 'Đăng ký thành công!' : 'Chào mừng trở lại!');
        navigate('/dashboard'); // Chuyển hướng ngay lập tức
      } else {
        toast.success('Đăng ký thành công! Hãy đăng nhập ngay.');
        setIsRegister(false);
      }

    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Có lỗi xảy ra, vui lòng thử lại!');
    } finally {
      setIsLoading(false); // Kết thúc load
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-purple-700 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 animate-fade-in-up">
        <h2 className="text-3xl font-extrabold text-gray-800 mb-2 text-center">
          {isRegister ? 'Tạo tài khoản mới' : 'Đăng nhập'}
        </h2>
        <p className="text-gray-500 text-center mb-8">
          {isRegister ? 'Tham gia ngay để quản lý dự án hiệu quả' : 'Chào mừng bạn quay trở lại!'}
        </p>

        <form onSubmit={handleSubmit} className="space-y-5">
          {isRegister && (
            <div className="relative group">
              <User className="absolute left-3 top-3.5 text-gray-400 group-focus-within:text-blue-500 transition-colors" size={20} />
              <input
                type="text"
                placeholder="Họ và tên"
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
          )}

          <div className="relative group">
            <Mail className="absolute left-3 top-3.5 text-gray-400 group-focus-within:text-blue-500 transition-colors" size={20} />
            <input
              type="email"
              placeholder="Email của bạn"
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
            />
          </div>

          <div className="relative group">
            <Lock className="absolute left-3 top-3.5 text-gray-400 group-focus-within:text-blue-500 transition-colors" size={20} />
            <input
              type="password"
              placeholder="Mật khẩu"
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              required
            />
          </div>

          <button 
            disabled={isLoading}
            className="w-full bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold py-3 rounded-xl transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed shadow-lg shadow-blue-500/30"
          >
            {isLoading ? (
               <Loader2 className="animate-spin" size={20} />
            ) : (
               <>
                 {isRegister ? 'Đăng Ký' : 'Đăng Nhập'}
                 <ArrowRight size={20} />
               </>
            )}
          </button>
        </form>

        <div className="mt-8 text-center border-t pt-6">
          <p className="text-gray-600 text-sm">
            {isRegister ? 'Đã có tài khoản?' : 'Chưa có tài khoản?'}
            <button
              onClick={() => {
                  setIsRegister(!isRegister);
                  setFormData({ name: '', email: '', password: '' }); // Reset form khi chuyển tab
              }}
              className="ml-2 text-blue-600 hover:text-blue-800 font-bold hover:underline transition-colors"
            >
              {isRegister ? 'Đăng nhập ngay' : 'Đăng ký ngay'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;