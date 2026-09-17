const router = require('express').Router();
const db = require('../db');
const { userAuth } = require('../middleware/auth');
const { HttpError } = require('../middleware/error');
const { isPhone, ok, wrap } = require('../utils/helper');
const orderSvc = require('../services/order.service');
const wxpay = require('../utils/wxpay');
const member = require('../services/member.service');

/** 下单，返回 JSAPI 支付参数 */
router.post('/jsapi', userAuth, wrap(async (req, res) => {
  const phone = String(req.body.phone || '').trim();
  if (!isPhone(phone)) throw new HttpError('号码格式不正确');
  const r = await orderSvc.createJsapiOrder({ phone, openid: req.user.openid });
  res.json(ok(r));
}));

/** 支付完成后前端主动查单（兜底，回调可能延迟） */
router.get('/order/:orderNo', wrap(async (req, res) => {
  const r = await orderSvc.syncFromWx(req.params.orderNo);
  const o = r.order;
  const m = await member.status(o.phone);
  res.json(ok({
    orderNo: o.order_no,
    status: o.status,
    paid: o.status === 1,
    phone: o.phone,
    amount: o.amount,
    paidAt: o.paid_at,
    expireAt: m.expireAt,
    isMember: m.isMember,
  }));
}));

/** 我的订单 */
router.get('/orders', userAuth, wrap(async (req, res) => {
  const rows = await db.query(
    'SELECT order_no,phone,amount,status,days,paid_at,created_at FROM pay_order WHERE openid=? ORDER BY id DESC LIMIT 50',
    [req.user.openid]
  );
  res.json(ok(rows));
}));

/**
 * 微信支付回调
 * 注意：app.js 里对该路径使用了 express.raw，req.body 是 Buffer
 */
router.post('/notify', wrap(async (req, res) => {
  const rawBody = Buffer.isBuffer(req.body) ? req.body.toString('utf8') : JSON.stringify(req.body || {});
  let valid = false;
  try {
    valid = await wxpay.verifyNotify(req.headers, rawBody);
  } catch (e) {
    console.error('[pay/notify] 验签异常', e.message);
  }
  if (!valid) {
    console.warn('[pay/notify] 签名校验失败');
    return res.status(401).json({ code: 'FAIL', message: '签名验证失败' });
  }

  let body;
  try { body = JSON.parse(rawBody); } catch (e) {
    return res.status(400).json({ code: 'FAIL', message: 'body 解析失败' });
  }

  if (body.event_type !== 'TRANSACTION.SUCCESS') {
    return res.json({ code: 'SUCCESS', message: 'ignored' });
  }

  try {
    const data = wxpay.decryptResource(body.resource);
    if (data.trade_state === 'SUCCESS') {
      const r = await orderSvc.markPaid(data.out_trade_no, data.transaction_id, JSON.stringify(data));
      console.log('[pay/notify] 订单已处理', data.out_trade_no, r.repeated ? '(重复回调)' : '(首次)');
    }
    res.json({ code: 'SUCCESS', message: '成功' });
  } catch (e) {
    console.error('[pay/notify] 处理失败', e);
    // 返回非 SUCCESS，微信会重试
    res.status(500).json({ code: 'FAIL', message: '处理失败' });
  }
}));

module.exports = router;
