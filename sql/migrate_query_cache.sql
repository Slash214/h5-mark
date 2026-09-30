-- 查询缓存 / 限流配置（已有库执行本文件即可）
INSERT INTO `sys_config` (`k`,`v`,`name`,`type`,`group`,`sort`) VALUES
('query_cache_ttl','1800','同号查询缓存秒数(0=关闭)','number','provider',36),
('query_rate_per_min','1','每分钟真实查询上限','number','provider',37),
('query_rate_per_day','30','每日真实查询上限(openid)','number','provider',38),
('query_require_login','0','查询强制登录(0否/1是)','text','provider',39)
ON DUPLICATE KEY UPDATE
  `name`=VALUES(`name`),
  `type`=VALUES(`type`),
  `group`=VALUES(`group`),
  `sort`=VALUES(`sort`);
