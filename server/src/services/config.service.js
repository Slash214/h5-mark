const db = require('../db');

let cache = null;
let cacheAt = 0;
const TTL = 10 * 1000; // 10s 本地缓存，后台改完最多 10 秒生效

const WX_KEYS = new Set([
  'site_url', 'wx_appid', 'wx_appsecret',
  'wxpay_mchid', 'wxpay_serial_no', 'wxpay_api_v3_key',
  'wxpay_notify_url', 'wxpay_private_key',
]);

async function all(force = false) {
  if (!force && cache && Date.now() - cacheAt < TTL) return cache;
  const rows = await db.query('SELECT `k`,`v` FROM sys_config');
  cache = {};
  rows.forEach((r) => { cache[r.k] = r.v; });
  cacheAt = Date.now();
  return cache;
}

async function get(key, def = '') {
  const c = await all();
  return c[key] === undefined || c[key] === null ? def : c[key];
}

async function num(key, def = 0) {
  const v = await get(key, '');
  const n = parseInt(v, 10);
  return Number.isNaN(n) ? def : n;
}

async function set(key, value) {
  await db.query(
    'INSERT INTO sys_config (`k`,`v`,`name`) VALUES (?,?,?) ON DUPLICATE KEY UPDATE `v`=VALUES(`v`)',
    [key, String(value ?? ''), key]
  );
  cache = null;
}

async function setMany(obj) {
  let touchWx = false;
  for (const [k, v] of Object.entries(obj)) {
    await set(k, v);
    if (WX_KEYS.has(k)) touchWx = true;
  }
  cache = null;
  if (touchWx) {
    try { require('./wxcfg.service').notifyChange(); } catch (e) { /* */ }
  }
}

function flush() { cache = null; }

module.exports = { all, get, num, set, setMany, flush, WX_KEYS };
