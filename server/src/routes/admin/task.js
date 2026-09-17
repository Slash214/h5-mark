const router = require('express').Router();
const db = require('../../db');
const { ok, wrap } = require('../../utils/helper');

router.get('/', wrap(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page || '1', 10));
  const size = Math.min(100, Math.max(1, parseInt(req.query.size || '15', 10)));
  const where = ['1=1']; const params = [];
  if (req.query.phone) { where.push('phone LIKE ?'); params.push('%' + req.query.phone + '%'); }
  if (req.query.status !== undefined && req.query.status !== '') { where.push('status=?'); params.push(Number(req.query.status)); }
  const rows = await db.query(
    `SELECT * FROM clear_task WHERE ${where.join(' AND ')} ORDER BY status ASC, id DESC LIMIT ${(page - 1) * size}, ${size}`, params);
  const c = await db.one(`SELECT COUNT(*) c FROM clear_task WHERE ${where.join(' AND ')}`, params);
  const pending = await db.one('SELECT COUNT(*) c FROM clear_task WHERE status IN (0,1)');
  res.json(ok({ list: rows, total: c.c, pending: pending.c }));
}));

router.put('/:id', wrap(async (req, res) => {
  const { status, remark } = req.body;
  await db.query('UPDATE clear_task SET status=?, remark=? WHERE id=?', [Number(status), remark || null, req.params.id]);
  res.json(ok(null, '已更新'));
}));

module.exports = router;
