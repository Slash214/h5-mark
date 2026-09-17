import axios from 'axios';
import { ElMessage } from 'element-plus';
import router from '../router';

const http = axios.create({ baseURL: '/api/admin', timeout: 20000 });

export const TOKEN_KEY = 'h5mark_admin_token';
export const getToken = () => localStorage.getItem(TOKEN_KEY) || '';
export const setToken = (t) => localStorage.setItem(TOKEN_KEY, t);
export const clearToken = () => localStorage.removeItem(TOKEN_KEY);

http.interceptors.request.use((c) => {
  const t = getToken();
  if (t) c.headers.Authorization = `Bearer ${t}`;
  return c;
});

http.interceptors.response.use(
  (res) => {
    if (res.data && res.data.code === 0) {
      if (res.config.method !== 'get' && res.data.msg && res.data.msg !== 'ok') ElMessage.success(res.data.msg);
      return res.data.data;
    }
    ElMessage.error(res.data?.msg || '请求失败');
    return Promise.reject(new Error(res.data?.msg));
  },
  (err) => {
    const status = err.response?.status;
    if (status === 401) {
      clearToken();
      router.push('/login');
    }
    ElMessage.error(err.response?.data?.msg || err.message || '网络异常');
    return Promise.reject(err);
  }
);

export default http;

export const api = {
  login: (d) => http.post('/login', d),
  profile: () => http.get('/profile'),
  changePassword: (d) => http.post('/password', d),

  stat: () => http.get('/stat/overview'),
  trend: () => http.get('/stat/trend'),

  configs: () => http.get('/configs'),
  saveConfigs: (d) => http.put('/configs', d),

  articles: (params) => http.get('/articles', { params }),
  article: (id) => http.get(`/articles/${id}`),
  createArticle: (d) => http.post('/articles', d),
  updateArticle: (id, d) => http.put(`/articles/${id}`, d),
  deleteArticle: (id) => http.delete(`/articles/${id}`),

  orders: (params) => http.get('/orders', { params }),
  syncOrder: (no) => http.post(`/orders/${no}/sync`),
  markOrderPaid: (no) => http.post(`/orders/${no}/paid`),

  members: (params) => http.get('/members', { params }),
  grantMember: (d) => http.post('/members/grant', d),
  setMemberExpire: (phone, expireAt) => http.put(`/members/${phone}/expire`, { expireAt }),
  deleteMember: (id) => http.delete(`/members/${id}`),

  tasks: (params) => http.get('/tasks', { params }),
  updateTask: (id, d) => http.put(`/tasks/${id}`, d),

  platforms: () => http.get('/platforms'),
  createPlatform: (d) => http.post('/platforms', d),
  updatePlatform: (id, d) => http.put(`/platforms/${id}`, d),
  deletePlatform: (id) => http.delete(`/platforms/${id}`),
};
