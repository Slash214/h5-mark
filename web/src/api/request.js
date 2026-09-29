import axios from 'axios';
import { showToast, showDialog } from 'vant';

const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE || '/api',
  // 第三方号码查询可达 20~30s，前端需留足余量
  timeout: 65000,
});

export const TOKEN_KEY = 'h5mark_token';
export const getToken = () => localStorage.getItem(TOKEN_KEY) || '';
export const setToken = (t) => localStorage.setItem(TOKEN_KEY, t);
export const clearToken = () => localStorage.removeItem(TOKEN_KEY);

http.interceptors.request.use((config) => {
  const t = getToken();
  if (t) config.headers.Authorization = `Bearer ${t}`;
  return config;
});

http.interceptors.response.use(
  (res) => {
    const d = res.data;
    if (d && d.code === 0) return d.data;
    const msg = (d && d.msg) || '请求失败';
    showToast(msg);
    return Promise.reject(new Error(msg));
  },
  (err) => {
    const status = err.response?.status;
    const msg = err.response?.data?.msg || err.message || '网络异常';
    if (status === 401) {
      clearToken();
      showDialog({ title: '需要微信授权', message: '请在微信中打开本页面并完成授权' }).then(() => {
        location.href = `${import.meta.env.VITE_API_BASE || '/api'}/auth/login?redirect=${encodeURIComponent(location.hash.slice(1) || '/')}`;
      });
    } else {
      showToast(msg);
    }
    return Promise.reject(err);
  }
);

export default http;
