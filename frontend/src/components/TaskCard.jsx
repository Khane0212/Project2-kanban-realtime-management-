import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Clock, Paperclip, AlertCircle, CheckCircle2 } from 'lucide-react';

const TaskCard = ({ task, onEdit, onDelete }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    data: { ...task }
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  // Màu sắc theo độ ưu tiên
  const priorityColor = {
    Low: 'bg-gray-100 text-gray-600',
    Medium: 'bg-blue-50 text-blue-600',
    High: 'bg-orange-50 text-orange-600',
    Urgent: 'bg-red-50 text-red-600 border border-red-100'
  }[task.priority] || 'bg-gray-100 text-gray-600';

  // Check quá hạn
  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'done';

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => onEdit(task)}
      className="bg-white p-3 rounded-xl border border-gray-200 shadow-sm hover:shadow-md cursor-grab active:cursor-grabbing group relative transition-all"
    >
      {/* Nút xóa nhanh*/}
      <button 
        onClick={(e) => { e.stopPropagation(); onDelete(task.id); }}
        className="absolute top-2 right-2 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition p-1"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18"/><path d="M6 6l12 12"/></svg>
      </button>

      {/* Tags */}
      <div className="flex gap-2 mb-2">
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${priorityColor}`}>
          {task.priority}
        </span>
        {isOverdue && (
           <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-600 flex items-center gap-1">
             <AlertCircle size={10}/> Quá hạn
           </span>
        )}
      </div>

      <h4 className="text-sm font-semibold text-gray-800 mb-1 line-clamp-2 leading-snug">
        {task.title}
      </h4>
      
      {/* Footer info */}
      <div className="flex justify-between items-center mt-3 pt-2 border-t border-gray-50">
         <div className="flex items-center gap-3 text-gray-400 text-xs">
            {task.due_date && (
               <div className={`flex items-center gap-1 ${isOverdue ? 'text-red-500 font-bold' : ''}`}>
                 <Clock size={12} /> {new Date(task.due_date).toLocaleDateString('vi-VN').split('/').slice(0,2).join('/')}
               </div>
            )}
            {/* Nếu backend có trả về attachment_count thì hiển thị */}
            {/* <div className="flex items-center gap-1"><Paperclip size={12}/> 2</div> */}
         </div>

         {task.assigned_name ? (
             <div className="flex items-center gap-1" title={`Giao cho: ${task.assigned_name}`}>
                <img src={task.avatar || `https://ui-avatars.com/api/?name=${task.assigned_name}`} className="w-5 h-5 rounded-full" alt=""/>
             </div>
         ) : (
             <div className="w-5 h-5 rounded-full bg-gray-100 border border-gray-300 border-dashed"></div>
         )}
      </div>
    </div>
  );
};

export default TaskCard;