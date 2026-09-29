const axios = require('axios');
const crypto = require('crypto');
const wxcfg = require('../services/wxcfg.service');

/* ---------------- access_token / jsapi_ticket 缓存 ---------------- */
const cache = { token: { v: '', exp: 0, appid: '' }, ticket: { v: '', exp: 0, appid: '' } };

function resetCache() {
  cache.token = { v: '', exp: 0, appid: '' };
  cache.ticket = { v: '', exp: 0, appid: '' };
}
wxcfg.onChange(resetCache);

async function getAccessToken() {
  const { appid, secret } = await wxcfg.wx();
  if (!appid || !secret) throw new Error('未配置公众号 AppID / AppSecret（后台 → 系统配置 → 微信支付）');

  if (cache.token.v && cache.token.appid === appid && Date.now() < cache.token.exp) {
    return cache.token.v;
  }
  const { data } = await axios.get('https://api.weixin.qq.com/cgi-bin/token', {
    params: { grant_type: 'client_credential', appid, secret },
    timeout: 10000,
  });
  if (!data.access_token) throw new Error('获取公众号 access_token 失败: ' + JSON.stringify(data));
  cache.token = { v: data.access_token, exp: Date.now() + (data.expires_in - 300) * 1000, appid };
  return data.access_token;
}

async function getJsapiTicket() {
  const { appid } = await wxcfg.wx();
  if (cache.ticket.v && cache.ticket.appid === appid && Date.now() < cache.ticket.exp) {
    return cache.ticket.v;
  }
  const token = await getAccessToken();
  const { data } = await axios.get('https://api.weixin.qq.com/cgi-bin/ticket/getticket', {
    params: { access_token: token, type: 'jsapi' },
    timeout: 10000,
  });
  if (!data.ticket) throw new Error('获取 jsapi_ticket 失败: ' + JSON.stringify(data));
  cache.ticket = { v: data.ticket, exp: Date.now() + (data.expires_in - 300) * 1000, appid };
  return data.ticket;
}

/* ---------------- 网页授权 ---------------- */
async function authorizeUrl(redirectUri, state = '', scope = 'snsapi_base') {
  const { appid } = await wxcfg.wx();
  if (!appid) throw new Error('未配置公众号 AppID');
  const p = new URLSearchParams({
    appid,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope,
    state: state || 'h5mark',
  });
  return `https://open.weixin.qq.com/connect/oauth2/authorize?${p.toString()}#wechat_redirect`;
}

async function codeToSession(code) {
  const { appid, secret } = await wxcfg.wx();
  const { data } = await axios.get('https://api.weixin.qq.com/sns/oauth2/access_token', {
    params: { appid, secret, code, grant_type: 'authorization_code' },
    timeout: 10000,
  });
  if (!data.openid) throw new Error('微信授权失败: ' + JSON.stringify(data));
  return data;
}

async function getUserInfoByOauth(accessToken, openid) {
  const { data } = await axios.get('https://api.weixin.qq.com/sns/userinfo', {
    params: { access_token: accessToken, openid, lang: 'zh_CN' },
    timeout: 10000,
  });
  return data;
}

async function jsSdkConfig(url) {
  const { appid } = await wxcfg.wx();
  const ticket = await getJsapiTicket();
  const nonceStr = crypto.randomBytes(8).toString('hex');
  const timestamp = Math.floor(Date.now() / 1000);
  const raw = `jsapi_ticket=${ticket}&noncestr=${nonceStr}&timestamp=${timestamp}&url=${url}`;
  const signature = crypto.createHash('sha1').update(raw).digest('hex');
  return { appId: appid, timestamp, nonceStr, signature };
}

module.exports = {
  getAccessToken, getJsapiTicket, authorizeUrl, codeToSession,
  getUserInfoByOauth, jsSdkConfig, resetCache,
};
