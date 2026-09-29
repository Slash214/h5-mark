/**
 * 微信支付 V3 —— JSAPI 下单 / 签名 / 回调验签解密
 * 商户参数优先读后台配置（sys_config），便于模板多商户切换。
 */
const fs = require('fs');
const crypto = require('crypto');
const axios = require('axios');
const wxcfg = require('../services/wxcfg.service');

const BASE = 'https://api.mch.weixin.qq.com';

let privateKeyCache = { pem: '', fingerprint: '' };
let platformCerts = null;
let certsAt = 0;
let certsMchid = '';

function resetCache() {
  privateKeyCache = { pem: '', fingerprint: '' };
  platformCerts = null;
  certsAt = 0;
  certsMchid = '';
}
wxcfg.onChange(resetCache);

async function getPayCfg() {
  const wx = await wxcfg.wx();
  const pay = await wxcfg.wxpay();
  if (!wx.appid) throw new Error('未配置公众号 AppID（后台 → 微信支付）');
  if (!pay.mchid) throw new Error('未配置微信支付商户号 mchid');
  if (!pay.serialNo) throw new Error('未配置商户 API 证书序列号');
  if (!pay.apiV3Key) throw new Error('未配置 APIv3 密钥');
  return { wx, pay };
}

async function getPrivateKey(pay) {
  const fingerprint = pay.privateKeyPem
    ? 'pem:' + pay.privateKeyPem.slice(0, 64)
    : 'path:' + pay.privateKeyPath;
  if (privateKeyCache.pem && privateKeyCache.fingerprint === fingerprint) {
    return privateKeyCache.pem;
  }

  let pem = pay.privateKeyPem;
  if (!pem) {
    if (!pay.privateKeyPath || !fs.existsSync(pay.privateKeyPath)) {
      throw new Error('未配置商户私钥：请在后台粘贴 apiclient_key.pem 内容，或在服务器放置证书文件');
    }
    pem = fs.readFileSync(pay.privateKeyPath, 'utf8');
  }
  if (!pem.includes('PRIVATE KEY')) {
    throw new Error('商户私钥格式不正确，需为 PEM（含 BEGIN PRIVATE KEY）');
  }
  privateKeyCache = { pem, fingerprint };
  return pem;
}

function rsaSign(message, pem) {
  return crypto.createSign('RSA-SHA256').update(message).sign(pem, 'base64');
}

async function authorization(method, urlPath, body, pay, pem) {
  const nonceStr = crypto.randomBytes(16).toString('hex').toUpperCase();
  const timestamp = Math.floor(Date.now() / 1000);
  const message = `${method}\n${urlPath}\n${timestamp}\n${nonceStr}\n${body}\n`;
  const signature = rsaSign(message, pem);
  return `WECHATPAY2-SHA256-RSA2048 mchid="${pay.mchid}",nonce_str="${nonceStr}",signature="${signature}",timestamp="${timestamp}",serial_no="${pay.serialNo}"`;
}

async function request(method, urlPath, data) {
  const { pay } = await getPayCfg();
  const pem = await getPrivateKey(pay);
  const body = method === 'GET' ? '' : JSON.stringify(data || {});
  const headers = {
    Authorization: await authorization(method, urlPath, body, pay, pem),
    Accept: 'application/json',
    'Content-Type': 'application/json',
    'User-Agent': 'h5-mark/1.0',
  };
  const res = await axios({
    method, url: BASE + urlPath, data: method === 'GET' ? undefined : data,
    headers, timeout: 15000, validateStatus: () => true,
  });
  if (res.status >= 400) {
    const e = new Error(`微信支付接口错误(${res.status}): ${res.data && (res.data.message || JSON.stringify(res.data))}`);
    e.status = 500;
    e.wxpay = res.data;
    throw e;
  }
  return res.data;
}

