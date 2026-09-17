const router = require('express').Router();
const db = require('../../db');
const conf = require('../../services/config.service');
const { ok, wrap } = require('../../utils/helper');

/** 按分组返回全部配置项（价格 / 联系方式 / 数据源 / 基础） */
router.get('/', wrap(async (req, res) => {
  const rows = await db.query('SELECT id,`k`,`v`,`name`,`type`,`group`,`sort` FROM sys_config ORDER BY `sort` ASC, id ASC');
  const groups = {};
  rows.forEach((r) => {
    (groups[r.group] = groups[r.group] || []).push(r);
  });
  res.json(ok({ rows, groups }));
}));

/** 批量保存：{ price: 1290, member_days: 30, service_wechat: 'xxx' } */
router.put('/', wrap(async (req, res) => {
  const data = req.body || {};
  delete data.id;
  await conf.setMany(data);
  res.json(ok(null, '保存成功，H5 端 10 秒内生效'));
}));

/** 新增自定义配置项 */
router.post('/', wrap(async (req, res) => {
  const { k, v = '', name = '', type = 'text', group = 'base', sort = 99 } = req.body;
  await db.query(
    'INSERT INTO sys_config (`k`,`v`,`name`,`type`,`group`,`sort`) VALUES (?,?,?,?,?,?) ON DUPLICATE KEY UPDATE `v`=VALUES(`v`),`name`=VALUES(`name`)',
    [k, v, name, type, group, sort]
  );
  conf.flush();
  res.json(ok(null, '已添加'));
}));

module.exports = router;
