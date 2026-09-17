const router = require('express').Router();
const conf = require('../services/config.service');
const query = require('../services/query.service');
const { ok, wrap } = require('../utils/helper');

/** H5 启动时拉的公共配置（价格、文案、联系方式、平台列表） */
router.get('/config', wrap(async (req, res) => {
  const c = await conf.all();
  const platforms = await query.platforms();
  res.json(ok({
    siteTitle: c.site_title,
    siteSubtitle: c.site_subtitle,
    notice: c.notice,
    agreement: c.agreement,
    price: parseInt(c.price || '990', 10),
    originPrice: parseInt(c.origin_price || '0', 10),
    memberDays: parseInt(c.member_days || '30', 10),
    contact: {
      wechat: c.service_wechat || '',
      qrcode: c.service_qrcode || '',
      phone: c.service_phone || '',
      link: c.service_link || '',
      oaName: c.oa_name || '',
      oaQrcode: c.oa_qrcode || '',
    },
    platforms,
  }));
}));

module.exports = router;
