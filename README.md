# 号码标记查询去除 H5

移动端 H5（微信公众号内使用）+ Node.js 后端 + 管理后台。

## 功能

| # | 功能 | 位置 |
|---|------|------|
| 一 | 自助查询号码标记 → 显示标记 → 点击立即处理 | H5 首页 / 结果页 |
| 二 | 发文章（站内文章 + 微信公众号外链两种） | 后台「文章管理」→ H5「资讯文章」 |
| 三 | 微信客服 / 联系方式，后台随时可改 | 后台「系统配置 → 联系方式」→ H5「联系客服」 |
| 四 | 后台改价格（查询后有标记才提示开通会员） | 后台「系统配置 → 价格设置」 |
| 五 | 自动计时器：支付成功自动开通 30 天会员，到期自动失效 | `member.service.js` |
| — | 微信公众号网页授权 + 微信支付 V3 JSAPI 网页支付 | `utils/wx.js` / `utils/wxpay.js` |

## 目录

```
h5-mark/
├── sql/init.sql        数据库建表 + 初始化数据
├── server/             Node.js + Express + MySQL 后端
│   ├── src/providers/  号码标记数据源适配层（mock / http 可切换）
│   ├── src/utils/wx.js      公众号授权、JS-SDK 签名
│   └── src/utils/wxpay.js   微信支付 V3（下单/签名/回调验签解密）
├── web/                H5 前端（Vue3 + Vite + Vant）见 web/ENV.md
├── admin/              管理后台（Vue3 + Vite + Element Plus）
└── docs/DEPLOY.md      部署文档
```

## 快速开始（本地）

```bash
# 1. 建库
mysql -uroot -p < sql/init.sql

# 2. 后端
cd server
cp .env.example .env      # 改数据库 / 微信配置
npm install
npm run dev               # http://127.0.0.1:3000

# 3. H5
cd ../web && npm install && npm run dev      # http://127.0.0.1:5173

# 4. 后台
cd ../admin && npm install && npm run dev    # http://127.0.0.1:5174
```

本地没有微信环境时，在 `server/.env` 里打开两个开关即可跑通全流程：

```
DEV_FAKE_LOGIN=1   # 跳过微信授权，自动登录一个假 openid
DEV_FAKE_PAY=1     # 跳过微信支付，下单即视为已支付
```

> ⚠️ 上线前这两项必须改回 0。

后台默认账号：**admin / admin888**，登录后请立刻改密码
（或执行 `cd server && node scripts/reset-admin.js admin 你的新密码`）。

## 号码标记数据从哪来

代码里做了**数据源适配层**，后台「系统配置 → 数据源」可切换，不用改代码：

- `mock`：内置模拟数据，同一号码结果固定，用于演示和联调（默认）。
- `http`：调用你自己的第三方查询接口。填好接口地址、请求方式、号码参数名、密钥即可。

如果第三方返回结构比较特别，只需要改 `server/src/providers/http.js` 里的 `normalize()` 一个函数。
也可以新建一个 `providers/xxx.js` 导出 `{ name, query(phone, platforms) }`，
在 `providers/index.js` 里 `register()` 进去，后台配置项填对应名字即可。

## 主要接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET  | /api/config | H5 公共配置（价格、文案、联系方式、平台） |
| GET  | /api/auth/login?redirect= | 跳微信授权，回跳带 token |
| POST | /api/query | 查询标记（非会员只返回数量） |
| GET  | /api/query/member?phone= | 会员状态与到期时间 |
| POST | /api/query/clear | 提交去标记工单（需会员） |
| POST | /api/pay/jsapi | 下单，返回 JSAPI 支付参数 |
| POST | /api/pay/notify | 微信支付回调（验签 + 解密 + 幂等开通会员） |
| GET  | /api/pay/order/:orderNo | 查单兜底 |
| GET  | /api/articles | 文章列表 |
| *    | /api/admin/** | 后台接口（JWT 鉴权） |

部署见 [docs/DEPLOY.md](docs/DEPLOY.md)。