async function jsapiPrepay({ description, outTradeNo, amountFen, openid, attach, notifyUrl }) {
  const { wx, pay } = await getPayCfg();
  const notify = notifyUrl || pay.notifyUrl;
  if (!notify) throw new Error('未配置支付回调地址 WXPAY_NOTIFY_URL / 后台 wxpay_notify_url');
  return request('POST', '/v3/pay/transactions/jsapi', {
    appid: wx.appid,
    mchid: pay.mchid,
    description,
    out_trade_no: outTradeNo,
    notify_url: notify,
    attach: attach || '',
    amount: { total: amountFen, currency: 'CNY' },
    payer: { openid },
  });
}

async function buildJsapiParams(prepayId) {
  const { wx, pay } = await getPayCfg();
  const pem = await getPrivateKey(pay);
  const timeStamp = String(Math.floor(Date.now() / 1000));
  const nonceStr = crypto.randomBytes(16).toString('hex');
  const pkg = `prepay_id=${prepayId}`;
  const message = `${wx.appid}\n${timeStamp}\n${nonceStr}\n${pkg}\n`;
  return {
    appId: wx.appid,
    timeStamp,
    nonceStr,
    package: pkg,
    signType: 'RSA',
    paySign: rsaSign(message, pem),
  };
}

async function queryByOutTradeNo(outTradeNo) {
  const { pay } = await getPayCfg();
  const p = `/v3/pay/transactions/out-trade-no/${outTradeNo}?mchid=${pay.mchid}`;
  return request('GET', p);
}

async function closeOrder(outTradeNo) {
  const { pay } = await getPayCfg();
  return request('POST', `/v3/pay/transactions/out-trade-no/${outTradeNo}/close`, { mchid: pay.mchid });
}

async function decryptResource(resource) {
  const { pay } = await getPayCfg();
  const { ciphertext, associated_data: aad = '', nonce } = resource;
  const key = Buffer.from(pay.apiV3Key, 'utf8');
  const buf = Buffer.from(ciphertext, 'base64');
  const authTag = buf.slice(buf.length - 16);
  const data = buf.slice(0, buf.length - 16);
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(nonce, 'utf8'));
  decipher.setAuthTag(authTag);
  decipher.setAAD(Buffer.from(aad, 'utf8'));
  return JSON.parse(Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8'));
}

async function loadPlatformCerts() {
  const { pay } = await getPayCfg();
  if (platformCerts && certsMchid === pay.mchid && Date.now() - certsAt < 12 * 3600 * 1000) {
    return platformCerts;
  }
  const data = await request('GET', '/v3/certificates');
  platformCerts = {};
  (data.data || []).forEach((c) => {
    const { ciphertext, associated_data: aad = '', nonce } = c.encrypt_certificate;
    const key = Buffer.from(pay.apiV3Key, 'utf8');
    const buf = Buffer.from(ciphertext, 'base64');
    const authTag = buf.slice(buf.length - 16);
    const body = buf.slice(0, buf.length - 16);
    const d = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(nonce, 'utf8'));
    d.setAuthTag(authTag);
    d.setAAD(Buffer.from(aad, 'utf8'));
    platformCerts[c.serial_no] = Buffer.concat([d.update(body), d.final()]).toString('utf8');
  });
  certsAt = Date.now();
  certsMchid = pay.mchid;
  return platformCerts;
}

async function verifyNotify(headers, rawBody) {
  const ts = headers['wechatpay-timestamp'];
  const nonce = headers['wechatpay-nonce'];
  const signature = headers['wechatpay-signature'];
  const serial = headers['wechatpay-serial'];
  if (!ts || !nonce || !signature || !serial) return false;
  if (Math.abs(Date.now() / 1000 - Number(ts)) > 300) return false;

  const certs = await loadPlatformCerts();
  const pem = certs[serial];
  if (!pem) return false;
  const message = `${ts}\n${nonce}\n${rawBody}\n`;
  return crypto.createVerify('RSA-SHA256').update(message).verify(pem, signature, 'base64');
}

module.exports = {
  jsapiPrepay, buildJsapiParams, queryByOutTradeNo, closeOrder,
  decryptResource, verifyNotify, loadPlatformCerts, resetCache,
};
