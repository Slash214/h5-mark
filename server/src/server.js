const app = require('./app');
const cfg = require('./config');
const db = require('./db');

(async () => {
  try {
    await db.query('SELECT 1');
    console.log(`[db] connected -> ${cfg.db.host}:${cfg.db.port}/${cfg.db.database}`);
  } catch (e) {
    console.error('[db] 连接失败，请检查 .env 中的数据库配置：', e.message);
    process.exit(1);
  }

  app.listen(cfg.port, () => {
    console.log(`[server] http://127.0.0.1:${cfg.port}  env=${cfg.env}`);
    if (cfg.dev.fakeLogin) console.warn('[warn] DEV_FAKE_LOGIN=1 已开启，线上务必关闭！');
    if (cfg.dev.fakePay) console.warn('[warn] DEV_FAKE_PAY=1 已开启，线上务必关闭！');
  });
})();

process.on('unhandledRejection', (e) => console.error('[unhandledRejection]', e));
