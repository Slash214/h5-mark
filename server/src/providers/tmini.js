const axios = require('axios');
const conf = require('../services/config.service');

/** tmini 号码标记查询固定地址（勿改域名路径） */
const DEFAULT_URL = 'http://api.tmini.net/apis/checkmark';

/**
 * 第三方平台名 → 本系统 mark_platform.code
 * API 返回的 platform 字段多为中文全称，需做别名映射
 */
const NAME_TO_CODE = {
  腾讯手机管家: 'tencent',
  腾讯: 'tencent',
  '360手机卫士': '360',
  '360': '360',
  泰迪熊: 'teddy',
  百度: 'baidu',
  联通: 'unicom',
  移动: 'cmcc',
  移动高频: 'cmcc',
  电话邦: 'dianhuabang',
  搜狗: 'sogou',
  搜狗号码通: 'sogou',
  小米: 'xiaomi',
  百事通: 'bestone',
};

/**
 * 将单条 API result 转为内部标记结构
 * status: 认证 | 被标记 | 未标记
 * 「认证」不算需清除的标记，仅附带认证名称供展示
 */
function parseItem(item) {
  const status = String(item.status || '').trim();
  const tags = Array.isArray(item.tags) ? item.tags : [];
  const primary = tags[0] || null;

  if (status === '被标记') {
    const tagNames = tags.map((t) => t.name).filter(Boolean);
    const count = tags.reduce((sum, t) => sum + (Number(t.count) || 0), 0);
    return {
      marked: true,
      tag: tagNames.join('、') || '已被标记',
      count: count || (primary && primary.count) || 0,
      certified: false,
      certifyName: '',
    };
  }

  if (status === '认证') {
    return {
      marked: false,
      tag: item.name ? `认证：${item.name}` : '官方认证',
      count: 0,
      certified: true,
      certifyName: item.name || '',
    };
  }

  // 未标记 / 其他
  return {
    marked: false,
    tag: '',
    count: 0,
    certified: false,
    certifyName: '',
  };
}

function resolveCode(platformName, platforms) {
  const name = String(platformName || '').trim();
  if (!name) return null;
  if (NAME_TO_CODE[name]) return NAME_TO_CODE[name];

  const lower = name.toLowerCase();
  const byDb = platforms.find(
    (p) => p.code.toLowerCase() === lower
      || p.name === name
      || name.includes(p.name)
      || p.name.includes(name)
  );
  return byDb ? byDb.code : null;
}

/**
 * @param {object} raw API 原始响应
 * @param {Array} platforms 本系统启用中的平台
 */
function normalize(raw, platforms) {
  if (!raw || Number(raw.code) !== 200) {
    const msg = (raw && (raw.msg || raw.message)) || '标记查询接口返回异常';
    const err = new Error(msg);
    err.status = 502;
    err.expose = true;
    err.errcode = raw && raw.errcode;
    throw err;
  }

  const byCode = {};
  for (const item of raw.results || []) {
    const code = resolveCode(item.platform, platforms);
    if (!code) continue;
    byCode[code] = parseItem(item);
  }

  return platforms.map((p) => {
    const hit = byCode[p.code] || { marked: false, tag: '', count: 0 };
    return {
      code: p.code,
      name: p.name,
      marked: !!hit.marked,
      tag: hit.tag || '',
      count: hit.count || 0,
      certified: !!hit.certified,
      certifyName: hit.certifyName || '',
    };
  });
}

module.exports = {
  name: 'tmini',
  DEFAULT_URL,
  normalize,
  async query(phone, platforms) {
    const c = await conf.all();
    const key = (c.provider_key || '').trim();
    if (!key) {
      throw Object.assign(new Error('未配置 tmini 接口密钥（后台 → 系统配置 → 数据源）'), {
        status: 500,
        expose: true,
      });
    }

    const url = (c.provider_url || '').trim() || DEFAULT_URL;
    let res;
    try {
      res = await axios.get(url, {
        params: { key, phone },
        timeout: 15000,
        // 部分环境对 http API 无代理需求；失败信息交 normalize / 外层处理
        validateStatus: () => true,
      });
    } catch (e) {
      const err = new Error('标记查询服务暂时不可用：' + (e.message || '网络错误'));
      err.status = 502;
      err.expose = true;
      throw err;
    }

    return normalize(res.data, platforms);
  },
};
