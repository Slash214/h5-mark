const conf = require('./config.service');
const env = require('../config');

/**
 * 微信 / 支付 / 站点 —— 优先读后台 sys_config，空则回退 .env
 * 模板多商户：每个客户库里各自配一套即可，无需改代码。
 */

const KEYS = {
  site_url: 'site_url',
  wx_appid: 'wx_appid',
  wx_appsecret: 'wx_appsecret',
  wxpay_mchid: 'wxpay_mchid',
  wxpay_serial_no: 'wxpay_serial_no',
  wxpay_api_v3_key: 'wxpay_api_v3_key',
  wxpay_notify_url: 'wxpay_notify_url',
  wxpay_private_key: 'wxpay_private_key', // PEM 正文（优先）
};

async function pick(dbKey, envVal = '') {
  const v = String(await conf.get(dbKey, '') || '').trim();
  if (v) return v;
  return String(envVal || '').trim();
}

async function siteUrl() {
  const u = await pick(KEYS.site_url, env.siteUrl);
  return u.replace(/\/$/, '');
}

async function wx() {
  return {
    appid: await pick(KEYS.wx_appid, env.wx.appid),
    secret: await pick(KEYS.wx_appsecret, env.wx.secret),
  };
}

async function wxpay() {
  const pem = await pick(KEYS.wxpay_private_key, '');
  return {
    mchid: await pick(KEYS.wxpay_mchid, env.wxpay.mchid),
    serialNo: await pick(KEYS.wxpay_serial_no, env.wxpay.serialNo),
    apiV3Key: await pick(KEYS.wxpay_api_v3_key, env.wxpay.apiV3Key),
    notifyUrl: await pick(KEYS.wxpay_notify_url, env.wxpay.notifyUrl),
    privateKeyPem: pem,
    privateKeyPath: env.wxpay.privateKeyPath,
  };
}

/** 后台保存微信相关项后调用，清掉 token / 证书缓存 */
const listeners = [];
function onChange(fn) { listeners.push(fn); }
function notifyChange() { listeners.forEach((fn) => { try { fn(); } catch (e) { /* */ } }); }

module.exports = {
  KEYS, siteUrl, wx, wxpay, pick, onChange, notifyChange,
  // 方便单独读
  async get(key) { return conf.get(key, ''); },
};
