-- 已有库升级：增加平台申诉跳转地址，切换到 qbc 数据源
-- 用法：mysql -uroot -p h5_mark < sql/migrate_qbc.sql
-- 若 appeal_url 列已存在，跳过第一条 ALTER 即可

ALTER TABLE `mark_platform`
  ADD COLUMN `appeal_url` VARCHAR(512) DEFAULT NULL COMMENT '解标/申诉跳转地址' AFTER `icon`;

UPDATE `mark_platform` SET `appeal_url`='http://haomashensu.360.cn/index.html' WHERE `code`='360';
UPDATE `mark_platform` SET `appeal_url`='https://yun.m.qq.com/content.html#1' WHERE `code`='tencent';
UPDATE `mark_platform` SET `appeal_url`='https://www.teddymobile.cn/numberComplain' WHERE `code`='teddy';
UPDATE `mark_platform` SET `appeal_url`='http://www.dianhua.cn/appeal' WHERE `code`='dianhuabang';
UPDATE `mark_platform` SET `appeal_url`='https://haoma.baidu.com' WHERE `code`='baidu';

UPDATE `sys_config` SET `v`='qbc' WHERE `k`='provider';
UPDATE `sys_config` SET `v`='http://175.24.191.201/api/query.php' WHERE `k`='provider_url';
-- api_key 在后台「系统配置 → 数据源」填写，或取消注释：
-- UPDATE `sys_config` SET `v`='你的api_key' WHERE `k`='provider_key';
