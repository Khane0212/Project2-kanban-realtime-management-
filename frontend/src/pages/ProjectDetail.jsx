import { useState, useEffect, useRef } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { DndContext, closestCorners, useSensor, useSensors, PointerSensor, useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Plus, ArrowLeft, Edit, Users, Settings, Trash2, Save, X, Paperclip, FileText, Download, Loader, MessageSquare } from 'lucide-react';
import api from '../api';
import { toast } from 'react-toastify';
import TaskCard from '../components/TaskCard';
import MemberModal from '../components/MemberModal';
import { io } from 'socket.io-client';

const COLUMNS = {
    todo: 'Cần làm',
    'in-progress': 'Đang làm',
    review: 'Chờ duyệt',
    done: 'Hoàn thành'
};

const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

const KanbanColumn = ({ id, title, tasks, onEdit, onDelete }) => {
    const { setNodeRef } = useDroppable({ id: id });
    return (
        <div ref={setNodeRef} className="w-80 flex flex-col bg-gray-100/80 rounded-xl max-h-full shrink-0 border border-gray-200 shadow-sm">
            <div className="p-4 font-bold text-gray-700 border-b border-gray-200 flex justify-between items-center sticky top-0 bg-gray-100/95 backdrop-blur-sm rounded-t-xl z-10">
                <span className="flex items-center gap-2">
                    <span className={`w-3 h-3 rounded-full ${id === 'done' ? 'bg-green-500' : id === 'review' ? 'bg-yellow-500' : id === 'in-progress' ? 'bg-blue-500' : 'bg-gray-400'}`}></span>
                    {title}
                </span>
                <span className="bg-white text-xs px-2.5 py-1 rounded-full font-bold text-gray-500 shadow-sm">{tasks.length}</span>
            </div>
            <SortableContext id={id} items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
                <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-[150px] custom-scrollbar">
                    {tasks.map(task => (
                        <TaskCard key={task.id} task={task} onEdit={onEdit} onDelete={onDelete} />
                    ))}
                </div>
            </SortableContext>
        </div>
    );
};

