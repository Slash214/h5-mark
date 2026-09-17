const axios = require('axios');
const conf = require('../services/config.service');

/**
 * 通用第三方 HTTP 接口适配器。
 * 后台「数据源配置」里填好 provider_url / provider_key 即可启用，无需改代码。
 *
 * 期望第三方返回下面任意一种结构，本适配器都能解析：
 *   A: { code:0, data:[ {platform:'360', marked:true, tag:'骚扰电话'}, ... ] }
 *   B: { code:0, data:{ '360':'骚扰电话', 'baidu':'' } }
 *   C: { code:0, data:{ marks:[{name:'360',type:'骚扰电话'}] } }
 * 如果你拿到的接口结构不一样，只需要改下面的 normalize() 函数。
 */
function normalize(raw, platforms) {
  const map = {};
  const put = (key, tag, marked) => {
    if (!key) return;
    const k = String(key).toLowerCase();
    map[k] = { marked: marked !== undefined ? !!marked : !!tag, tag: tag || '' };
  };

  const data = raw && raw.data !== undefined ? raw.data : raw;

  if (Array.isArray(data)) {
    data.forEach((it) => put(it.platform || it.code || it.name || it.source, it.tag || it.type || it.label, it.marked));
  } else if (data && Array.isArray(data.marks)) {
    data.marks.forEach((it) => put(it.platform || it.code || it.name, it.tag || it.type, it.marked));
  } else if (data && typeof data === 'object') {
    Object.entries(data).forEach(([k, v]) => {
      if (v && typeof v === 'object') put(k, v.tag || v.type, v.marked);
      else put(k, v);
    });
  }

  return platforms.map((p) => {
    const hit = map[p.code.toLowerCase()] || map[p.name.toLowerCase()] || null;
    return {
      code: p.code,
      name: p.name,
      marked: hit ? !!hit.marked : false,
      tag: hit ? hit.tag : '',
      count: 0,
    };
  });
}

module.exports = {
  name: 'http',
  async query(phone, platforms) {
    const c = await conf.all();
    const url = c.provider_url;
    if (!url) throw Object.assign(new Error('未配置第三方查询接口地址'), { status: 500 });

    const method = (c.provider_method || 'GET').toUpperCase();
    const phoneField = c.provider_phone_field || 'mobile';
    const keyField = c.provider_key_field || 'key';
    const params = { [phoneField]: phone };
    if (c.provider_key) params[keyField] = c.provider_key;

    const res = method === 'POST'
      ? await axios.post(url, params, { timeout: 15000 })
      : await axios.get(url, { params, timeout: 15000 });

    return normalize(res.data, platforms);
  },
  normalize,
};
