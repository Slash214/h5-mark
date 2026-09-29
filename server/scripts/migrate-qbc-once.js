require('dotenv').config();
const mysql = require('mysql2/promise');

(async () => {
  const c = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  const [cols] = await c.query("SHOW COLUMNS FROM mark_platform LIKE 'appeal_url'");
  console.log('appeal_url_col=' + (cols.length ? 1 : 0));
  if (!cols.length) {
    await c.query(
      "ALTER TABLE mark_platform ADD COLUMN appeal_url VARCHAR(512) DEFAULT NULL COMMENT '解标/申诉跳转地址' AFTER icon"
    );
    console.log('added appeal_url');
  }

  const urls = {
    '360': 'http://haomashensu.360.cn/index.html',
    tencent: 'https://yun.m.qq.com/content.html#1',
    teddy: 'https://www.teddymobile.cn/numberComplain',
    dianhuabang: 'http://www.dianhua.cn/appeal',
    baidu: 'https://haoma.baidu.com',
  };
  for (const [code, url] of Object.entries(urls)) {
    await c.query('UPDATE mark_platform SET appeal_url=? WHERE code=?', [url, code]);
  }

  await c.query("UPDATE sys_config SET v='qbc' WHERE k='provider'");
  await c.query("UPDATE sys_config SET v='http://175.24.191.201/api/query.php' WHERE k='provider_url'");

  const [k] = await c.query("SELECT v FROM sys_config WHERE k='provider_key'");
  console.log('provider_key_set=' + (k[0] && k[0].v ? 1 : 0));
  if (!k[0] || !k[0].v) {
    console.log('请在后台「系统配置 → 数据源」填写 api_key');
  }
  const [p] = await c.query("SELECT k,v FROM sys_config WHERE k IN ('provider','provider_url')");
  console.log(JSON.stringify(p));
  await c.end();
  console.log('migrate_ok');
})().catch((e) => {
  console.error('ERR', e.message);
  process.exit(1);
});
