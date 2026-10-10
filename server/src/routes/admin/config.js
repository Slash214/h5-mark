const router = require('express').Router();
const db = require('../../db');
const conf = require('../../services/config.service');
const { ok, wrap } = require('../../utils/helper');
const { HttpError } = require('../../middleware/error');
const crypto = require('crypto');

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
  if ('wxpay_public_key' in data || 'wxpay_public_key_id' in data) {
    const pem = String(data.wxpay_public_key ?? await conf.get('wxpay_public_key', '')).trim();
    const id = String(data.wxpay_public_key_id ?? await conf.get('wxpay_public_key_id', '')).trim();
    if (pem || id) {
      if (!/^PUB_KEY_ID_\w+$/.test(id)) throw new HttpError('请填写正确的微信支付公钥 ID（PUB_KEY_ID_ 开头）');
      try {
        if (!pem.includes('BEGIN PUBLIC KEY') || crypto.createPublicKey(pem).asymmetricKeyType !== 'rsa') throw new Error();
      } catch {
        throw new HttpError('请填写有效的微信支付 RSA 公钥 PEM，不能使用商户私钥或商户证书');
      }
    }
  }
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
