const db = require('../db');

let cache = null;
let cacheAt = 0;
const TTL = 10 * 1000; // 10s 本地缓存，后台改完最多 10 秒生效

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
  for (const [k, v] of Object.entries(obj)) await set(k, v);
  cache = null;
}

function flush() { cache = null; }

module.exports = { all, get, num, set, setMany, flush };
