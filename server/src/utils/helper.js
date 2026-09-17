const crypto = require('crypto');

const PHONE_RE = /^1[3-9]\d{9}$/;

function isPhone(p) {
  return PHONE_RE.test(String(p || '').trim());
}

/** 138****8000 */
function maskPhone(p) {
  const s = String(p || '');
  return s.length === 11 ? s.slice(0, 3) + '****' + s.slice(7) : s;
}

function sha256(str) {
  return crypto.createHash('sha256').update(str, 'utf8').digest('hex');
}

function randomStr(len = 32) {
  return crypto.randomBytes(Math.ceil(len / 2)).toString('hex').slice(0, len);
}

/** 商户订单号: 年月日时分秒 + 6 随机 */
function genOrderNo(prefix = 'M') {
  const d = new Date();
  const p = (n, l = 2) => String(n).padStart(l, '0');
  const ts = `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
  return `${prefix}${ts}${Math.random().toString().slice(2, 8)}`;
}

function ok(data = null, msg = 'ok') {
  return { code: 0, msg, data };
}
function fail(msg = '操作失败', code = 1, data = null) {
  return { code, msg, data };
}

/** 统一异步路由包装，省去 try/catch */
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

function clientIp(req) {
  return (
    (req.headers['x-forwarded-for'] || '').split(',')[0].trim() ||
    req.socket?.remoteAddress ||
    ''
  );
}

module.exports = { isPhone, maskPhone, sha256, randomStr, genOrderNo, ok, fail, wrap, clientIp };
