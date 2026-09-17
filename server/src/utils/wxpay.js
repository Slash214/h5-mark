/**
 * 微信支付 V3 —— JSAPI 下单 / 签名 / 回调验签解密
 * 仅依赖 node 内置 crypto + axios，无第三方 SDK。
 * 文档: https://pay.weixin.qq.com/docs/merchant/apis/jsapi-payment/direct-jsons/jsapi-prepay.html
 */
const fs = require('fs');
const crypto = require('crypto');
const axios = require('axios');
const cfg = require('../config');

const BASE = 'https://api.mch.weixin.qq.com';

let privateKey = null;
function getPrivateKey() {
  if (privateKey) return privateKey;
  if (!fs.existsSync(cfg.wxpay.privateKeyPath)) {
    throw new Error('商户私钥文件不存在: ' + cfg.wxpay.privateKeyPath);
  }
  privateKey = fs.readFileSync(cfg.wxpay.privateKeyPath, 'utf8');
  return privateKey;
}

function rsaSign(message) {
  return crypto.createSign('RSA-SHA256').update(message).sign(getPrivateKey(), 'base64');
}

/** 构造 Authorization 头 */
function authorization(method, urlPath, body) {
  const nonceStr = crypto.randomBytes(16).toString('hex').toUpperCase();
  const timestamp = Math.floor(Date.now() / 1000);
  const message = `${method}\n${urlPath}\n${timestamp}\n${nonceStr}\n${body}\n`;
  const signature = rsaSign(message);
  return `WECHATPAY2-SHA256-RSA2048 mchid="${cfg.wxpay.mchid}",nonce_str="${nonceStr}",signature="${signature}",timestamp="${timestamp}",serial_no="${cfg.wxpay.serialNo}"`;
}

async function request(method, urlPath, data) {
  const body = method === 'GET' ? '' : JSON.stringify(data || {});
  const headers = {
    Authorization: authorization(method, urlPath, body),
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

/**
 * JSAPI 下单
 * @returns {Promise<{prepay_id:string}>}
 */
async function jsapiPrepay({ description, outTradeNo, amountFen, openid, attach, notifyUrl }) {
  return request('POST', '/v3/pay/transactions/jsapi', {
    appid: cfg.wx.appid,
    mchid: cfg.wxpay.mchid,
    description,
    out_trade_no: outTradeNo,
    notify_url: notifyUrl || cfg.wxpay.notifyUrl,
    attach: attach || '',
    amount: { total: amountFen, currency: 'CNY' },
    payer: { openid },
  });
}

/** 给前端 wx.chooseWXPay 用的参数（需再次签名） */
function buildJsapiParams(prepayId) {
  const timeStamp = String(Math.floor(Date.now() / 1000));
  const nonceStr = crypto.randomBytes(16).toString('hex');
  const pkg = `prepay_id=${prepayId}`;
  const message = `${cfg.wx.appid}\n${timeStamp}\n${nonceStr}\n${pkg}\n`;
  return {
    appId: cfg.wx.appid,
    timeStamp,
    nonceStr,
    package: pkg,
    signType: 'RSA',
    paySign: rsaSign(message),
  };
}

/** 按商户订单号查订单 */
async function queryByOutTradeNo(outTradeNo) {
  const p = `/v3/pay/transactions/out-trade-no/${outTradeNo}?mchid=${cfg.wxpay.mchid}`;
  return request('GET', p);
}

/** 关闭订单 */
async function closeOrder(outTradeNo) {
  return request('POST', `/v3/pay/transactions/out-trade-no/${outTradeNo}/close`, { mchid: cfg.wxpay.mchid });
}

/** AES-256-GCM 解密回调 resource */
function decryptResource(resource) {
  const { ciphertext, associated_data: aad = '', nonce } = resource;
  const key = Buffer.from(cfg.wxpay.apiV3Key, 'utf8');
  const buf = Buffer.from(ciphertext, 'base64');
  const authTag = buf.slice(buf.length - 16);
  const data = buf.slice(0, buf.length - 16);
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(nonce, 'utf8'));
  decipher.setAuthTag(authTag);
  decipher.setAAD(Buffer.from(aad, 'utf8'));
  return JSON.parse(Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8'));
}

/* ---------------- 回调验签（平台证书） ---------------- */
let platformCerts = null;   // { serialNo: pem }
let certsAt = 0;

async function loadPlatformCerts() {
  if (platformCerts && Date.now() - certsAt < 12 * 3600 * 1000) return platformCerts;
  const data = await request('GET', '/v3/certificates');
  // 证书解密出来是 PEM 字符串（不是 JSON），所以这里单独解密，不复用 decryptResource
  platformCerts = {};
  (data.data || []).forEach((c) => {
    const { ciphertext, associated_data: aad = '', nonce } = c.encrypt_certificate;
    const key = Buffer.from(cfg.wxpay.apiV3Key, 'utf8');
    const buf = Buffer.from(ciphertext, 'base64');
    const authTag = buf.slice(buf.length - 16);
    const body = buf.slice(0, buf.length - 16);
    const d = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(nonce, 'utf8'));
    d.setAuthTag(authTag);
    d.setAAD(Buffer.from(aad, 'utf8'));
    platformCerts[c.serial_no] = Buffer.concat([d.update(body), d.final()]).toString('utf8');
  });
  certsAt = Date.now();
  return platformCerts;
}

/**
 * 校验微信回调签名
 * @param {object} headers 原始请求头
 * @param {string} rawBody 原始请求体字符串
 */
async function verifyNotify(headers, rawBody) {
  const ts = headers['wechatpay-timestamp'];
  const nonce = headers['wechatpay-nonce'];
  const signature = headers['wechatpay-signature'];
  const serial = headers['wechatpay-serial'];
  if (!ts || !nonce || !signature || !serial) return false;
  // 时间戳偏差超过 5 分钟直接拒绝（防重放）
  if (Math.abs(Date.now() / 1000 - Number(ts)) > 300) return false;

  const certs = await loadPlatformCerts();
  const pem = certs[serial];
  if (!pem) return false;
  const message = `${ts}\n${nonce}\n${rawBody}\n`;
  return crypto.createVerify('RSA-SHA256').update(message).verify(pem, signature, 'base64');
}

module.exports = {
  jsapiPrepay, buildJsapiParams, queryByOutTradeNo, closeOrder,
  decryptResource, verifyNotify, loadPlatformCerts, rsaSign,
};
