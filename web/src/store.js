import { reactive } from 'vue';
import { getConfig } from './api';

export const store = reactive({
  loaded: false,
  siteTitle: '号码标记查询去除',
  siteSubtitle: '快速查询并去除各平台号码标记',
  notice: '',
  agreement: '',
  price: 990,
  originPrice: 0,
  memberDays: 30,
  contact: {},
  platforms: [],
  lastQuery: null, // 缓存最近一次查询结果，结果页直接用
});

export async function loadConfig(force = false) {
  if (store.loaded && !force) return store;
  const d = await getConfig();
  Object.assign(store, d, { loaded: true });
  return store;
}

export const yuan = (fen) => (Number(fen || 0) / 100).toFixed(2);
