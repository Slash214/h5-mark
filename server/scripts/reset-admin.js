/**
 * 重置/新建后台管理员
 * 用法: node scripts/reset-admin.js admin 你的新密码
 */
const db = require('../src/db');
const { sha256, randomStr } = require('../src/utils/helper');

(async () => {
  const username = process.argv[2] || 'admin';
  const password = process.argv[3];
  if (!password || password.length < 6) {
    console.error('用法: node scripts/reset-admin.js <用户名> <密码(≥6位)>');
    process.exit(1);
  }
  const salt = randomStr(16);
  const hash = sha256(password + salt);
  const exist = await db.one('SELECT id FROM admin_user WHERE username=?', [username]);
  if (exist) {
    await db.query('UPDATE admin_user SET password=?, salt=? WHERE id=?', [hash, salt, exist.id]);
    console.log(`已重置管理员 ${username} 的密码`);
  } else {
    await db.query('INSERT INTO admin_user (username,password,salt,nickname) VALUES (?,?,?,?)',
      [username, hash, salt, username]);
    console.log(`已创建管理员 ${username}`);
  }
  process.exit(0);
})();
