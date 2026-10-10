# 部署文档

## 0. 需要准备的东西

| 项目 | 在哪拿 | 填到哪 |
|------|--------|--------|
| 域名 + HTTPS 证书 | 域名商 / 免费 SSL | nginx |
| 公众号 AppID / AppSecret | 微信公众平台 → 基本配置 | `.env` `WX_APPID` `WX_APPSECRET` |
| 网页授权域名 | 公众平台 → 接口权限 → 网页授权 | 填你的域名（需上传验证文件） |
| JS 接口安全域名 | 公众平台 → 公众号设置 → 功能设置 | 填你的域名 |
| 商户号 mchid | 微信商户平台 | `WXPAY_MCHID` |
| 证书序列号 + apiclient_key.pem | 商户平台 → API 安全 | `WXPAY_SERIAL_NO` / `server/cert/` |
| APIv3 密钥 | 商户平台 → API 安全 | `WXPAY_API_V3_KEY` |
| 支付授权目录 | 商户平台 → 产品中心 → JSAPI 支付 | `https://你的域名/` |

> 公众号必须是**已认证的服务号**，并且开通了微信支付；商户号要与公众号完成关联（APPID 绑定）。

## 1. 服务器环境

- Node.js ≥ 18（推荐 20 LTS）
- MySQL ≥ 5.7
- nginx
- pm2：`npm i -g pm2`

## 2. 初始化数据库

```bash
mysql -uroot -p < sql/init.sql
```

## 3. 后端

```bash
cd server
cp .env.example .env
vim .env          # 按上表填写
# 把 apiclient_key.pem 放到 server/cert/
npm install --production
mkdir -p logs
pm2 start ecosystem.config.js
pm2 save && pm2 startup
```

自检：`curl http://127.0.0.1:3000/api/health`

## 4. 前端打包

```bash
cd web   && npm install && npm run build    # 产物 web/dist
cd ../admin && npm install && npm run build # 产物 admin/dist
```

两种托管方式二选一：

- **方式 A（推荐）**：nginx 直接托管 dist，见下方配置。
- **方式 B**：什么都不做。`server/src/app.js` 检测到 `web/dist`、`admin/dist` 存在时会自动托管，
  访问 `https://域名/` 是 H5，`https://域名/admin` 是后台。

## 5. nginx 配置示例

```nginx
server {
    listen 80;
    server_name haoma.example.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name haoma.example.com;

    ssl_certificate     /etc/nginx/cert/fullchain.pem;
    ssl_certificate_key /etc/nginx/cert/privkey.pem;

    client_max_body_size 10m;

    # 微信域名校验文件（网页授权 / JS / 业务域名）
    # 文件放站点根目录；须在 SPA try_files 之前。勿在正则里写 {n,}（nginx 会当配置块）
    location ^~ /MP_verify_ {
        root /www/wwwroot/你的站点目录;
        default_type text/plain;
        charset utf-8;
        access_log off;
    }

    # H5
    root /www/h5-mark/web/dist;
    index index.html;
    location / {
        try_files $uri $uri/ /index.html;
    }

    # 管理后台
    location /admin {
        alias /www/h5-mark/admin/dist;
        try_files $uri $uri/ /admin/index.html;
    }

    # 接口
    location /api/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 60s;
    }

    # 后台上传的图片
    location /uploads/ {
        proxy_pass http://127.0.0.1:3000;
    }
}
```

## 6. 微信支付回调

微信内的 H5 使用 JSAPI 支付（WeixinJSBridge），桌面浏览器不能验证真实收银台唤起。
商户号必须关联本站服务号 AppID，并由公众号管理员确认；支付授权目录填站点根目录（如 `https://example.com/`）。

后台「系统配置 → 微信支付」支持两种验签模式：

- 微信支付公钥：填写 `PUB_KEY_ID_` 开头的公钥 ID，以及微信商户平台下载的公钥 PEM 全文。
- 平台证书：旧商户未配置公钥时，仍可通过 `/v3/certificates` 获取平台证书。

商户私钥、商户 API 证书序列号、微信支付公钥是不同参数。如果微信返回「无可用的平台证书」，必须配置微信支付公钥。
已有数据库无需重建；后台保存时自动新增公钥配置项。环境变量兜底为 `WXPAY_PUBLIC_KEY_ID`、`WXPAY_PUBLIC_KEY`（PEM 中换行可写作 `\n`）。
调用普通 access_token / JS-SDK 接口时，需要在公众号后台将实际服务器出口 IP 加入 IP 白名单。

本地回归测试：`cd server && npm test`、`cd web && npm test`。这些测试使用模拟交易和临时生成的 RSA 密钥，不会扣款或修改会员。
真实验收还需要手机微信授权、生成预支付单、弹出收银台，以及支付后检查回调或主动查单开通会员。

`.env` 里的 `WXPAY_NOTIFY_URL` 必须是外网可访问的 **https** 地址，
指向 `https://你的域名/api/pay/notify`。

回调处理要点（已在代码里实现）：

1. `app.js` 对 `/api/pay/notify` 使用 `express.raw`，保证拿到原始 body 用于验签；
2. 用微信平台证书验 `Wechatpay-Signature`，时间戳偏差 > 5 分钟直接拒绝；
3. AES-256-GCM 解密 `resource`；
4. 等待解密完成，核对 AppID、商户号、金额、币种和付款人，再用 `SELECT ... FOR UPDATE` 做**幂等**，微信重复回调不会重复开通；
5. 开通会员采用「未到期则叠加，已过期则从现在起算」的自动计时逻辑。

前端还有一层兜底：支付成功后轮询 `/api/pay/order/:orderNo`，
该接口会主动向微信查单并同步状态，所以即使回调延迟也不会漏单。

## 7. 上线前检查清单

- [ ] `.env` 中 `DEV_FAKE_LOGIN=0`、`DEV_FAKE_PAY=0`
- [ ] `JWT_SECRET` 改成随机长字符串
- [ ] 后台 admin 密码已修改
- [ ] `SITE_URL` 与实际域名一致（授权回跳依赖它）
- [ ] 公众号「网页授权域名」「JS 接口安全域名」已配置
- [ ] 商户平台「JSAPI 支付授权目录」已配置
- [ ] `server/cert/apiclient_key.pem` 权限 600，且 **不要** 提交到 git
- [ ] 后台「系统配置 → 数据源」按实际情况切换（上线前若仍是 mock，查到的是模拟数据）
- [ ] 后台「系统配置 → 价格设置」确认价格与天数

## 8. 常用运维命令

```bash
pm2 logs h5-mark-server      # 看日志
pm2 restart h5-mark-server   # 重启
pm2 monit                    # 监控

# 重置后台密码
cd server && node scripts/reset-admin.js admin 新密码
```

## 9. 2026-10-10 支付联调交接

- 支付回调解密、交易校验、公钥验签及前端桥接处理已更新；7 项后端测试和 3 项前端测试通过，两端前端构建通过。
- 修复已同步至 `b2.liubin123.top`，重启的 PM2 应用为 `h5-mark-b2`。线上健康检查及后台返回 200，未登录查单返回 401，无签名支付回调被拒绝。
- 更新前备份：`/root/h5-mark-payment-backup-20261010-175932.tar.gz`。
- 待完成：确认商户号绑定服务号；填写微信支付公钥 ID 和 PEM；为公众号普通接口配置服务器出口 IP 白名单；在手机微信里完成授权与真实支付验收。
- 本次没有真实扣款，也没有验证真实收银台弹出。检查时无真实授权用户，且微信平台证书接口提示需使用微信支付公钥；公众号普通接口返回 IP 不在白名单。
