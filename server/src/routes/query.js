const router = require('express').Router();
const db = require('../db');
const { userOptional, userAuth } = require('../middleware/auth');
const { HttpError } = require('../middleware/error');
const { isPhone, ok, wrap, clientIp } = require('../utils/helper');
const query = require('../services/query.service');
const member = require('../services/member.service');
const conf = require('../services/config.service');
const ratelimit = require('../utils/ratelimit');

/**
 * 自助查询
 * - 同号短时缓存，避免重复扣费
 * - 上游调用按 openid / IP 限频（缓存命中不计）
 * - 未开通会员：只返回标记数量
 */
router.post('/', userOptional, wrap(async (req, res) => {
  const phone = String(req.body.phone || '').trim();
  if (!isPhone(phone)) throw new HttpError('请输入正确的 11 位手机号码');

  const requireLogin = String(await conf.get('query_require_login', '0')) === '1';
  if (requireLogin && !req.user) {
    throw new HttpError('请先在微信中授权登录后再查询', 401);
  }

  const openid = req.user ? req.user.openid : null;
  const ip = clientIp(req) || 'unknown';
  const perMin = await conf.num('query_rate_per_min', 1);
  const perDay = await conf.num('query_rate_per_day', 30);
  const force = !!req.body.force;

  // 强制刷新仅会员可用（仍走限频，且会真实扣费）
  let useForce = false;
  if (force) {
    const m0 = await member.status(phone);
    if (!m0.isMember) throw new HttpError('仅会员可强制刷新查询', 402);
    useForce = true;
  }

  if (openid) await db.query('UPDATE wx_user SET last_phone=? WHERE openid=?', [phone, openid]);

  const idKey = openid ? `oid:${openid}` : `ip:${ip}`;
  const dayMax = openid ? perDay : Math.max(1, Math.floor(perDay / 2));

  const r = await query.queryMark(phone, openid, req, {
    force: useForce,
    beforeFetch: () => {
      const minHit = ratelimit.hit(`${idKey}:min`, perMin, 60);
      if (!minHit.ok) {
        throw new HttpError(`查询过于频繁，请 ${minHit.retryAfterSec} 秒后再试`, 429);
      }
      const dayHit = ratelimit.hit(ratelimit.dayKey(idKey), dayMax, 86400);
      if (!dayHit.ok) {
        throw new HttpError(`今日查询次数已达上限（${dayMax} 次），请明天再试或联系客服`, 429);
      }
    },
  });

  const m = await member.status(phone);
  const payload = {
    phone,
    isMember: m.isMember,
    expireAt: m.isMember ? m.expireAt : null,
    leftDays: m.leftDays,
    markCount: r.markCount,
    price: await conf.num('price', 990),
    memberDays: await conf.num('member_days', 30),
    cached: !!r.cached,
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
