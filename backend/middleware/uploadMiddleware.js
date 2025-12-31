const multer = require('multer');
const path = require('path');
const fs = require('fs');

// 1. Tự động tạo thư mục uploads ở thư mục gốc của dự án
const uploadDir = path.join(process.cwd(), 'uploads'); 
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// 2. Cấu hình Storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir); 
    },
    filename: (req, file, cb) => {
        // Fix lỗi hiển thị sai tên file tiếng Việt
        const originalName = Buffer.from(file.originalname, 'latin1').toString('utf8');
        
        // Clean tên file
        const cleanName = originalName.replace(/[^a-zA-Z0-9.\-_]/g, '');
        cb(null, `${Date.now()}-${cleanName}`);
    }
});

// 3. Bộ lọc file
const fileFilter = (req, file, cb) => {
    const allowedFileTypes = /jpeg|jpg|png|gif|pdf|doc|docx|xls|xlsx|zip|rar/;
    const extname = allowedFileTypes.test(path.extname(file.originalname).toLowerCase());
    
    if (extname) {
        return cb(null, true);
    } else {
        cb(new Error('Định dạng file không được hỗ trợ!'));
    }
};

// 4. Khởi tạo Multer
const upload = multer({ 
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    fileFilter: fileFilter
});

module.exports = upload.single('file'); 