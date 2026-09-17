const router = require('express').Router();
const db = require('../db');
const { userOptional, userAuth } = require('../middleware/auth');
const { HttpError } = require('../middleware/error');
const { isPhone, ok, wrap } = require('../utils/helper');
const query = require('../services/query.service');
const member = require('../services/member.service');
const conf = require('../services/config.service');

/**
 * 自助查询
 * 未开通会员：只返回“被 N 个平台标记”，不返回是哪几个平台
 * 已开通会员：返回完整明细
 */
router.post('/', userOptional, wrap(async (req, res) => {
  const phone = String(req.body.phone || '').trim();
  if (!isPhone(phone)) throw new HttpError('请输入正确的 11 位手机号码');

  const openid = req.user ? req.user.openid : null;
  if (openid) await db.query('UPDATE wx_user SET last_phone=? WHERE openid=?', [phone, openid]);

  const m = await member.status(phone);
  const r = await query.queryMark(phone, openid, req);

  const payload = {
    phone,
    isMember: m.isMember,
    expireAt: m.isMember ? m.expireAt : null,
    leftDays: m.leftDays,
    markCount: r.markCount,
    price: await conf.num('price', 990),
    memberDays: await conf.num('member_days', 30),
    // 未开通会员时隐藏平台明细
    list: m.isMember
      ? r.list
      : r.list.filter((x) => x.marked).map(() => ({ code: '', name: '开通会员后可见', marked: true, tag: '', locked: true })),
  };
  res.json(ok(payload));
}));

/** 会员状态 */
router.get('/member', wrap(async (req, res) => {
  const phone = String(req.query.phone || '').trim();
  if (!isPhone(phone)) throw new HttpError('号码格式不正确');
  res.json(ok({ phone, ...(await member.status(phone)) }));
}));

/** 提交清除标记工单（需要该号码是会员） */
router.post('/clear', userAuth, wrap(async (req, res) => {
  const phone = String(req.body.phone || '').trim();
  const codes = Array.isArray(req.body.platforms) ? req.body.platforms : [req.body.platform].filter(Boolean);
  if (!isPhone(phone)) throw new HttpError('号码格式不正确');
  if (!codes.length) throw new HttpError('请选择要处理的平台');

  const m = await member.status(phone);
  if (!m.isMember) throw new HttpError('该号码尚未开通处理服务', 402);

  const ps = await query.platforms();
  const map = Object.fromEntries(ps.map((p) => [p.code, p.name]));
  const created = [];
  for (const code of codes) {
    if (!map[code]) continue;
    // 同号码同平台如已有未完成工单则不重复创建
    const exist = await db.one(
      'SELECT id FROM clear_task WHERE phone=? AND platform_code=? AND status IN (0,1)', [phone, code]
    );
    if (exist) { created.push({ code, id: exist.id, repeated: true }); continue; }
    const r = await db.query(
      'INSERT INTO clear_task (phone, openid, platform_code, platform_name) VALUES (?,?,?,?)',
      [phone, req.user.openid, code, map[code]]
    );
    created.push({ code, id: r.insertId, repeated: false });
  }
  res.json(ok({ tasks: created }, '已提交，客服将在 1-7 个工作日内处理'));
}));

/** 我的工单进度 */
router.get('/clear/list', wrap(async (req, res) => {
  const phone = String(req.query.phone || '').trim();
  if (!isPhone(phone)) throw new HttpError('号码格式不正确');
  const rows = await db.query(
    'SELECT id,platform_code,platform_name,status,remark,created_at,updated_at FROM clear_task WHERE phone=? ORDER BY id DESC LIMIT 50',
    [phone]
  );
  res.json(ok(rows));
}));

module.exports = router;
