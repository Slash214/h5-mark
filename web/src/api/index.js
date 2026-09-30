import http from './request';

export const getConfig = () => http.get('/config');

export const queryMark = (phone, opts = {}) => http.post('/query', { phone, ...opts });
export const memberStatus = (phone) => http.get('/query/member', { params: { phone } });
export const submitClear = (phone, platforms) => http.post('/query/clear', { phone, platforms });
export const clearList = (phone) => http.get('/query/clear/list', { params: { phone } });

export const createPay = (phone) => http.post('/pay/jsapi', { phone });
export const orderStatus = (orderNo) => http.get(`/pay/order/${orderNo}`);
export const myOrders = () => http.get('/pay/orders');

export const articleList = (params) => http.get('/articles', { params });
export const articleDetail = (id) => http.get(`/articles/${id}`);

export const me = () => http.get('/auth/me');
export const jssdk = (url) => http.get('/auth/jssdk', { params: { url } });
