const multer = require('multer');
const path   = require('path');
const fs     = require('fs');

// Folder uploads ada di root Backend-Klinik/uploads
const uploadDir = path.join(__dirname, '../uploads');

// Buat folder jika belum ada
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext      = path.extname(file.originalname);
    const filename = `photo-${req.user.id}-${Date.now()}${ext}`;
    cb(null, filename);
  },
});

// Hanya izinkan file gambar
const fileFilter = (req, file, cb) => {
  const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Hanya file gambar yang diizinkan (jpg, png, webp)'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 2 * 1024 * 1024 }, // max 2MB
});

module.exports = upload;