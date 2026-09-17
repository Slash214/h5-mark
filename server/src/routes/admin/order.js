const router = require('express').Router();
const db = require('../../db');
const { ok, wrap } = require('../../utils/helper');
const orderSvc = require('../../services/order.service');

router.get('/', wrap(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page || '1', 10));
  const size = Math.min(100, Math.max(1, parseInt(req.query.size || '15', 10)));
  const where = ['1=1']; const params = [];
  if (req.query.phone) { where.push('phone LIKE ?'); params.push('%' + req.query.phone + '%'); }
  if (req.query.status !== undefined && req.query.status !== '') { where.push('status=?'); params.push(Number(req.query.status)); }
  if (req.query.orderNo) { where.push('order_no=?'); params.push(req.query.orderNo); }
  const rows = await db.query(
    `SELECT id,order_no,openid,phone,amount,days,status,transaction_id,paid_at,created_at
     FROM pay_order WHERE ${where.join(' AND ')} ORDER BY id DESC LIMIT ${(page - 1) * size}, ${size}`, params);
  const c = await db.one(`SELECT COUNT(*) c, IFNULL(SUM(IF(status=1,amount,0)),0) paid_amount FROM pay_order WHERE ${where.join(' AND ')}`, params);
  res.json(ok({ list: rows, total: c.c, paidAmount: c.paid_amount }));
}));

/** 手动同步微信订单状态 */
router.post('/:orderNo/sync', wrap(async (req, res) => {
  const r = await orderSvc.syncFromWx(req.params.orderNo);
  res.json(ok(r, '已同步'));
}));

/** 手动补单（线下已付款等特殊情况） */
router.post('/:orderNo/paid', wrap(async (req, res) => {
  const r = await orderSvc.markPaid(req.params.orderNo, 'MANUAL' + Date.now(), '{"manual":true}');
  res.json(ok(r, r.repeated ? '该订单此前已支付' : '已补单并开通会员'));
}));

module.exports = router;
