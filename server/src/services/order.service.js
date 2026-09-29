const db = require('../db');
const dayjs = require('dayjs');
const cfg = require('../config');
const conf = require('./config.service');
const member = require('./member.service');
const wxpay = require('../utils/wxpay');
const { genOrderNo } = require('../utils/helper');

/** 创建订单并调起微信 JSAPI 下单 */
async function createJsapiOrder({ phone, openid }) {
  const amount = await conf.num('price', 990);
  const days = await conf.num('member_days', 30);
  const title = await conf.get('site_title', '号码标记处理');
  if (amount <= 0) throw Object.assign(new Error('价格配置有误'), { status: 500 });

  const orderNo = genOrderNo('MK');
  await db.query(
    'INSERT INTO pay_order (order_no, openid, phone, amount, days, subject) VALUES (?,?,?,?,?,?)',
    [orderNo, openid, phone, amount, days, `${title}-${phone}`]
  );

  // 本地联调：不走微信，直接置为已支付
  if (cfg.dev.fakePay) {
    await markPaid(orderNo, 'DEV' + Date.now(), '{"dev":true}');
    return { orderNo, devPaid: true, payParams: null };
  }

  const pre = await wxpay.jsapiPrepay({
    description: `${title}-${phone}`,
    outTradeNo: orderNo,
    amountFen: amount,
    openid,
    attach: phone,
  });
  await db.query('UPDATE pay_order SET prepay_id=? WHERE order_no=?', [pre.prepay_id, orderNo]);

  return { orderNo, devPaid: false, payParams: await wxpay.buildJsapiParams(pre.prepay_id) };
}

/** 标记订单已支付并开通会员（幂等） */
async function markPaid(orderNo, transactionId, rawNotify = null) {
  return db.tx(async (conn) => {
    const [rows] = await conn.execute('SELECT * FROM pay_order WHERE order_no=? FOR UPDATE', [orderNo]);
    const order = rows[0];
    if (!order) return { ok: false, reason: 'order_not_found' };
    if (order.status === 1) return { ok: true, repeated: true, order };

    await conn.execute(
      'UPDATE pay_order SET status=1, transaction_id=?, paid_at=?, raw_notify=? WHERE id=?',
      [transactionId || null, dayjs().format('YYYY-MM-DD HH:mm:ss'), rawNotify, order.id]
    );
    const expireAt = await member.grant(order.phone, order.days, order.openid, conn);
    return { ok: true, repeated: false, order, expireAt };
  });
}

/** 主动向微信查单并同步状态（前端支付完成后兜底调用） */
async function syncFromWx(orderNo) {
  const order = await db.one('SELECT * FROM pay_order WHERE order_no=?', [orderNo]);
  if (!order) throw Object.assign(new Error('订单不存在'), { status: 404, expose: true });
  if (order.status === 1) return { status: 1, order };
  if (cfg.dev.fakePay) return { status: order.status, order };

  const wx = await wxpay.queryByOutTradeNo(orderNo);
  if (wx.trade_state === 'SUCCESS') {
    await markPaid(orderNo, wx.transaction_id, JSON.stringify(wx));
    return { status: 1, order: await db.one('SELECT * FROM pay_order WHERE order_no=?', [orderNo]) };
  }
  return { status: order.status, tradeState: wx.trade_state, order };
}

module.exports = { createJsapiOrder, markPaid, syncFromWx };
