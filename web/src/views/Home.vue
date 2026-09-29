<template>
  <div class="page home">
    <div class="hero">
      <h1 class="hero-title">{{ store.siteTitle }}</h1>
      <p class="hero-sub">{{ store.siteSubtitle }}</p>
    </div>

    <div class="wrap">
      <div class="search-card">
        <input
          v-model="phone"
          class="search-input"
          type="tel"
          inputmode="numeric"
          maxlength="11"
          placeholder="请输入手机号码"
          @keyup.enter="doQuery"
        />
        <button class="search-btn" :disabled="loading" @click="doQuery">
          {{ loading ? '查询中' : '查询' }}
        </button>
      </div>

      <div class="panel mt16">
        <h2 class="card-title">支持去除以下平台标记</h2>
        <div class="plat-grid">
          <div v-for="p in store.platforms" :key="p.code" class="plat-item">
            <PlatIcon
              :code="p.code"
              :name="p.name"
              :short="p.short"
              :color="p.color"
              :icon="p.icon"
            />
            <div class="plat-name">{{ p.name }}</div>
          </div>
        </div>
      </div>

      <div class="menu-list mt16">
        <div class="menu-item" @click="$router.push('/appeal')">
          <span class="menu-ico appeal">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3l8 4v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V7l8-4z"/><path d="M9 12l2 2 4-4"/></svg>
          </span>
          <span class="menu-text">申诉说明</span>
          <van-icon name="arrow" class="arrow" />
        </div>
        <div class="menu-item" @click="$router.push('/articles')">
          <span class="menu-ico news">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 5h12a2 2 0 012 2v12H6a2 2 0 01-2-2V5z"/><path d="M8 9h8M8 13h6"/></svg>
          </span>
          <span class="menu-text">资讯文章</span>
          <van-icon name="arrow" class="arrow" />
        </div>
        <div class="menu-item" @click="$router.push('/tasks')">
          <span class="menu-ico task">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>
          </span>
          <span class="menu-text">处理进度查询</span>
          <van-icon name="arrow" class="arrow" />
        </div>
      </div>

      <div class="foot-links">
        <span @click="$router.push('/contact')">联系客服</span>
        <i>·</i>
        <span @click="$router.push('/orders')">我的订单</span>
      </div>
    </div>
  </div>
</template>

<script>
export default { name: 'Home' };
</script>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { showToast, showLoadingToast, closeToast, Icon as VanIcon } from 'vant';
import { store } from '../store';
import { queryMark } from '../api';
import PlatIcon from '../components/PlatIcon.vue';

const router = useRouter();
const phone = ref(localStorage.getItem('h5mark_last_phone') || '');
const loading = ref(false);

async function doQuery() {
  const p = phone.value.trim();
  if (!/^1[3-9]\d{9}$/.test(p)) return showToast('请输入正确的手机号码');
  loading.value = true;
  showLoadingToast({ message: '查询中，约需十几秒...', forbidClick: true, duration: 0 });
  try {
    const data = await queryMark(p);
    localStorage.setItem('h5mark_last_phone', p);
    store.lastQuery = data;
    router.push({ path: '/result', query: { phone: p } });
  } catch (e) {
    /* 拦截器已提示 */
  } finally {
    loading.value = false;
    closeToast();
  }
}
</script>

<style scoped>
.home { background: #f3f5f9; }
.hero {
  background: linear-gradient(165deg, #3b6cf6 0%, #2b4acb 55%, #1e3aa8 100%);
  padding: 48px 16px 70px;
  text-align: center;
}
.hero-title { margin: 0; font-size: 26px; font-weight: 700; color: #fff; letter-spacing: 2px; }
.hero-sub { margin: 10px 0 0; font-size: 13px; color: rgba(255, 255, 255, 0.85); }

.wrap { padding: 0 16px 28px; margin-top: -36px; position: relative; z-index: 2; }

.search-card {
  background: #fff;
  border-radius: 28px;
  border: 1px solid rgba(43, 74, 203, 0.08);
  display: flex;
  align-items: center;
  padding: 6px 6px 6px 18px;
}
.search-input {
  flex: 1;
  border: none;
  outline: none;
  font-size: 15px;
  height: 40px;
  background: transparent;
}
.search-input::placeholder { color: #b6bcc7; }
.search-btn {
  border: none;
  background: linear-gradient(135deg, #3b6cf6, #2b4acb);
  color: #fff;
  font-size: 15px;
  padding: 0 22px;
  height: 42px;
  line-height: 42px;
  border-radius: 22px;
  font-weight: 600;
}
.search-btn:disabled { opacity: 0.7; }

.panel {
  background: #fff;
  border-radius: 16px;
  border: 1px solid #eef0f4;
  padding: 18px 14px 16px;
}
.card-title { margin: 0 0 18px; font-size: 15px; font-weight: 700; text-align: center; color: #1f2329; }

.plat-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px 6px;
}
.plat-item { text-align: center; display: flex; flex-direction: column; align-items: center; gap: 8px; }
.plat-name { font-size: 12px; color: #5b6472; }

.menu-list {
  background: #fff;
  border-radius: 16px;
  border: 1px solid #eef0f4;
  overflow: hidden;
}
.menu-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  border-bottom: 1px solid #f2f3f6;
}
.menu-item:last-child { border-bottom: none; }
.menu-ico {
  width: 34px; height: 34px; border-radius: 10px;
  display: inline-flex; align-items: center; justify-content: center;
}
.menu-ico.appeal { background: #eef2ff; color: #3b6cf6; }
.menu-ico.news { background: #ecfdf5; color: #10b981; }
.menu-ico.task { background: #fff7ed; color: #f59e0b; }
.menu-text { flex: 1; font-size: 15px; font-weight: 600; }
.arrow { color: #c4c9d2; }

.foot-links { margin-top: 22px; text-align: center; color: #9aa2ad; font-size: 13px; }
.foot-links i { margin: 0 8px; font-style: normal; }
</style>
