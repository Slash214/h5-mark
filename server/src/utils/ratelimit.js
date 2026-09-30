/**
 * 简单内存限流（单机 pm2 fork 足够）
 * key: 维度标识；windowSec 内最多 max 次
 */
const windows = new Map();

function prune(arr, since) {
  while (arr.length && arr[0] < since) arr.shift();
}

/**
 * @returns {{ ok: boolean, retryAfterSec?: number, remain?: number }}
 */
function hit(key, max, windowSec) {
  if (max <= 0) return { ok: true, remain: 999 };
  const now = Date.now();
  const since = now - windowSec * 1000;
  let arr = windows.get(key);
  if (!arr) { arr = []; windows.set(key, arr); }
  prune(arr, since);
  if (arr.length >= max) {
    const retryAfterSec = Math.max(1, Math.ceil((arr[0] + windowSec * 1000 - now) / 1000));
    return { ok: false, retryAfterSec, remain: 0 };
  }
  arr.push(now);
  // 防止 Map 无限涨
  if (windows.size > 20000) {
    for (const [k, v] of windows) {
      prune(v, now - 86400000);
      if (!v.length) windows.delete(k);
    }
  }
  return { ok: true, remain: max - arr.length };
}

function dayKey(base) {
  const d = new Date();
  const day = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
  return `${base}:day:${day}`;
}

module.exports = { hit, dayKey };
