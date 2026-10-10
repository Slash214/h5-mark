const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const load = require('./helpers.cjs');
const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
const pay = { mchid: 'merchant', serialNo: 'serial', apiV3Key: '12345678901234567890123456789012', publicKeyId: 'PUB_KEY_ID_TEST', publicKeyPem: publicKey.export({ type: 'spki', format: 'pem' }), privateKeyPem: privateKey.export({ type: 'pkcs8', format: 'pem' }) };
const wxcfg = { wx: async () => ({ appid: 'appid' }), wxpay: async () => pay, onChange() {} };
const wxpay = load('src/utils/wxpay.js', { '../services/wxcfg.service': wxcfg, axios: async () => { throw new Error('Unexpected external request'); } });

test('JSAPI parameters have a valid RSA signature', async () => {
  const p = await wxpay.buildJsapiParams('prepay-test');
  assert.equal(p.signType, 'RSA');
  assert.equal(p.package, 'prepay_id=prepay-test');
  assert.equal(crypto.verify('RSA-SHA256', Buffer.from(`${p.appId}\n${p.timeStamp}\n${p.nonceStr}\n${p.package}\n`), publicKey, Buffer.from(p.paySign, 'base64')), true);
});

test('public key verification accepts signed bytes and rejects tampering, wrong ID and timestamps', async () => {
  const ts = String(Math.floor(Date.now() / 1000));
  const body = '{"trade_state":"SUCCESS"}';
  const headers = { 'wechatpay-timestamp': ts, 'wechatpay-nonce': 'nonce', 'wechatpay-serial': pay.publicKeyId, 'wechatpay-signature': crypto.sign('RSA-SHA256', Buffer.from(`${ts}\nnonce\n${body}\n`), privateKey).toString('base64') };
  assert.equal(await wxpay.verifyNotify(headers, body), true);
  assert.equal(await wxpay.verifyNotify(headers, body + ' '), false);
  assert.equal(await wxpay.verifyNotify({ ...headers, 'wechatpay-serial': 'PUB_KEY_ID_OTHER' }, body), false);
  for (const timestamp of ['NaN', '0']) assert.equal(await wxpay.verifyNotify({ ...headers, 'wechatpay-timestamp': timestamp }, body), false);
});

test('AES-GCM notification decryption authenticates ciphertext', async () => {
  const nonce = '123456789012';
  const cipher = crypto.createCipheriv('aes-256-gcm', Buffer.from(pay.apiV3Key), Buffer.from(nonce));
  cipher.setAAD(Buffer.from('transaction'));
  const ciphertext = Buffer.concat([cipher.update('{"trade_state":"SUCCESS"}'), cipher.final(), cipher.getAuthTag()]).toString('base64');
  assert.deepEqual(await wxpay.decryptResource({ ciphertext, nonce, associated_data: 'transaction' }), { trade_state: 'SUCCESS' });
  await assert.rejects(wxpay.decryptResource({ ciphertext, nonce, associated_data: 'wrong' }));
});

function orderFixture() {
  let grants = 0;
  const order = { id: 1, order_no: 'ORDER', openid: 'payer', phone: '13800138000', days: 30, amount: 990, status: 0 };
  const conn = { execute: async (sql) => {
    if (sql.startsWith('SELECT')) return [[order]];
    order.status = 1;
    return [{}];
  } };
  const svc = load('src/services/order.service.js', {
    '../db': { tx: (fn) => fn(conn), one: async () => order },
    '../config': { dev: { fakePay: false } },
    './config.service': {}, './member.service': { grant: async () => { grants++; return '2099-01-01'; } },
    '../utils/wxpay': {}, './wxcfg.service': wxcfg,
  });
  const data = { trade_state: 'SUCCESS', appid: 'appid', mchid: 'merchant', out_trade_no: 'ORDER', transaction_id: 'TX', amount: { total: 990, currency: 'CNY' }, payer: { openid: 'payer' } };
  return { svc, data, order, grants: () => grants };
}

test('duplicate successful notification grants membership only once', async () => {
  const f = orderFixture();
  assert.equal((await f.svc.markWxPaid(f.data)).repeated, false);
  assert.equal((await f.svc.markWxPaid(f.data)).repeated, true);
  assert.equal(f.grants(), 1);
});

test('mismatched app, merchant, amount, currency, payer or state never grants membership', async () => {
  for (const patch of [{ appid: 'bad' }, { mchid: 'bad' }, { amount: { total: 1, currency: 'CNY' } }, { amount: { total: 990, currency: 'USD' } }, { payer: { openid: 'bad' } }, { trade_state: 'NOTPAY' }, { transaction_id: '' }]) {
    const f = orderFixture();
    await assert.rejects(f.svc.markWxPaid({ ...f.data, ...patch }));
    assert.equal(f.grants(), 0);
    assert.equal(f.order.status, 0);
  }
});

test('other users cannot query an order even if already paid', async () => {
  const f = orderFixture();
  f.order.status = 1;
  await assert.rejects(f.svc.syncFromWx('ORDER', 'other'), { status: 404 });
  assert.equal((await f.svc.syncFromWx('ORDER', 'payer')).status, 1);
});

test('callback awaits async decryption and acknowledges only successfully processed payments', async () => {
  let fail = false;
  let processed = 0;
  const router = load('src/routes/pay.js', {
    '../db': {}, '../middleware/auth': { userAuth: (req, res, next) => next() },
    '../services/member.service': {},
    '../utils/wxpay': { verifyNotify: async () => true, decryptResource: async () => { await new Promise(r => setImmediate(r)); return { trade_state: 'SUCCESS', out_trade_no: 'ORDER' }; } },
    '../services/order.service': { markWxPaid: async (data) => { assert.equal(data.trade_state, 'SUCCESS'); if (fail) throw new Error('unknown order'); processed++; return { repeated: false }; } },
  });
  const handler = router.stack.find(layer => layer.route?.path === '/notify').route.stack[0].handle;
  const res = { statusCode: 200, status(value) { this.statusCode = value; return this; }, json(value) { this.body = value; return this; } };
  const req = { headers: {}, body: Buffer.from('{"event_type":"TRANSACTION.SUCCESS","resource":{}}') };
  await handler(req, res, (err) => { throw err; });
  assert.equal(processed, 1);
  assert.equal(res.body.code, 'SUCCESS');
  fail = true;
  await handler(req, res, (err) => { throw err; });
  assert.equal(res.statusCode, 500);
  assert.equal(res.body.code, 'FAIL');
});
