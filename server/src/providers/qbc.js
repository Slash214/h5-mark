const axios = require('axios');
const conf = require('../services/config.service');

/** 默认查询地址（可在后台改） */
const DEFAULT_URL = 'http://175.24.191.201/api/query.php';

/**
 * 第三方 detail 字段名 → 本系统 mark_platform.code
 */
const KEY_TO_CODE = {
  teddymobile: 'teddy',
  dianhua360: '360',
  baidu: 'baidu',
  tencent: 'tencent',
  dianhua: 'dianhuabang',
  sogou: 'sogou',
  xiaomi: 'xiaomi',
  mobile_high_frequency: 'cmcc',
  unicom: 'unicom',
};

/** 明确表示「无标记 / 不可用」的文案 */
const CLEAN_INFO = /^(无|该号码暂无标记|暂无标记|未标记|无标记|平台维护中|查询失败|超时)?$/;

/**
 * status 约定（实测）：
 *   1 = 被标记（info 为标签文案）
 *   2 = 未标记
 *   0 = 平台维护中 / 不可用（不算标记）
 */
function parseDetail(item) {
  if (!item || typeof item !== 'object') {
    return { marked: false, tag: '', count: 0 };
  }
  const status = Number(item.status);
  const info = String(item.info || '').trim();

  if (status === 1) {
    return {
      marked: true,
      tag: info && !CLEAN_INFO.test(info) ? info : '已被标记',
      count: Number(item.count) || 0,
    };
  }

  // 兼容：个别渠道可能用非 1/2 表示有标记，靠 info 兜底
  if (status !== 0 && status !== 2 && info && !CLEAN_INFO.test(info)) {
    return { marked: true, tag: info, count: Number(item.count) || 0 };
  }

  return { marked: false, tag: '', count: 0 };
}

function normalize(raw, platforms) {
  if (!raw || Number(raw.code) !== 0) {
    const msg = (raw && (raw.msg || raw.message)) || '标记查询接口返回异常';
    const err = new Error(msg);
    err.status = 502;
    err.expose = true;
    throw err;
  }

  const detail = (raw.data && raw.data.mark && raw.data.mark.detail) || {};
  const byCode = {};

  for (const [key, item] of Object.entries(detail)) {
    const code = KEY_TO_CODE[key] || key;
    byCode[code] = parseDetail(item);
  }

  return platforms.map((p) => {
    const hit = byCode[p.code] || { marked: false, tag: '', count: 0 };
    return {
      code: p.code,
      name: p.name,
      marked: !!hit.marked,
      tag: hit.tag || '',
      count: hit.count || 0,
      appealUrl: p.appeal_url || p.appealUrl || '',
    };
  });
}

module.exports = {
  name: 'qbc',
  DEFAULT_URL,
  KEY_TO_CODE,
  normalize,
  async query(phone, platforms) {
    const c = await conf.all();
    const apiKey = (c.provider_key || '').trim();
    if (!apiKey) {
      throw Object.assign(new Error('未配置查询接口 api_key（后台 → 系统配置 → 数据源）'), {
        status: 500,
        expose: true,
      });
    }

    const url = (c.provider_url || '').trim() || DEFAULT_URL;
    let res;
    try {
      // 第三方聚合查询较慢，实测可达 20~30s
      res = await axios.get(url, {
        params: { api_key: apiKey, phone },
        timeout: 60000,
        validateStatus: () => true,
      });
    } catch (e) {
      const err = new Error(e.message || '网络错误');
      err.status = 502;
      err.expose = true;
      throw err;
    }

    return normalize(res.data, platforms);
  },
};
