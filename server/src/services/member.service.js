const dayjs = require('dayjs');
const db = require('../db');

/** 取号码会员状态 */
async function status(phone) {
  const row = await db.one('SELECT * FROM phone_member WHERE phone=?', [phone]);
  if (!row) return { isMember: false, expireAt: null, leftDays: 0 };
  const exp = dayjs(row.expire_at);
  const valid = exp.isAfter(dayjs());
  return {
    isMember: valid,
    expireAt: row.expire_at,
    leftDays: valid ? Math.max(0, exp.diff(dayjs(), 'day')) : 0,
    totalDays: row.total_days,
  };
}

/**
 * 开通/续期会员（自动计时器：未到期则在原到期时间上叠加，已过期则从现在起算）
 * @param {string} phone
 * @param {number} days
 * @param {string} openid
 * @param {object} conn 可选事务连接
 */
async function grant(phone, days, openid = null, conn = null) {
  const run = conn ? (sql, p) => conn.execute(sql, p).then(([r]) => r) : db.query;
  const rows = await run('SELECT * FROM phone_member WHERE phone=?', [phone]);
  const row = Array.isArray(rows) ? rows[0] : rows;
  const now = dayjs();
  if (!row) {
    const expire = now.add(days, 'day').format('YYYY-MM-DD HH:mm:ss');
    await run(
      'INSERT INTO phone_member (phone, openid, expire_at, total_days) VALUES (?,?,?,?)',
      [phone, openid, expire, days]
    );
    return expire;
  }
  const base = dayjs(row.expire_at).isAfter(now) ? dayjs(row.expire_at) : now;
  const expire = base.add(days, 'day').format('YYYY-MM-DD HH:mm:ss');
  await run(
    'UPDATE phone_member SET expire_at=?, total_days=total_days+?, openid=IFNULL(?,openid) WHERE id=?',
    [expire, days, openid, row.id]
  );
  return expire;
}

/** 后台手动设置到期时间 */
async function setExpire(phone, expireAt) {
  const exist = await db.one('SELECT id FROM phone_member WHERE phone=?', [phone]);
  if (exist) await db.query('UPDATE phone_member SET expire_at=? WHERE id=?', [expireAt, exist.id]);
  else await db.query('INSERT INTO phone_member (phone, expire_at) VALUES (?,?)', [phone, expireAt]);
}

module.exports = { status, grant, setExpire };
