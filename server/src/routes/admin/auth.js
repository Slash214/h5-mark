const router = require('express').Router();
const db = require('../../db');
const dayjs = require('dayjs');
const { sign, adminAuth } = require('../../middleware/auth');
const { HttpError } = require('../../middleware/error');
const { sha256, randomStr, ok, wrap } = require('../../utils/helper');

router.post('/login', wrap(async (req, res) => {
  const { username, password } = req.body;
  const u = await db.one('SELECT * FROM admin_user WHERE username=?', [String(username || '').trim()]);
  if (!u || u.password !== sha256(String(password || '') + u.salt)) {
    throw new HttpError('账号或密码错误', 401);
  }
  await db.query('UPDATE admin_user SET last_login=? WHERE id=?', [dayjs().format('YYYY-MM-DD HH:mm:ss'), u.id]);
  res.json(ok({ token: sign({ scope: 'admin', id: u.id, username: u.username }), username: u.username, nickname: u.nickname }));
}));

router.get('/profile', adminAuth, wrap(async (req, res) => {
  const u = await db.one('SELECT id,username,nickname,last_login FROM admin_user WHERE id=?', [req.admin.id]);
  res.json(ok(u));
}));

router.post('/password', adminAuth, wrap(async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  if (!newPassword || String(newPassword).length < 6) throw new HttpError('新密码至少 6 位');
  const u = await db.one('SELECT * FROM admin_user WHERE id=?', [req.admin.id]);
  if (u.password !== sha256(String(oldPassword || '') + u.salt)) throw new HttpError('原密码错误');
  const salt = randomStr(16);
  await db.query('UPDATE admin_user SET password=?, salt=? WHERE id=?', [sha256(newPassword + salt), salt, u.id]);
  res.json(ok(null, '修改成功'));
}));

module.exports = router;
