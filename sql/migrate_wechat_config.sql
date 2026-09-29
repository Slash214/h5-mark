-- 已有库：增加微信/支付后台可配置项（模板多商户）
-- mysql -uroot -p h5_mark < sql/migrate_wechat_config.sql

INSERT INTO `sys_config` (`k`,`v`,`name`,`type`,`group`,`sort`) VALUES
('site_url','','站点域名(HTTPS，无末尾/)','text','wechat',40),
('wx_appid','','公众号 AppID','text','wechat',41),
('wx_appsecret','','公众号 AppSecret','text','wechat',42),
('wxpay_mchid','','微信支付商户号','text','wechat',43),
('wxpay_serial_no','','商户API证书序列号','text','wechat',44),
('wxpay_api_v3_key','','APIv3密钥','text','wechat',45),
('wxpay_notify_url','','支付回调URL','text','wechat',46),
('wxpay_private_key','','商户私钥PEM全文','textarea','wechat',47)
ON DUPLICATE KEY UPDATE
  `name`=VALUES(`name`),
  `type`=VALUES(`type`),
  `group`=VALUES(`group`),
  `sort`=VALUES(`sort`);
