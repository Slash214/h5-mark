const express = require('express');
const cors = require('cors');
const path = require('path');
const cfg = require('./config');
const { notFound, errorHandler } = require('./middleware/error');
const { ok } = require('./utils/helper');

const app = express();
app.set('trust proxy', true);
app.use(cors());

// 微信支付回调必须拿到原始 body 才能验签，所以放在 json 解析之前
app.use('/api/pay/notify', express.raw({ type: '*/*', limit: '1mb' }));

app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));

// 上传文件静态访问
app.use('/uploads', express.static(path.resolve(__dirname, '../uploads'), { maxAge: '7d' }));

app.get('/api/health', (req, res) => res.json(ok({ time: new Date().toISOString(), env: cfg.env })));

app.use('/api', require('./routes/public'));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/query', require('./routes/query'));
app.use('/api/pay', require('./routes/pay'));
app.use('/api/articles', require('./routes/article'));
app.use('/api/admin', require('./routes/admin'));

// ---- 可选：把打包后的 H5 / 后台静态资源交给 Node 托管 ----
// 生产环境更推荐用 nginx 托管，见 docs/DEPLOY.md
const webDist = path.resolve(__dirname, '../../web/dist');
const adminDist = path.resolve(__dirname, '../../admin/dist');
const fs = require('fs');
if (fs.existsSync(adminDist)) {
  app.use('/admin', express.static(adminDist));
  app.get('/admin/*', (req, res) => res.sendFile(path.join(adminDist, 'index.html')));
}
if (fs.existsSync(webDist)) {
  app.use(express.static(webDist));
  app.get(/^\/(?!api|uploads|admin).*/, (req, res) => res.sendFile(path.join(webDist, 'index.html')));
}

app.use(notFound);
app.use(errorHandler);

module.exports = app;
