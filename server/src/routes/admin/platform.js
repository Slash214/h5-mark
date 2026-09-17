const router = require('express').Router();
const db = require('../../db');
const { ok, wrap } = require('../../utils/helper');

router.get('/', wrap(async (req, res) => {
  res.json(ok(await db.query('SELECT * FROM mark_platform ORDER BY sort ASC, id ASC')));
}));

router.post('/', wrap(async (req, res) => {
  const b = req.body;
  const r = await db.query(
    'INSERT INTO mark_platform (code,name,short,color,icon,sort,enabled) VALUES (?,?,?,?,?,?,?)',
    [b.code, b.name, b.short || '', b.color || '#3b6cf6', b.icon || null, Number(b.sort || 0), Number(b.enabled === undefined ? 1 : b.enabled)]
  );
  res.json(ok({ id: r.insertId }, '已添加'));
}));

router.put('/:id', wrap(async (req, res) => {
  const b = req.body;
  await db.query(
    'UPDATE mark_platform SET code=?,name=?,short=?,color=?,icon=?,sort=?,enabled=? WHERE id=?',
    [b.code, b.name, b.short || '', b.color || '#3b6cf6', b.icon || null, Number(b.sort || 0), Number(b.enabled), req.params.id]
  );
  res.json(ok(null, '已保存'));
}));

router.delete('/:id', wrap(async (req, res) => {
  await db.query('DELETE FROM mark_platform WHERE id=?', [req.params.id]);
  res.json(ok(null, '已删除'));
}));

module.exports = router;
