const db = require('../db');
const providers = require('../providers');
const { clientIp } = require('../utils/helper');

async function platforms() {
  return db.query(
    'SELECT code,name,short,color,icon,appeal_url FROM mark_platform WHERE enabled=1 ORDER BY sort ASC, id ASC'
  );
}

/**
 * 查询号码标记
 * @returns {{markCount:number, list:Array, provider:string}}
 */
async function queryMark(phone, openid = null, req = null) {
  const ps = await platforms();
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
  // 统一补齐解标跳转地址（来自平台字典）
  const urlMap = Object.fromEntries(ps.map((p) => [p.code, p.appeal_url || '']));
  list = (list || []).map((item) => ({
    ...item,
    appealUrl: item.appealUrl || urlMap[item.code] || '',
  }));
  const markCount = list.filter((x) => x.marked).length;

  await db.query(
    'INSERT INTO mark_query (phone, openid, mark_count, result_json, provider, ip) VALUES (?,?,?,?,?,?)',
    [phone, openid, markCount, JSON.stringify(list), provider.name, req ? clientIp(req) : null]
  );

  return { markCount, list, provider: provider.name };
}

module.exports = { platforms, queryMark };
