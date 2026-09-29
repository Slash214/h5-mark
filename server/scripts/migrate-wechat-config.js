require('dotenv').config();
const mysql = require('mysql2/promise');

const rows = [
  ['site_url', '', '站点域名(HTTPS，无末尾/)', 'text', 'wechat', 40],
  ['wx_appid', '', '公众号 AppID', 'text', 'wechat', 41],
  ['wx_appsecret', '', '公众号 AppSecret', 'text', 'wechat', 42],
  ['wxpay_mchid', '', '微信支付商户号', 'text', 'wechat', 43],
  ['wxpay_serial_no', '', '商户API证书序列号', 'text', 'wechat', 44],
  ['wxpay_api_v3_key', '', 'APIv3密钥', 'text', 'wechat', 45],
  ['wxpay_notify_url', '', '支付回调URL', 'text', 'wechat', 46],
  ['wxpay_private_key', '', '商户私钥PEM全文', 'textarea', 'wechat', 47],
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
  }
  // 若 .env 有值且库里为空，灌进去一次，方便从 env 迁到后台
  const map = {
    site_url: process.env.SITE_URL,
    wx_appid: process.env.WX_APPID,
    wx_appsecret: process.env.WX_APPSECRET,
    wxpay_mchid: process.env.WXPAY_MCHID,
    wxpay_serial_no: process.env.WXPAY_SERIAL_NO,
    wxpay_api_v3_key: process.env.WXPAY_API_V3_KEY,
    wxpay_notify_url: process.env.WXPAY_NOTIFY_URL,
  };
  for (const [k, envV] of Object.entries(map)) {
    const v = String(envV || '').trim();
    if (!v || v.includes('example') || v.includes('000000')) continue;
    const [cur] = await c.query('SELECT v FROM sys_config WHERE k=?', [k]);
    if (!cur[0] || !String(cur[0].v || '').trim()) {
      await c.query('UPDATE sys_config SET v=? WHERE k=?', [v, k]);
      console.log('seeded_from_env', k);
    }
  }
  await c.end();
  console.log('wechat_config_ok');
})().catch((e) => {
  console.error('ERR', e.message);
  process.exit(1);
});
