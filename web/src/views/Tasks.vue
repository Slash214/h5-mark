<template>
  <div class="page">
    <van-nav-bar title="处理进度" left-arrow @click-left="$router.back()" />
    <div class="wrap">
      <div class="card search">
        <input v-model="phone" class="inp" type="tel" maxlength="11" placeholder="请输入手机号码" />
        <button class="btn" @click="load">查询</button>
      </div>

      <div v-if="list.length" class="mt16">
        <div v-for="t in list" :key="t.id" class="card item">
          <div class="row">
            <span class="name">{{ t.platform_name }}</span>
            <span class="st" :class="'st' + t.status">{{ statusText[t.status] }}</span>
          </div>
          <div class="meta">提交时间：{{ t.created_at }}</div>
          <div v-if="t.remark" class="remark">客服备注：{{ t.remark }}</div>
        </div>
      </div>
      <van-empty v-else-if="loaded" description="暂无处理记录" />
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { NavBar as VanNavBar, Empty as VanEmpty, showToast } from 'vant';
import { clearList } from '../api';

const route = useRoute();
const phone = ref(route.query.phone || localStorage.getItem('h5mark_last_phone') || '');
const list = ref([]);
const loaded = ref(false);
const statusText = { 0: '待处理', 1: '处理中', 2: '已完成', 3: '处理失败' };

async function load() {
  if (!/^1[3-9]\d{9}$/.test(phone.value)) return showToast('请输入正确的手机号码');
  list.value = await clearList(phone.value);
  loaded.value = true;
}
onMounted(() => { if (phone.value) load(); });
</script>

<style scoped>
.wrap { padding: 12px 16px 30px; }
.search { display: flex; align-items: center; gap: 10px; padding: 10px 10px 10px 16px; border-radius: 40px; }
.inp { flex: 1; border: none; outline: none; height: 36px; font-size: 15px; }
.btn { border: none; background: var(--brand-2); color: #fff; padding: 0 20px; height: 38px; border-radius: 22px; }
.item { margin-bottom: 12px; }
.row { display: flex; align-items: center; justify-content: space-between; }
.name { font-size: 15px; font-weight: 600; }
.st { font-size: 12px; padding: 3px 10px; border-radius: 20px; }
.st0 { background: #fff7e6; color: #e6a23c; }
.st1 { background: #e8f0ff; color: #2b4acb; }
.st2 { background: #e8f7ee; color: #22c55e; }
.st3 { background: #ffeaec; color: #f5455a; }
.meta { margin-top: 8px; font-size: 12px; color: var(--text-2); }
.remark { margin-top: 6px; font-size: 12px; color: #4b5563; }
</style>
