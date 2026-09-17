const jwt = require('jsonwebtoken');
const cfg = require('../config');
const { fail } = require('../utils/helper');

function sign(payload) {
  return jwt.sign(payload, cfg.jwt.secret, { expiresIn: cfg.jwt.expires });
}

function readToken(req) {
  const h = req.headers.authorization || '';
  if (h.startsWith('Bearer ')) return h.slice(7);
  return req.query.token || req.headers['x-token'] || '';
}

/** H5 用户登录（openid）——必须登录 */
function userAuth(req, res, next) {
  try {
    const p = jwt.verify(readToken(req), cfg.jwt.secret);
    if (p.scope !== 'user') throw new Error('scope');
    req.user = p;
    next();
  } catch (e) {
    res.status(401).json(fail('请先在微信中授权登录', 401));
  }
}

/** H5 用户——可选登录，未登录也放行 */
function userOptional(req, res, next) {
  try {
    const p = jwt.verify(readToken(req), cfg.jwt.secret);
    if (p.scope === 'user') req.user = p;
  } catch (e) { /* ignore */ }
  next();
}

/** 后台管理员 */
function adminAuth(req, res, next) {
  try {
    const p = jwt.verify(readToken(req), cfg.jwt.secret);
    if (p.scope !== 'admin') throw new Error('scope');
    req.admin = p;
    next();
  } catch (e) {
    res.status(401).json(fail('登录已过期，请重新登录', 401));
  }
}

module.exports = { sign, userAuth, userOptional, adminAuth };
