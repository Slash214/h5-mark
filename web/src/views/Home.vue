<template>
  <div class="page home">
    <div class="hero">
      <h1 class="hero-title">{{ store.siteTitle }}</h1>
      <p class="hero-sub">{{ store.siteSubtitle }}</p>
    </div>

    <div class="wrap">
      <!-- 查询框 -->
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

      <!-- 支持平台 -->
      <div class="card mt16">
        <h2 class="card-title">支持去除以下平台标记</h2>
        <div class="plat-grid">
          <div v-for="p in store.platforms" :key="p.code" class="plat-item">
            <div class="plat-dot" :style="{ background: p.color }">
              <img v-if="p.icon" :src="p.icon" :alt="p.name" />
              <span v-else>{{ p.short || p.name.slice(0, 1) }}</span>
            </div>
            <div class="plat-name">{{ p.name }}</div>
          </div>
        </div>
      </div>

      <!-- 入口 -->
      <div class="card mt16 link-card" @click="$router.push('/appeal')">
        <span>申诉说明</span>
        <van-icon name="arrow" />
      </div>

      <div class="card mt12 link-card" @click="$router.push('/articles')">
        <span>资讯文章</span>
        <van-icon name="arrow" />
      </div>

      <div class="card mt12 link-card" @click="$router.push('/tasks')">
        <span>处理进度查询</span>
        <van-icon name="arrow" />
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
.home { background: #f5f6f8; }
.hero {
  background: linear-gradient(180deg, #2f5bef 0%, #2340d8 100%);
  padding: 46px 16px 64px;
  text-align: center;
}
.hero-title { margin: 0; font-size: 26px; font-weight: 700; color: #fff; letter-spacing: 2px; }
.hero-sub { margin: 10px 0 0; font-size: 13px; color: rgba(255, 255, 255, 0.82); }

.wrap { padding: 0 16px 24px; margin-top: -30px; position: relative; z-index: 2; }

.search-card {
  background: #fff;
  border-radius: 40px;
  box-shadow: 0 6px 20px rgba(20, 40, 90, 0.12);
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
  background: var(--brand-2);
  color: #fff;
  font-size: 15px;
  padding: 0 24px;
  height: 42px;
  line-height: 42px;
  border-radius: 34px;
}
.search-btn:disabled { opacity: 0.7; }

.card-title { margin: 4px 0 18px; font-size: 16px; font-weight: 700; text-align: center; }

.link-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 15px;
  font-weight: 600;
  padding: 18px 16px;
}

.foot-links { margin-top: 20px; text-align: center; color: #9aa2ad; font-size: 13px; }
.foot-links i { margin: 0 8px; font-style: normal; }
</style>
