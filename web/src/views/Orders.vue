<template>
  <div class="page">
    <van-nav-bar title="我的订单" left-arrow @click-left="$router.back()" />
    <div class="wrap">
      <div v-for="o in list" :key="o.order_no" class="card item">
        <div class="row">
          <span class="phone">{{ o.phone }}</span>
          <span class="st" :class="o.status === 1 ? 'ok' : 'wait'">{{ statusText[o.status] }}</span>
        </div>
        <div class="meta">订单号：{{ o.order_no }}</div>
        <div class="meta">下单时间：{{ o.created_at }}</div>
        <div class="row bottom">
          <span class="days">开通 {{ o.days }} 天</span>
          <span class="amt">¥{{ (o.amount / 100).toFixed(2) }}</span>
        </div>
      </div>
      <van-empty v-if="loaded && !list.length" description="暂无订单" />
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { NavBar as VanNavBar, Empty as VanEmpty } from 'vant';
import { myOrders } from '../api';

const list = ref([]);
const loaded = ref(false);
const statusText = { 0: '待支付', 1: '已支付', 2: '已关闭', 3: '已退款' };

onMounted(async () => {
  try { list.value = await myOrders(); } catch (e) { /* 未授权时拦截器处理 */ }
  loaded.value = true;
});
</script>

<style scoped>
.wrap { padding: 12px 16px 24px; }
.item { margin-bottom: 12px; }
.row { display: flex; align-items: center; justify-content: space-between; }
.row.bottom { margin-top: 10px; padding-top: 10px; border-top: 1px solid #f0f1f3; }
.phone { font-size: 16px; font-weight: 700; }
.st { font-size: 12px; padding: 3px 10px; border-radius: 20px; }
.st.ok { background: #e8f7ee; color: #22c55e; }
.st.wait { background: #fff7e6; color: #e6a23c; }
.meta { margin-top: 6px; font-size: 12px; color: var(--text-2); }
.days { font-size: 13px; color: var(--text-2); }
.amt { font-size: 17px; font-weight: 700; color: var(--danger); }
</style>
