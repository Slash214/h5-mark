require('dotenv').config();
const mysql = require('mysql2/promise');

const rows = [
  ['query_cache_ttl', '1800', '同号查询缓存秒数(0=关闭)', 'number', 'provider', 36],
  ['query_rate_per_min', '1', '每分钟真实查询上限', 'number', 'provider', 37],
  ['query_rate_per_day', '30', '每日真实查询上限(openid)', 'number', 'provider', 38],
  ['query_require_login', '0', '查询强制登录(0否/1是)', 'text', 'provider', 39],
];

(async () => {
  const c = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });
  for (const r of rows) {
    await c.query(
      `INSERT INTO sys_config (\`k\`,\`v\`,\`name\`,\`type\`,\`group\`,\`sort\`) VALUES (?,?,?,?,?,?)
       ON DUPLICATE KEY UPDATE \`name\`=VALUES(\`name\`),\`type\`=VALUES(\`type\`),\`group\`=VALUES(\`group\`),\`sort\`=VALUES(\`sort\`)`,
      r
    );
    console.log('upsert', r[0]);
  }
  await c.end();
  console.log('query_cache_config_ok');
})().catch((e) => {
  console.error('ERR', e.message);
  process.exit(1);
});
