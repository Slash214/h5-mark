const router = require('express').Router();
const cfg = require('../config');
const db = require('../db');
const wx = require('../utils/wx');
const { sign, userAuth } = require('../middleware/auth');
const { ok, wrap } = require('../utils/helper');

/**
 * 1) 前端未登录 -> GET /api/auth/login?redirect=/query
 *    直接 302 到微信授权页
 */
router.get('/login', wrap(async (req, res) => {
  const redirect = req.query.redirect || '/';
  if (cfg.dev.fakeLogin) {
    const token = await upsertUser(cfg.dev.mockOpenid);
    return res.redirect(`${cfg.siteUrl}/#${redirect}${redirect.includes('?') ? '&' : '?'}token=${token}`);
  }
  const cb = `${cfg.siteUrl}/api/auth/callback`;
  const state = Buffer.from(JSON.stringify({ r: redirect })).toString('base64url');
  res.redirect(wx.authorizeUrl(cb, state, req.query.scope === 'userinfo' ? 'snsapi_userinfo' : 'snsapi_base'));
}));

/** 2) 微信回跳 */
router.get('/callback', wrap(async (req, res) => {
  const { code, state } = req.query;
  let redirect = '/';
  try { redirect = JSON.parse(Buffer.from(state || '', 'base64url').toString()).r || '/'; } catch (e) { /* */ }
  if (!code) return res.redirect(`${cfg.siteUrl}/#/?err=nocode`);

  const session = await wx.codeToSession(code);
  let profile = {};
  if (session.scope && session.scope.includes('snsapi_userinfo')) {
    try { profile = await wx.getUserInfoByOauth(session.access_token, session.openid); } catch (e) { /* */ }
  }
  const token = await upsertUser(session.openid, session.unionid, profile);
  res.redirect(`${cfg.siteUrl}/#${redirect}${redirect.includes('?') ? '&' : '?'}token=${token}`);
}));

/** 3) 前端用 code 换 token（SPA 自行调 wx 授权时用） */
router.post('/code2token', wrap(async (req, res) => {
  const { code } = req.body;
  const session = await wx.codeToSession(code);
  const token = await upsertUser(session.openid, session.unionid);
  res.json(ok({ token, openid: session.openid }));
}));

/** 当前登录用户 */
router.get('/me', userAuth, wrap(async (req, res) => {
  const u = await db.one('SELECT openid,nickname,avatar,last_phone FROM wx_user WHERE openid=?', [req.user.openid]);
  res.json(ok(u));
}));

/** JS-SDK 签名（调起微信支付/分享用） */
router.get('/jssdk', wrap(async (req, res) => {
  const url = req.query.url;
  if (!url) return res.json({ code: 1, msg: '缺少 url' });
  res.json(ok(await wx.jsSdkConfig(url)));
}));

async function upsertUser(openid, unionid = null, profile = {}) {
  await db.query(
    `INSERT INTO wx_user (openid, unionid, nickname, avatar) VALUES (?,?,?,?)
     ON DUPLICATE KEY UPDATE unionid=IFNULL(VALUES(unionid),unionid),
       nickname=IFNULL(VALUES(nickname),nickname), avatar=IFNULL(VALUES(avatar),avatar)`,
    [openid, unionid, profile.nickname || null, profile.headimgurl || null]
  );
  return sign({ scope: 'user', openid });
}

module.exports = router;
