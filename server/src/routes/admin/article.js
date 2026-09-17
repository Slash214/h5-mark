const router = require('express').Router();
const db = require('../../db');
const { ok, wrap } = require('../../utils/helper');
const { HttpError } = require('../../middleware/error');

router.get('/', wrap(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page || '1', 10));
  const size = Math.min(100, Math.max(1, parseInt(req.query.size || '15', 10)));
  const kw = (req.query.keyword || '').trim();
  const where = ['1=1']; const params = [];
  if (kw) { where.push('title LIKE ?'); params.push('%' + kw + '%'); }
  if (req.query.category) { where.push('category=?'); params.push(req.query.category); }
  const rows = await db.query(
    `SELECT id,title,cover,summary,type,source_url,category,status,top,sort,views,created_at
     FROM article WHERE ${where.join(' AND ')} ORDER BY id DESC LIMIT ${(page - 1) * size}, ${size}`, params);
  const c = await db.one(`SELECT COUNT(*) c FROM article WHERE ${where.join(' AND ')}`, params);
  res.json(ok({ list: rows, total: c.c }));
}));

router.get('/:id', wrap(async (req, res) => {
  res.json(ok(await db.one('SELECT * FROM article WHERE id=?', [req.params.id])));
}));

router.post('/', wrap(async (req, res) => {
  const a = pick(req.body);
  if (!a.title) throw new HttpError('标题不能为空');
  if (a.type === 1 && !a.source_url) throw new HttpError('外链文章必须填写公众号文章链接');
  const r = await db.query(
    `INSERT INTO article (title,cover,summary,content,source_url,type,category,status,top,sort)
     VALUES (?,?,?,?,?,?,?,?,?,?)`,
    [a.title, a.cover, a.summary, a.content, a.source_url, a.type, a.category, a.status, a.top, a.sort]
  );
  res.json(ok({ id: r.insertId }, '发布成功'));
}));

router.put('/:id', wrap(async (req, res) => {
  const a = pick(req.body);
  await db.query(
    `UPDATE article SET title=?,cover=?,summary=?,content=?,source_url=?,type=?,category=?,status=?,top=?,sort=? WHERE id=?`,
    [a.title, a.cover, a.summary, a.content, a.source_url, a.type, a.category, a.status, a.top, a.sort, req.params.id]
  );
  res.json(ok(null, '已保存'));
}));

router.delete('/:id', wrap(async (req, res) => {
  await db.query('DELETE FROM article WHERE id=?', [req.params.id]);
  res.json(ok(null, '已删除'));
}));

function pick(b = {}) {
  return {
    title: b.title || '',
    cover: b.cover || null,
    summary: b.summary || null,
    content: b.content || null,
    source_url: b.source_url || null,
    type: Number(b.type || 0),
    category: b.category || 'news',
    status: Number(b.status === undefined ? 1 : b.status),
    top: Number(b.top || 0),
    sort: Number(b.sort || 0),
  };
}

module.exports = router;
