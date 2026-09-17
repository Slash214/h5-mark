import { createApp } from 'vue';
import App from './App.vue';
import router from './router';
import { setToken } from './api/request';
import 'vant/lib/index.css';
import './styles/index.css';

// 微信授权回跳会把 token 带在 hash query 上，这里先落地再进路由
(function pickToken() {
  const hash = location.hash || '';
  const qIndex = hash.indexOf('?');
  if (qIndex === -1) return;
  const params = new URLSearchParams(hash.slice(qIndex + 1));
  const t = params.get('token');
  if (t) {
    setToken(t);
    params.delete('token');
    const rest = params.toString();
    location.replace(location.pathname + hash.slice(0, qIndex) + (rest ? '?' + rest : ''));
  }
})();

createApp(App).use(router).mount('#app');
