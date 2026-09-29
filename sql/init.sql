-- ============================================================
-- 号码标记查询去除 H5  数据库初始化脚本
-- MySQL 5.7+ / 8.0
-- ============================================================
CREATE DATABASE IF NOT EXISTS `h5_mark` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;
USE `h5_mark`;

-- ---------------- 微信用户 ----------------
DROP TABLE IF EXISTS `wx_user`;
CREATE TABLE `wx_user` (
  `id`          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `openid`      VARCHAR(64)  NOT NULL COMMENT '公众号 openid',
  `unionid`     VARCHAR(64)  DEFAULT NULL,
  `nickname`    VARCHAR(128) DEFAULT NULL,
  `avatar`      VARCHAR(512) DEFAULT NULL,
  `last_phone`  VARCHAR(20)  DEFAULT NULL COMMENT '最近一次查询的号码',
  `created_at`  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_openid` (`openid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='微信用户';

-- ---------------- 标记平台字典 ----------------
DROP TABLE IF EXISTS `mark_platform`;
CREATE TABLE `mark_platform` (
  `id`        INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `code`      VARCHAR(32)  NOT NULL COMMENT '平台标识: 360/baidu/teddy/unicom/tencent/cmcc/dianhuabang/sogou',
  `name`      VARCHAR(64)  NOT NULL,
  `short`     VARCHAR(8)   NOT NULL DEFAULT '' COMMENT '圆形图标里的字',
  `color`     VARCHAR(16)  NOT NULL DEFAULT '#3b6cf6' COMMENT '圆形图标背景色',
  `icon`      VARCHAR(512) DEFAULT NULL COMMENT '图标地址(优先于 short/color)',
  `appeal_url` VARCHAR(512) DEFAULT NULL COMMENT '解标/申诉官方跳转地址',
  `sort`      INT          NOT NULL DEFAULT 0,
  `enabled`   TINYINT      NOT NULL DEFAULT 1,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='支持去除标记的平台';

INSERT INTO `mark_platform` (`code`,`name`,`short`,`color`,`appeal_url`,`sort`) VALUES
('360','360','3','#22c55e','http://haomashensu.360.cn/index.html',1),
('baidu','百度','百','#2b4acb','https://haoma.baidu.com',2),
('teddy','泰迪熊','泰','#f59e0b','https://www.teddymobile.cn/numberComplain',3),
('unicom','联通','联','#dc2626',NULL,4),
('tencent','腾讯','腾','#38bdf8','https://yun.m.qq.com/content.html#1',5),
('cmcc','移动高频','移','#0e7490',NULL,6),
('dianhuabang','电话邦','电','#2563eb','http://www.dianhua.cn/appeal',7),
('sogou','搜狗','搜','#f97316',NULL,8);

-- ---------------- 查询记录 ----------------
DROP TABLE IF EXISTS `mark_query`;
CREATE TABLE `mark_query` (
  `id`          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `phone`       VARCHAR(20)  NOT NULL,
  `openid`      VARCHAR(64)  DEFAULT NULL,
  `mark_count`  INT          NOT NULL DEFAULT 0 COMMENT '被标记平台数',
  `result_json` JSON         DEFAULT NULL COMMENT '各平台明细',
  `provider`    VARCHAR(32)  NOT NULL DEFAULT 'mock' COMMENT '数据来源渠道',
  `ip`          VARCHAR(64)  DEFAULT NULL,
  `created_at`  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_phone` (`phone`),
  KEY `idx_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='号码标记查询记录';

-- ---------------- 号码会员（按号码付费，30 天） ----------------
DROP TABLE IF EXISTS `phone_member`;
CREATE TABLE `phone_member` (
  `id`         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `phone`      VARCHAR(20) NOT NULL,
  `openid`     VARCHAR(64) DEFAULT NULL COMMENT '开通人',
  `expire_at`  DATETIME    NOT NULL COMMENT '会员到期时间',
  `total_days` INT         NOT NULL DEFAULT 0 COMMENT '累计开通天数',
  `created_at` DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_phone` (`phone`),
  KEY `idx_expire` (`expire_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='号码会员(按号码计时)';

-- ---------------- 订单 ----------------
DROP TABLE IF EXISTS `pay_order`;
CREATE TABLE `pay_order` (
  `id`             BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `order_no`       VARCHAR(40)  NOT NULL COMMENT '商户订单号',
  `openid`         VARCHAR(64)  NOT NULL,
  `phone`          VARCHAR(20)  NOT NULL,
  `amount`         INT          NOT NULL COMMENT '金额(分)',
  `days`           INT          NOT NULL DEFAULT 30 COMMENT '本单开通天数',
  `subject`        VARCHAR(128) NOT NULL DEFAULT '号码标记处理服务',
  `status`         TINYINT      NOT NULL DEFAULT 0 COMMENT '0待支付 1已支付 2已关闭 3已退款',
  `prepay_id`      VARCHAR(128) DEFAULT NULL,
  `transaction_id` VARCHAR(64)  DEFAULT NULL COMMENT '微信支付单号',
  `paid_at`        DATETIME     DEFAULT NULL,
  `raw_notify`     TEXT         DEFAULT NULL COMMENT '回调原文',
  `created_at`     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_order_no` (`order_no`),
  KEY `idx_openid` (`openid`),
  KEY `idx_phone` (`phone`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='微信支付订单';

-- ---------------- 去标记工单 ----------------
DROP TABLE IF EXISTS `clear_task`;
CREATE TABLE `clear_task` (
  `id`            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `phone`         VARCHAR(20) NOT NULL,
  `openid`        VARCHAR(64) DEFAULT NULL,
  `platform_code` VARCHAR(32) NOT NULL,
  `platform_name` VARCHAR(64) NOT NULL,
  `status`        TINYINT     NOT NULL DEFAULT 0 COMMENT '0待处理 1处理中 2已完成 3失败',
  `remark`        VARCHAR(512) DEFAULT NULL COMMENT '客服备注/失败原因',
  `created_at`    DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`    DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_phone` (`phone`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='号码标记清除工单';

-- ---------------- 文章 ----------------
DROP TABLE IF EXISTS `article`;
CREATE TABLE `article` (
  `id`         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `title`      VARCHAR(255) NOT NULL,
  `cover`      VARCHAR(512) DEFAULT NULL,
  `summary`    VARCHAR(512) DEFAULT NULL,
  `content`    LONGTEXT     DEFAULT NULL COMMENT '内部文章正文(HTML)',
  `source_url` VARCHAR(512) DEFAULT NULL COMMENT '微信公众号文章链接',
  `type`       TINYINT      NOT NULL DEFAULT 0 COMMENT '0站内文章 1公众号外链',
  `category`   VARCHAR(32)  NOT NULL DEFAULT 'news' COMMENT 'news资讯 / appeal申诉说明 / help帮助',
  `status`     TINYINT      NOT NULL DEFAULT 1 COMMENT '0下架 1上架',
  `top`        TINYINT      NOT NULL DEFAULT 0 COMMENT '置顶',
  `sort`       INT          NOT NULL DEFAULT 0,
  `views`      INT          NOT NULL DEFAULT 0,
  `created_at` DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_cat_status` (`category`,`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='文章';

INSERT INTO `article` (`title`,`summary`,`content`,`category`,`type`,`top`) VALUES
('申诉说明','号码被误标记后如何申诉、处理周期与注意事项。',
'<h3>一、什么是号码标记</h3><p>号码标记是各大安全软件（360、百度、腾讯手机管家、搜狗号码通、泰迪熊、电话邦等）根据用户举报形成的号码画像。被标记为“骚扰电话”“推销”“中介”后，对方来电会显示红色提醒，接通率大幅下降。</p><h3>二、处理流程</h3><p>1. 输入号码查询被哪些平台标记；<br/>2. 开通处理服务后提交工单；<br/>3. 我们按平台官方申诉通道逐一提交申诉；<br/>4. 一般 1-7 个工作日生效，部分平台需要缓存刷新，最长 15 天。</p><h3>三、注意事项</h3><p>普通标记不限次数免费清除；如为运营商高频标记、法院/征信类特殊标记，需联系客服单独处理。清除后如再次被大量用户举报，仍可能被重新标记。</p>',
'appeal',0,1);

-- ---------------- 系统配置 ----------------
DROP TABLE IF EXISTS `sys_config`;
CREATE TABLE `sys_config` (
  `id`      INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `k`       VARCHAR(64)  NOT NULL,
  `v`       TEXT         DEFAULT NULL,
  `name`    VARCHAR(128) NOT NULL DEFAULT '',
  `type`    VARCHAR(16)  NOT NULL DEFAULT 'text' COMMENT 'text/number/textarea/image/switch',
  `group`   VARCHAR(32)  NOT NULL DEFAULT 'base' COMMENT 'base基础 / price价格 / contact联系方式 / provider数据源',
  `sort`    INT          NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_k` (`k`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='系统配置(后台可改)';

INSERT INTO `sys_config` (`k`,`v`,`name`,`type`,`group`,`sort`) VALUES
('site_title','号码标记查询去除','站点标题','text','base',1),
('site_subtitle','快速查询并去除各平台号码标记','站点副标题','text','base',2),
('notice','按号码付费，时效为30天，单号码可不限次数查询，不限次数免费清除普通标记，如有特殊标记可联系客服处理','支付页提示文案','textarea','base',3),
('agreement','<p>1. 本服务为号码标记申诉代办服务，按号码收费，有效期 30 天。</p><p>2. 购买后不限次数查询该号码，不限次数免费清除普通标记。</p><p>3. 因号码持续被用户举报导致的重新标记，属于正常现象，可再次免费提交清除。</p><p>4. 特殊标记（运营商高频、金融催收等）需联系客服评估。</p><p>5. 虚拟服务一经开通不支持退款。</p>','用户协议','textarea','base',4),

('price','990','会员价格(分)','number','price',10),
('origin_price','0','划线原价(分，0=不显示)','number','price',11),
('member_days','30','开通天数','number','price',12),

('service_wechat','','客服微信号','text','contact',20),
('service_qrcode','','客服微信二维码图片地址','image','contact',21),
('service_phone','','客服电话','text','contact',22),
('service_link','','在线客服链接(填了优先跳转)','text','contact',23),
('oa_name','','公众号名称','text','contact',24),
('oa_qrcode','','公众号二维码','image','contact',25),

('provider','qbc','标记数据源(mock/qbc/tmini/http)','text','provider',30),
('provider_url','http://175.24.191.201/api/query.php','查询接口地址','text','provider',31),
('provider_key','','接口密钥 api_key','text','provider',32),
('provider_method','GET','请求方式 GET/POST(仅通用http)','text','provider',33),
('provider_phone_field','phone','号码参数名(仅通用http)','text','provider',34),
('provider_key_field','api_key','密钥参数名(仅通用http)','text','provider',35),

('site_url','','站点域名(HTTPS，无末尾/)','text','wechat',40),
('wx_appid','','公众号 AppID','text','wechat',41),
('wx_appsecret','','公众号 AppSecret','text','wechat',42),
('wxpay_mchid','','微信支付商户号','text','wechat',43),
('wxpay_serial_no','','商户API证书序列号','text','wechat',44),
('wxpay_api_v3_key','','APIv3密钥','text','wechat',45),
('wxpay_notify_url','','支付回调URL','text','wechat',46),
('wxpay_private_key','','商户私钥PEM全文','textarea','wechat',47);

-- ---------------- 管理员 ----------------
DROP TABLE IF EXISTS `admin_user`;
CREATE TABLE `admin_user` (
  `id`         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `username`   VARCHAR(64)  NOT NULL,
  `password`   VARCHAR(128) NOT NULL COMMENT 'sha256(password + salt)',
  `salt`       VARCHAR(32)  NOT NULL,
  `nickname`   VARCHAR(64)  DEFAULT NULL,
  `last_login` DATETIME     DEFAULT NULL,
  `created_at` DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_username` (`username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='后台管理员';

-- 默认管理员 admin / admin888  （salt=h5mark2026）
-- sha256('admin888h5mark2026')
INSERT INTO `admin_user` (`username`,`password`,`salt`,`nickname`) VALUES
('admin','4cfc1142e93996a9e4c4a3e0b11bb297c2c41e110f2a7ea231e0bdf858fcb4af','h5mark2026','超级管理员');
