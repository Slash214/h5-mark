import test from 'node:test';
import assert from 'node:assert/strict';
import { waitForWxBridge, invokeWxPay } from '../src/utils/wxpay.js';
const params = { appId: 'wx', timeStamp: '1', nonceStr: 'n', package: 'prepay_id=test', signType: 'RSA', paySign: 'signature' };

test('ordinary browser rejects payment without waiting for an event', async () => {
  await assert.rejects(waitForWxBridge({ win: { navigator: { userAgent: 'Chrome' } }, doc: new EventTarget() }), /手机微信/);
});
test('bridge ready and timeout both remove their listeners', async () => {
  const doc = new EventTarget();
  let listeners = 0;
  const add = doc.addEventListener.bind(doc), remove = doc.removeEventListener.bind(doc);
  doc.addEventListener = (...args) => { listeners++; add(...args); };
  doc.removeEventListener = (...args) => { listeners--; remove(...args); };
  const win = { navigator: { userAgent: 'MicroMessenger' } };
  const pending = waitForWxBridge({ win, doc });
  win.WeixinJSBridge = { invoke() {} };
  doc.dispatchEvent(new Event('WeixinJSBridgeReady'));
  assert.equal(await pending, win.WeixinJSBridge);
  assert.equal(listeners, 0);
  delete win.WeixinJSBridge;
  await assert.rejects(waitForWxBridge({ win, doc, timeoutMs: 1 }), /超时/);
  assert.equal(listeners, 0);
});
test('invoke waits for callback and handles success, cancellation and failure', async () => {
  for (const [suffix, expected] of [['ok', 'ok'], ['cancel', 'cancel'], ['fail', null]]) {
    let callback;
    const promise = invokeWxPay({ invoke(name, data, cb) { assert.equal(name, 'getBrandWCPayRequest'); assert.deepEqual(data, params); callback = cb; } }, params);
    callback({ err_msg: `get_brand_wcpay_request:${suffix}` });
    if (expected) assert.equal(await promise, expected);
    else await assert.rejects(promise, /未完成/);
  }
});
