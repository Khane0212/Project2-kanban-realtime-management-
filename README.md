Overview
Hệ thống quản lý công việc theo mô hình Kanban thời gian thực, tập trung vào việc tối ưu hóa khả năng cộng tác nhóm thông qua việc đồng bộ hóa dữ liệu tức thì. Dự án giải quyết các vấn đề về thất lạc thông tin và sự chậm trễ trong việc cập nhật trạng thái công việc so với các phương pháp truyền thống.


Tech Stack
Hệ thống được xây dựng trên nền tảng Full-stack JavaScript (PERN Stack):
Frontend: React.js (Component-based architecture, Hooks: useRef, useEffect) kết hợp Tailwind CSS.
Backend: Node.js & Express.js (MVC Pattern).
Database: PostgreSQL (Relational Database Management System).
Real-time Communication: Socket.io (WebSockets).
Security: JSON Web Token (JWT) & Bcrypt hashing.
File Storage: Multer middleware để quản lý luồng dữ liệu tệp tin.


Key Features
Kanban Board Dashboard: Giao diện trực quan cho phép tạo, sửa, xóa và thay đổi trạng thái thẻ công việc bằng thao tác kéo-thả.
Real-time Synchronization: Mọi thay đổi về trạng thái Task, thảo luận hoặc tệp đính kèm được cập nhật đồng thời đến tất cả thành viên trong dự án với độ trễ dưới 1 giây thông qua cơ chế Room của Socket.io.
Role-based Access Control (RBAC): Phân định vai trò rõ ràng giữa Quản trị viên (Admin) và Thành viên (Member) trong dự án.
Dual-layer File Management: Quy trình "xóa kép" đảm bảo khi xóa bản ghi trên Database, tệp vật lý tương ứng trong thư mục /uploads cũng được gỡ bỏ để tối ưu dung lượng Server.
Smart UI/UX: Tích hợp tính năng tự động cuộn (Auto-scroll) khi có thảo luận mới và hiển thị thông báo lỗi minh bạch (HTTP 401, 403, 500).


Database Architecture
Cơ sở dữ liệu được thiết kế chặt chẽ với 6 thực thể chính đảm bảo tính toàn vẹn dữ liệu thông qua các ràng buộc khóa ngoại (Foreign Keys) và cơ chế xóa Cascade:
Users: Quản lý tài khoản và thông tin cá nhân.
Projects: Thông tin chung về các dự án.
Tasks: Các thẻ công việc với độ ưu tiên và hạn chót.
Project Members: Quản lý vai trò và danh sách thành viên trong từng dự án.
Task Comments: Lưu trữ lịch sử thảo luận Real-time.
Attachments: Quản lý Metadata và đường dẫn lưu trữ tệp tin.



Installation & Setup
1. Database Setup
Khởi tạo Database PostgreSQL.
Sử dụng file database_schema.sql để tạo cấu trúc bảng.


2. Backend Configuration

  cd backend
  npm install

Tạo file .env từ mẫu .env.example với các biến:
  PORT=5000
  DB_USER, DB_PASS, DB_NAME, DB_HOST, DB_PORT
  JWT_SECRET

Chạy server: npm start.


3. Frontend Configuration

cd frontend
npm install
npm start

