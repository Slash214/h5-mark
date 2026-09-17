const router = require('express').Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cfg = require('../../config');
const { ok } = require('../../utils/helper');

const dir = path.resolve(__dirname, '../../../uploads');
fs.mkdirSync(dir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, dir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, Date.now() + '_' + Math.random().toString(36).slice(2, 8) + ext);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const okExt = /\.(png|jpe?g|gif|webp|bmp)$/i.test(file.originalname);
    cb(okExt ? null : new Error('只允许上传图片'), okExt);
  },
});

router.post('/image', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ code: 1, msg: '未收到文件' });
  const url = `${cfg.siteUrl || ''}/uploads/${req.file.filename}`;
  res.json(ok({ url, path: `/uploads/${req.file.filename}` }));
});

module.exports = router;