const ProjectDetail = () => {
    const { id } = useParams();
    const { state } = useLocation();
    const navigate = useNavigate();

    const [tasks, setTasks] = useState([]);
    const [members, setMembers] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [showMemberModal, setShowMemberModal] = useState(false);
    const [loadingProject, setLoadingProject] = useState(true);
    const [projectInfo, setProjectInfo] = useState(state?.project || { name: 'Đang tải...', description: '' });

    const [editingTask, setEditingTask] = useState(null);
    const editingTaskIdRef = useRef(null);

    const [formData, setFormData] = useState({ title: '', description: '', priority: 'Medium', due_date: '', assigned_to: '' });
    const [attachments, setAttachments] = useState([]);
    const [uploading, setUploading] = useState(false);
    const [comments, setComments] = useState([]);
    const [commentInput, setCommentInput] = useState('');
    const commentsEndRef = useRef(null);

    const [showSettings, setShowSettings] = useState(false);
    const [showEditProjectModal, setShowEditProjectModal] = useState(false);
    const [projectForm, setProjectForm] = useState({ name: '', description: '' });

    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
    const myMemberInfo = members.find(m => m.email === currentUser.email);
    const amIAdmin = myMemberInfo?.role === 'admin';
    const canEditContent = amIAdmin || !editingTask?.assigned_to || editingTask?.assigned_to === currentUser.id;

    const scrollToBottom = () => commentsEndRef.current?.scrollIntoView({ behavior: "smooth" });

    useEffect(() => {
        scrollToBottom();
    }, [comments]);

    useEffect(() => {
    fetchProjectInfo();
    fetchTasks();
    fetchMembers();

    const socket = io('http://localhost:5000', { transports: ['websocket'] });

    socket.on('connect', () => {
        // 1. Join vào phòng chung của dự án
        if (id) socket.emit('join_project', id);

        // 2. Join vào phòng riêng của chính mình 
        const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
        if (currentUser.id) {
            socket.emit('setup_user', currentUser.id);
            console.log("Đã setup phòng riêng cho user:", currentUser.id);
        }
        });

        // Lắng nghe lệnh xóa/kick
        socket.on('project_deleted', (deletedProjectId) => {
            // Ép kiểu String để so sánh chính xác
            if (String(deletedProjectId) === String(id)) {
                toast.error("Dự án không còn tồn tại hoặc bạn đã bị xóa khỏi dự án!");
                navigate('/dashboard', { replace: true });
            }
        });

        socket.on('member_updated', (projId) => {
            if (String(projId) === String(id)) fetchMembers();
        });

        socket.on('task_created', (newTask) => {
            setTasks((prev) => prev.find(t => t.id === newTask.id) ? prev : [newTask, ...prev]);
        });

        socket.on('task_updated', (updatedTask) => {
            setTasks((prev) => prev.map(t => t.id === updatedTask.id ? updatedTask : t));
        });

        socket.on('task_deleted', (taskId) => {
            setTasks((prev) => prev.filter(t => t.id !== parseInt(taskId)));
            if (String(editingTaskIdRef.current) === String(taskId)) setShowModal(false);
        });

        socket.on('new_comment', ({ taskId, comment }) => {
            if (String(editingTaskIdRef.current) === String(taskId)) {
                setComments(prev => prev.find(c => c.id === comment.id) ? prev : [...prev, comment]);
            }
        });

        socket.on('attachment_added', (file) => {
            if (String(editingTaskIdRef.current) === String(file.task_id)) {
                setAttachments(prev => [file, ...prev]);
            }
        });

        socket.on('project_updated', (data) => {
            if (String(data.id) === String(id)) {
                setProjectInfo(data);
            }
        });

        socket.on('attachment_deleted', (data) => {
            const { taskId, fileId } = data;
            if (String(editingTaskIdRef.current) === String(taskId)) {
                setAttachments((prev) => prev.filter(file => String(file.id) !== String(fileId)));
                toast.info("Một tệp đính kèm đã được xóa");
            }
        });

        return () => {
        socket.disconnect();
    };
}, [id, navigate]);

    const fetchProjectInfo = async () => { try { const res = await api.get(`/projects/${id}`); setProjectInfo(res.data); } catch (err) { } finally { setLoadingProject(false); } };
    const fetchTasks = async () => { try { const res = await api.get(`/tasks/project/${id}`); setTasks(res.data); } catch (err) { } };
    const fetchMembers = async () => { try { const res = await api.get(`/members/${id}`); setMembers(res.data); } catch (err) { } };
    const fetchAttachments = async (taskId) => { try { const res = await api.get(`/uploads/${taskId}`); setAttachments(res.data); } catch (err) { } };
    const fetchComments = async (taskId) => { try { const res = await api.get(`/tasks/${taskId}/comments`); setComments(res.data); } catch (err) { } };

    const handleSendComment = async (e) => {
        e.preventDefault();
        if (!commentInput.trim()) return;
        try {
            await api.post(`/tasks/${editingTask.id}/comments`, { content: commentInput });
            setCommentInput('');
        } catch (err) { toast.error("Lỗi gửi bình luận"); }
    };

    const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !editingTask) return;

    const data = new FormData();
    data.append('file', file);

    setUploading(true);
    try {
        //Ghi đè Content-Type thành null hoặc xóa đi để Axios tự động nhận diện FormData và thêm Boundary chuẩn.
        await api.post(`/uploads/${editingTask.id}`, data, {
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        });
        
        toast.success('Đã tải lên tệp!');
        fetchAttachments(editingTask.id);
    } catch (err) {
        console.error("Chi tiết lỗi từ server:", err.response?.data);
        toast.error(err.response?.data?.message || 'Lỗi upload');
    } finally {
        setUploading(false);
    }
};

    const handleOpenEditProject = () => {
        setProjectForm({ name: projectInfo.name, description: projectInfo.description || '' });
        setShowEditProjectModal(true);
        setShowSettings(false);
    };

    const handleDeleteAttachment = async (fileId) => {
    if (!window.confirm('Bạn có chắc muốn xóa tệp này?')) return;
    try {
        await api.delete(`/uploads/${fileId}`);
        toast.success('Đã xóa tệp');
        // Load lại danh sách tệp của task đó
        fetchAttachments(editingTask.id);
    } catch (err) {
        toast.error('Lỗi khi xóa tệp');
    }
    };

    const handleUpdateProject = async (e) => {
        e.preventDefault();
        try {
            await api.put(`/projects/${id}`, projectForm);
            toast.success('Cập nhật dự án thành công!');
            setShowEditProjectModal(false);
            fetchProjectInfo();
        } catch (err) { toast.error('Lỗi khi cập nhật dự án'); }
    };

    const handleDeleteProject = async () => {
        if (window.confirm('CẢNH BÁO: Hành động này sẽ xóa vĩnh viễn dự án!\nBạn có chắc chắn không?')) {
            try {
                await api.delete(`/projects/${id}`);
                toast.success('Đã giải thể dự án 👋');
                navigate('/dashboard');
            } catch (err) { toast.error(err.response?.data?.message || 'Lỗi khi xóa dự án'); }
        }
    };

    const openEditModal = (task) => {
        setEditingTask(task);
        editingTaskIdRef.current = task.id;
        setFormData({
            title: task.title,
            description: task.description || '',
            priority: task.priority,
            due_date: task.due_date ? task.due_date.split('T')[0] : '',
            assigned_to: task.assigned_to || ''
        });
        setShowModal(true);
        fetchAttachments(task.id);
        fetchComments(task.id);
    };

    const openCreateModal = () => {
        setEditingTask(null);
        editingTaskIdRef.current = null;
        setAttachments([]);
        setComments([]);
        setFormData({ title: '', description: '', priority: 'Medium', due_date: '', assigned_to: '' });
        setShowModal(true);
    };

    const handleSaveTask = async (e) => {
        e.preventDefault();
        try {
            if (editingTask) {
                await api.put(`/tasks/${editingTask.id}`, formData);
                toast.success('Đã cập nhật!');
            } else {
                await api.post('/tasks', { ...formData, project_id: id });
                toast.success('Đã thêm!');
            }
            setShowModal(false);
        } catch (err) { toast.error('Lỗi lưu task'); }
    };

    const handleDragEnd = async (event) => {
        const { active, over } = event;
        if (!over) return;
        const taskId = active.id;
        let newStatus = over.id;
        if (!Object.keys(COLUMNS).includes(newStatus)) {
            const overTask = tasks.find(t => t.id === newStatus);
            if (overTask) newStatus = overTask.status;
        }
        if (newStatus === 'done' && !amIAdmin) return toast.warning('Chỉ Admin mới duyệt Hoàn thành!');

        setTasks(tasks.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
        try { await api.put(`/tasks/${taskId}`, { status: newStatus }); } catch (err) { fetchTasks(); }
    };

    if (loadingProject) return <div className="h-screen flex items-center justify-center"><Loader className="animate-spin text-blue-600" size={40} /></div>;

    return (
        <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
            <div className="h-screen bg-gray-50 flex flex-col overflow-hidden">
                <header className="bg-white border-b px-6 py-3 flex justify-between items-center shadow-sm z-20">
                    <div className="flex items-center gap-4">
                        <button onClick={() => navigate('/dashboard')} className="text-gray-500 hover:bg-gray-100 p-2 rounded-full transition"><ArrowLeft size={20} /></button>
                        <div>
                            <h1 className="text-lg font-bold text-gray-800">{projectInfo.name}</h1>
                            <p className="text-xs text-gray-500">{projectInfo.description}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <button onClick={() => setShowMemberModal(true)} className="bg-white border border-gray-300 p-2 rounded-lg hover:bg-gray-50 shadow-sm"><Users size={18} /></button>
                        {amIAdmin && (
                            <div className="relative">
                                <button onClick={() => setShowSettings(!showSettings)} className={`p-2 rounded-lg transition ${showSettings ? 'bg-gray-200' : 'bg-gray-100 hover:bg-gray-200'}`}>
                                    <Settings size={20} className="text-gray-600" />
                                </button>
                                {showSettings && (
                                    <>
                                        <div className="fixed inset-0 z-10" onClick={() => setShowSettings(false)}></div>
                                        <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-gray-100 z-20 overflow-hidden">
                                            <button onClick={handleOpenEditProject} className="w-full text-left px-4 py-3 hover:bg-gray-50 flex items-center gap-2 text-sm text-gray-700">
                                                <Edit size={16} /> Chỉnh sửa thông tin
                                            </button>
                                            <button onClick={handleDeleteProject} className="w-full text-left px-4 py-3 hover:bg-red-50 flex items-center gap-2 text-sm text-red-600 border-t">
                                                <Trash2 size={16} /> Xóa dự án
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                        )}
                        <button onClick={openCreateModal} className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 shadow-md transition">
                            <Plus size={18} /> <span className="hidden sm:inline">Thêm việc</span>
                        </button>
                    </div>
                </header>

                <main className="flex-1 overflow-x-auto overflow-y-hidden bg-gray-200">
                    <div className="h-full flex p-6 gap-6 min-w-max">
                        {Object.entries(COLUMNS).map(([colId, colName]) => (
                            <KanbanColumn key={colId} id={colId} title={colName} tasks={tasks.filter(t => t.status === colId)} onEdit={openEditModal} onDelete={fetchTasks} />
                        ))}
                    </div>
                </main>

                {showModal && (
                    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
                        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col md:flex-row">
                            <div className="flex-1 p-6 overflow-y-auto custom-scrollbar border-r border-gray-100">
                                <div className="flex justify-between items-center mb-6">
                                    <h3 className="text-xl font-bold text-gray-800">{editingTask ? '✏️ Chi tiết công việc' : '✨ Tạo mới'}</h3>
                                    <button onClick={() => setShowModal(false)}><X className="text-gray-400 hover:text-gray-600" /></button>
                                </div>
                                <form onSubmit={handleSaveTask} className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-1">Tiêu đề</label>
                                        <input required className="w-full border rounded-lg p-3 outline-none focus:ring-2 focus:ring-blue-500" value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} disabled={!canEditContent && editingTask} />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Người thực hiện</label>
                                            <select className="w-full border rounded-lg p-2.5 outline-none" value={formData.assigned_to} onChange={e => setFormData({ ...formData, assigned_to: e.target.value })} disabled={!canEditContent && editingTask}>
                                                <option value="">-- Chưa giao --</option>
                                                {members.map(m => <option key={m.user_id} value={m.user_id}>{m.name}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Mức độ</label>
                                            <select className="w-full border rounded-lg p-2.5 outline-none" value={formData.priority} onChange={e => setFormData({ ...formData, priority: e.target.value })} disabled={!canEditContent && editingTask}>
                                                <option value="Low">Low</option><option value="Medium">Medium</option><option value="High">High</option><option value="Urgent">Urgent</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-1">Mô tả</label>
                                        <textarea rows="4" className="w-full border rounded-lg p-3 outline-none focus:ring-2 focus:ring-blue-500 resize-none" value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} disabled={!canEditContent && editingTask}></textarea>
                                    </div>

                                    {/* DEADLINE NHẬP TẠI ĐÂY */}
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-1">Hạn chót (Deadline)</label>
                                        <input type="date" className="w-full border rounded-lg p-3 outline-none focus:ring-2 focus:ring-blue-500" value={formData.due_date} onChange={e => setFormData({ ...formData, due_date: e.target.value })} disabled={!canEditContent && editingTask} />
                                    </div>

                                    {canEditContent && (
                                        <div className="pt-4 flex justify-end gap-3">
                                            <button type="submit" className="bg-blue-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-blue-700 transition">Lưu lại</button>
                                        </div>
                                    )}
                                </form>

                                {editingTask && (
                                    <div className="mt-8 border-t pt-6">
                                        <h4 className="font-bold text-gray-700 mb-4 flex items-center gap-2"><MessageSquare size={18} /> Trao đổi</h4>
                                        <div className="space-y-4 max-h-60 overflow-y-auto mb-4 p-3 bg-gray-50 rounded-xl border custom-scrollbar">
                                            {comments.length === 0 && <p className="text-center text-gray-400 text-sm italic py-4">Chưa có thảo luận nào.</p>}
                                            {comments.map(c => (
                                                <div key={c.id} className="bg-white p-3 rounded-lg shadow-sm border border-gray-100">
                                                    <div className="flex justify-between items-center mb-1">
                                                        <span className="font-bold text-blue-600 text-xs">{c.user_name}</span>
                                                        <span className="text-[10px] text-gray-400">
                                                            {new Date(c.created_at).toLocaleString('vi-VN')}
                                                        </span>
                                                    </div>
                                                    <p className="text-gray-700 text-sm">{c.content}</p>
                                                </div>
                                            ))}
                                            <div ref={commentsEndRef} />
                                        </div>
                                        <form onSubmit={handleSendComment} className="flex gap-2">
                                            <input className="flex-1 border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500" placeholder="Viết phản hồi..." value={commentInput} onChange={e => setCommentInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleSendComment(e); } }} />
                                            <button type="button" onClick={handleSendComment} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold">Gửi</button>
                                        </form>
                                    </div>
                                )}
                            </div>

                                {/* CỘT ĐÍNH KÈM FILE */}
                                {editingTask && (
                                    <div className="w-full md:w-80 bg-gray-50 p-6 flex flex-col border-l border-gray-100">
                                        <h4 className="font-bold text-gray-700 mb-4 flex items-center gap-2">
                                            <Paperclip size={18} /> Đính kèm ({attachments.length})
                                        </h4>
                                        
                                        <div className="flex-1 overflow-y-auto space-y-3 mb-4 custom-scrollbar">
                                            {attachments.map(file => (
                                                <div key={file.id} className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm relative group flex justify-between items-center hover:bg-red-50 transition-colors">
                                                    <div className="flex items-center gap-3 overflow-hidden">
                                                        <FileText className="text-blue-500 shrink-0" size={20} />
                                                        <div className="min-w-0 flex-1">
                                                            <a href={`http://localhost:5000${file.file_path}`} target="_blank" rel="noreferrer" className="text-sm font-medium text-gray-700 hover:text-blue-600 truncate block">
                                                                {file.file_name}
                                                            </a>
                                                            <p className="text-[10px] text-gray-400">{formatFileSize(file.file_size)}</p>
                                                        </div>
                                                    </div>
                                                    {canEditContent && (
                                                        <button 
                                                            onClick={() => handleDeleteAttachment(file.id)} 
                                                            className="text-gray-400 hover:text-red-500 p-1 rounded-md hover:bg-white transition shadow-sm opacity-0 group-hover:opacity-100"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                        {canEditContent && (
                                            <div className="mt-auto">
                                                <input type="file" id="file-upload" className="hidden" onChange={handleUpload} disabled={uploading}/>
                                                <label htmlFor="file-upload" className="w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 text-sm flex items-center justify-center gap-2 cursor-pointer hover:border-blue-500 hover:text-blue-600 transition">
                                                    {uploading ? <Loader className="animate-spin" size={16} /> : <Plus size={16} />} Thêm tệp đính kèm
                                                </label>
                                            </div>
                                        )}
                                    </div>
                                )}
                        </div>
                    </div>
                )}

                {showMemberModal && <MemberModal projectId={id} members={members} onClose={() => setShowMemberModal(false)} onUpdate={fetchMembers} />}

                {showEditProjectModal && (
                    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
                        <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 animate-fadeIn">
                            <h3 className="text-xl font-bold mb-4 flex items-center gap-2 text-gray-800"><Settings size={20} className="text-gray-600" /> Cài đặt dự án</h3>
                            <form onSubmit={handleUpdateProject}>
                                <div className="space-y-4">
                                    <div><label className="block text-sm font-medium text-gray-700 mb-1">Tên dự án</label><input required className="w-full border border-gray-300 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-500" value={projectForm.name} onChange={e => setProjectForm({ ...projectForm, name: e.target.value })} /></div>
                                    <div><label className="block text-sm font-medium text-gray-700 mb-1">Mô tả ngắn</label><textarea rows="3" className="w-full border border-gray-300 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-500 resize-none" value={projectForm.description} onChange={e => setProjectForm({ ...projectForm, description: e.target.value })}></textarea></div>
                                </div>
                                <div className="flex justify-end gap-3 mt-6">
                                    <button type="button" onClick={() => setShowEditProjectModal(false)} className="px-5 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium transition">Hủy</button>
                                    <button type="submit" className="px-5 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition flex items-center gap-2"><Save size={18} /> Lưu lại</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </DndContext>
    );
};

export default ProjectDetail;