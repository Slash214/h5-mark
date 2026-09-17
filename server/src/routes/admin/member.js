const router = require('express').Router();
const db = require('../../db');
const dayjs = require('dayjs');
const { ok, wrap, isPhone } = require('../../utils/helper');
const { HttpError } = require('../../middleware/error');
const member = require('../../services/member.service');

router.get('/', wrap(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page || '1', 10));
  const size = Math.min(100, Math.max(1, parseInt(req.query.size || '15', 10)));
  const where = ['1=1']; const params = [];
  if (req.query.phone) { where.push('phone LIKE ?'); params.push('%' + req.query.phone + '%'); }
  if (req.query.valid === '1') where.push('expire_at > NOW()');
  if (req.query.valid === '0') where.push('expire_at <= NOW()');
  const rows = await db.query(
    `SELECT id,phone,openid,expire_at,total_days,created_at,(expire_at>NOW()) AS valid
     FROM phone_member WHERE ${where.join(' AND ')} ORDER BY id DESC LIMIT ${(page - 1) * size}, ${size}`, params);
  const c = await db.one(`SELECT COUNT(*) c FROM phone_member WHERE ${where.join(' AND ')}`, params);
  res.json(ok({ list: rows, total: c.c }));
}));

/** 手动赠送天数 */
router.post('/grant', wrap(async (req, res) => {
  const { phone, days } = req.body;
  if (!isPhone(phone)) throw new HttpError('号码格式不正确');
  const d = parseInt(days, 10);
  if (!d) throw new HttpError('天数不正确');
  const expire = await member.grant(phone, d, null);
  res.json(ok({ expireAt: expire }, `已为 ${phone} 增加 ${d} 天，到期 ${expire}`));
}));

/** 直接设置到期时间（可用于关闭会员：设为过去时间） */
router.put('/:phone/expire', wrap(async (req, res) => {
  const expireAt = dayjs(req.body.expireAt).format('YYYY-MM-DD HH:mm:ss');
  await member.setExpire(req.params.phone, expireAt);
  res.json(ok(null, '已更新'));
}));

router.delete('/:id', wrap(async (req, res) => {
  await db.query('DELETE FROM phone_member WHERE id=?', [req.params.id]);
  res.json(ok(null, '已删除'));
}));

module.exports = router;
