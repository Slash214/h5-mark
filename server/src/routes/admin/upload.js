const router = require('express').Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const wxcfg = require('../../services/wxcfg.service');
const { ok, wrap } = require('../../utils/helper');

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

router.post('/image', upload.single('file'), wrap(async (req, res) => {
  if (!req.file) return res.status(400).json({ code: 1, msg: '未收到文件' });
  const site = await wxcfg.siteUrl();
  const url = `${site || ''}/uploads/${req.file.filename}`;
  res.json(ok({ url, path: `/uploads/${req.file.filename}` }));
}));

/** 微信支付证书/私钥解析（内存，不落盘到公开目录） */
const pemUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 64 * 1024 },
  fileFilter: (req, file, cb) => {
    const name = (file.originalname || '').toLowerCase();
    const okName = /\.(pem|crt|key|txt)$/i.test(name) || name.includes('apiclient');
    cb(okName ? null : new Error('请上传 .pem 证书/私钥文件'), okName);
  },
});

/**
 * POST /upload/wxpay-pem
 * form-data: file + kind=key|cert
 * - key  → 返回 privateKey（PEM 全文）
 * - cert → 返回 serialNo（从 apiclient_cert.pem 解析）
 */
router.post('/wxpay-pem', pemUpload.single('file'), wrap(async (req, res) => {
  if (!req.file) return res.status(400).json({ code: 1, msg: '未收到文件' });
  const kind = String(req.body.kind || req.query.kind || '').toLowerCase();
  const text = req.file.buffer.toString('utf8').replace(/^\uFEFF/, '').trim();

  if (kind === 'key' || text.includes('PRIVATE KEY')) {
    if (!/BEGIN [\w\s]*PRIVATE KEY/.test(text)) {
      return res.status(400).json({ code: 1, msg: '不是有效的商户私钥 PEM（需含 BEGIN PRIVATE KEY）' });
    }
    return res.json(ok({
      kind: 'key',
      privateKey: text,
      fileName: req.file.originalname,
    }, '私钥解析成功'));
  }

  if (kind === 'cert' || text.includes('BEGIN CERTIFICATE')) {
    if (!text.includes('BEGIN CERTIFICATE')) {
      return res.status(400).json({ code: 1, msg: '不是有效的商户证书 PEM（需含 BEGIN CERTIFICATE）' });
    }
    let serialNo;
    try {
      const x509 = new crypto.X509Certificate(text);
      serialNo = String(x509.serialNumber || '').replace(/:/g, '').toUpperCase();
    } catch (e) {
      return res.status(400).json({ code: 1, msg: '证书解析失败：' + e.message });
    }
    if (!serialNo) return res.status(400).json({ code: 1, msg: '未能从证书中读取序列号' });
    return res.json(ok({
      kind: 'cert',
      serialNo,
      fileName: req.file.originalname,
    }, '证书序列号已提取'));
  }

  return res.status(400).json({
    code: 1,
    msg: '无法识别文件类型，请分别上传 apiclient_key.pem 与 apiclient_cert.pem',
  });
}));

module.exports = router;
