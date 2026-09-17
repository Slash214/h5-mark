const router = require('express').Router();
const db = require('../db');
const { ok, wrap } = require('../utils/helper');

/** 文章列表 GET /api/articles?category=news&page=1&size=10 */
router.get('/', wrap(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page || '1', 10));
  const size = Math.min(50, Math.max(1, parseInt(req.query.size || '10', 10)));
  const category = req.query.category || '';
  const where = ['status=1'];
  const params = [];
  if (category) { where.push('category=?'); params.push(category); }
  const sql = `SELECT id,title,cover,summary,type,source_url,category,views,top,created_at
               FROM article WHERE ${where.join(' AND ')}
               ORDER BY top DESC, sort DESC, id DESC LIMIT ${(page - 1) * size}, ${size}`;
  const rows = await db.query(sql, params);
  const cnt = await db.one(`SELECT COUNT(*) c FROM article WHERE ${where.join(' AND ')}`, params);
  res.json(ok({ list: rows, total: cnt.c, page, size }));
}));

/** 文章详情 */
router.get('/:id', wrap(async (req, res) => {
  const row = await db.one('SELECT * FROM article WHERE id=? AND status=1', [req.params.id]);
  if (!row) return res.status(404).json({ code: 404, msg: '文章不存在' });
  db.query('UPDATE article SET views=views+1 WHERE id=?', [req.params.id]).catch(() => {});
  res.json(ok(row));
}));

module.exports = router;
