import { createRouter, createWebHashHistory } from 'vue-router';

const routes = [
  { path: '/', name: 'home', component: () => import('../views/Home.vue'), meta: { title: '号码标记查询去除' } },
  { path: '/result', name: 'result', component: () => import('../views/Result.vue'), meta: { title: '查询' } },
  { path: '/tasks', name: 'tasks', component: () => import('../views/Tasks.vue'), meta: { title: '处理进度' } },
  { path: '/articles', name: 'articles', component: () => import('../views/Articles.vue'), meta: { title: '资讯' } },
  { path: '/article/:id', name: 'article', component: () => import('../views/ArticleDetail.vue'), meta: { title: '详情' } },
  { path: '/appeal', name: 'appeal', component: () => import('../views/Appeal.vue'), meta: { title: '申诉说明' } },
  { path: '/contact', name: 'contact', component: () => import('../views/Contact.vue'), meta: { title: '联系客服' } },
  { path: '/orders', name: 'orders', component: () => import('../views/Orders.vue'), meta: { title: '我的订单' } },
  { path: '/:pathMatch(.*)*', redirect: '/' },
];

const router = createRouter({ history: createWebHashHistory(), routes, scrollBehavior: () => ({ top: 0 }) });

router.beforeEach((to, from, next) => {
  if (to.meta?.title) document.title = to.meta.title;
  next();
});

export default router;
