const axios = require('axios');
const crypto = require('crypto');
const cfg = require('../config');

/* ---------------- access_token / jsapi_ticket 缓存 ---------------- */
const cache = { token: { v: '', exp: 0 }, ticket: { v: '', exp: 0 } };

async function getAccessToken() {
  if (cache.token.v && Date.now() < cache.token.exp) return cache.token.v;
  const { data } = await axios.get('https://api.weixin.qq.com/cgi-bin/token', {
    params: { grant_type: 'client_credential', appid: cfg.wx.appid, secret: cfg.wx.secret },
    timeout: 10000,
  });
  if (!data.access_token) throw new Error('获取公众号 access_token 失败: ' + JSON.stringify(data));
  cache.token = { v: data.access_token, exp: Date.now() + (data.expires_in - 300) * 1000 };
  return data.access_token;
}

async function getJsapiTicket() {
  if (cache.ticket.v && Date.now() < cache.ticket.exp) return cache.ticket.v;
  const token = await getAccessToken();
  const { data } = await axios.get('https://api.weixin.qq.com/cgi-bin/ticket/getticket', {
    params: { access_token: token, type: 'jsapi' },
    timeout: 10000,
  });
  if (!data.ticket) throw new Error('获取 jsapi_ticket 失败: ' + JSON.stringify(data));
  cache.ticket = { v: data.ticket, exp: Date.now() + (data.expires_in - 300) * 1000 };
  return data.ticket;
}

/* ---------------- 网页授权 ---------------- */
function authorizeUrl(redirectUri, state = '', scope = 'snsapi_base') {
  const p = new URLSearchParams({
    appid: cfg.wx.appid,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope,
    state: state || 'h5mark',
  });
  return `https://open.weixin.qq.com/connect/oauth2/authorize?${p.toString()}#wechat_redirect`;
}

async function codeToSession(code) {
  const { data } = await axios.get('https://api.weixin.qq.com/sns/oauth2/access_token', {
    params: { appid: cfg.wx.appid, secret: cfg.wx.secret, code, grant_type: 'authorization_code' },
    timeout: 10000,
  });
  if (!data.openid) throw new Error('微信授权失败: ' + JSON.stringify(data));
  return data; // { access_token, openid, scope, unionid? }
}

/** scope=snsapi_userinfo 时可拉取昵称头像 */
async function getUserInfoByOauth(accessToken, openid) {
  const { data } = await axios.get('https://api.weixin.qq.com/sns/userinfo', {
    params: { access_token: accessToken, openid, lang: 'zh_CN' },
    timeout: 10000,
  });
  return data;
}

/* ---------------- JS-SDK 签名 ---------------- */
async function jsSdkConfig(url) {
  const ticket = await getJsapiTicket();
  const nonceStr = crypto.randomBytes(8).toString('hex');
  const timestamp = Math.floor(Date.now() / 1000);
  const raw = `jsapi_ticket=${ticket}&noncestr=${nonceStr}&timestamp=${timestamp}&url=${url}`;
  const signature = crypto.createHash('sha1').update(raw).digest('hex');
  return { appId: cfg.wx.appid, timestamp, nonceStr, signature };
}

module.exports = {
  getAccessToken, getJsapiTicket, authorizeUrl, codeToSession,
  getUserInfoByOauth, jsSdkConfig,
};
