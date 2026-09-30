const db = require('../db');
const providers = require('../providers');
const conf = require('./config.service');
const { clientIp } = require('../utils/helper');

/** 同号进行中的请求合并，避免连点重复扣费 */
const inflight = new Map();

async function platforms() {
  return db.query(
    'SELECT code,name,short,color,icon,appeal_url FROM mark_platform WHERE enabled=1 ORDER BY sort ASC, id ASC'
  );
}

function attachAppeal(list, ps) {
  const urlMap = Object.fromEntries(ps.map((p) => [p.code, p.appeal_url || '']));
  return (list || []).map((item) => ({
    ...item,
    appealUrl: item.appealUrl || urlMap[item.code] || '',
  }));
}

/**
 * 读同号近期真实查询（排除缓存流水）
 */
async function loadCache(phone, ttlSec) {
  if (!ttlSec || ttlSec <= 0) return null;
  const row = await db.one(
    `SELECT mark_count, result_json, provider, created_at
     FROM mark_query
     WHERE phone=? AND created_at >= DATE_SUB(NOW(), INTERVAL ? SECOND)
       AND provider NOT LIKE '%:cache'
     ORDER BY id DESC LIMIT 1`,
    [phone, ttlSec]
  );
  if (!row) return null;
  let list = [];
  try {
    list = typeof row.result_json === 'string' ? JSON.parse(row.result_json) : (row.result_json || []);
  } catch (e) {
    return null;
  }
  return {
    markCount: Number(row.mark_count) || list.filter((x) => x.marked).length,
    list,
    provider: row.provider,
    cached: true,
    cachedAt: row.created_at,
  };
}

async function logCacheHit(phone, openid, req, cached, list) {
  await db.query(
    'INSERT INTO mark_query (phone, openid, mark_count, result_json, provider, ip) VALUES (?,?,?,?,?,?)',
    [
      phone,
      openid,
      cached.markCount,
      JSON.stringify(list),
      `${cached.provider}:cache`,
      req ? clientIp(req) : null,
    ]
  );
}

async function fetchFresh(phone, openid, req, ps) {
  const provider = await providers.current();
  let list;
  try {
    list = await provider.query(phone, ps);
  } catch (e) {
    e.status = e.status || 502;
    e.expose = true;
    if (!String(e.message || '').startsWith('标记查询服务暂时不可用')) {
      e.message = '标记查询服务暂时不可用：' + e.message;
    }
    throw e;
  }
  list = attachAppeal(list, ps);
  const markCount = list.filter((x) => x.marked).length;

  await db.query(
    'INSERT INTO mark_query (phone, openid, mark_count, result_json, provider, ip) VALUES (?,?,?,?,?,?)',
    [phone, openid, markCount, JSON.stringify(list), provider.name, req ? clientIp(req) : null]
  );

  return { markCount, list, provider: provider.name, cached: false };
}

/**
 * 查询号码标记（带缓存 + 同号请求合并）
 * @param {object} [opts]
 * @param {boolean} [opts.force] 强制绕过缓存
 * @param {Function} [opts.beforeFetch] 真正请求上游前调用（用于限流，缓存命中不触发）
 */
async function queryMark(phone, openid = null, req = null, opts = {}) {
  const ps = await platforms();
  const ttl = await conf.num('query_cache_ttl', 1800); // 默认 30 分钟
  const force = !!opts.force;

  if (!force) {
    const cached = await loadCache(phone, ttl);
    if (cached) {
      const list = attachAppeal(cached.list, ps);
      await logCacheHit(phone, openid, req, cached, list);
      return { markCount: cached.markCount, list, provider: cached.provider, cached: true };
    }
  }

  if (inflight.has(phone)) {
    return inflight.get(phone);
  }

  if (typeof opts.beforeFetch === 'function') {
    await opts.beforeFetch();
  }

  const job = fetchFresh(phone, openid, req, ps).finally(() => {
    inflight.delete(phone);
  });
  inflight.set(phone, job);
  return job;
}

module.exports = { platforms, queryMark, loadCache };
