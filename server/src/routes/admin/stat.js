const router = require('express').Router();
const db = require('../../db');
const { ok, wrap } = require('../../utils/helper');

router.get('/overview', wrap(async (req, res) => {
  const today = 'DATE(created_at)=CURDATE()';
  const [q, qt, o, ot, m, t, u] = await Promise.all([
    db.one('SELECT COUNT(*) c FROM mark_query'),
    db.one(`SELECT COUNT(*) c FROM mark_query WHERE ${today}`),
    db.one('SELECT COUNT(*) c, IFNULL(SUM(amount),0) a FROM pay_order WHERE status=1'),
    db.one(`SELECT COUNT(*) c, IFNULL(SUM(amount),0) a FROM pay_order WHERE status=1 AND DATE(paid_at)=CURDATE()`),
    db.one('SELECT COUNT(*) c FROM phone_member WHERE expire_at > NOW()'),
    db.one('SELECT COUNT(*) c FROM clear_task WHERE status IN (0,1)'),
    db.one('SELECT COUNT(*) c FROM wx_user'),
  ]);
  res.json(ok({
    queryTotal: q.c, queryToday: qt.c,
    orderPaid: o.c, amountPaid: o.a,
    orderToday: ot.c, amountToday: ot.a,
    memberValid: m.c, taskPending: t.c, userTotal: u.c,
  }));
}));

/** 近 15 天趋势 */
router.get('/trend', wrap(async (req, res) => {
  const rows = await db.query(
    `SELECT DATE(created_at) d, COUNT(*) c FROM mark_query
     WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 14 DAY) GROUP BY d ORDER BY d`);
  const pay = await db.query(
    `SELECT DATE(paid_at) d, COUNT(*) c, SUM(amount) a FROM pay_order
     WHERE status=1 AND paid_at >= DATE_SUB(CURDATE(), INTERVAL 14 DAY) GROUP BY d ORDER BY d`);
  res.json(ok({ query: rows, pay }));
}));

module.exports = router;
