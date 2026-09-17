import { createRouter, createWebHashHistory } from 'vue-router';
import { getToken } from '../api';

const routes = [
  { path: '/login', component: () => import('../views/Login.vue'), meta: { public: true } },
  {
    path: '/',
    component: () => import('../views/Layout.vue'),
    children: [
      { path: '', redirect: '/dashboard' },
      { path: 'dashboard', component: () => import('../views/Dashboard.vue'), meta: { title: '数据概览' } },
      { path: 'config', component: () => import('../views/Config.vue'), meta: { title: '系统配置' } },
      { path: 'articles', component: () => import('../views/Articles.vue'), meta: { title: '文章管理' } },
      { path: 'orders', component: () => import('../views/Orders.vue'), meta: { title: '订单管理' } },
      { path: 'members', component: () => import('../views/Members.vue'), meta: { title: '会员管理' } },
      { path: 'tasks', component: () => import('../views/Tasks.vue'), meta: { title: '处理工单' } },
      { path: 'platforms', component: () => import('../views/Platforms.vue'), meta: { title: '平台配置' } },
    ],
  },
];

const router = createRouter({ history: createWebHashHistory(), routes });

router.beforeEach((to, from, next) => {
  if (!to.meta?.public && !getToken()) return next('/login');
  next();
});

export default router;
