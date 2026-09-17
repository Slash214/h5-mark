<template>
  <div class="page">
    <van-nav-bar title="申诉说明" left-arrow @click-left="$router.back()" />
    <div class="wrap">
      <div v-if="a" class="content" v-html="a.content"></div>
      <van-empty v-else-if="loaded" description="暂未配置申诉说明" />
      <div class="card mt16 link-card" @click="$router.push('/contact')">
        <span>还有疑问？联系客服</span>
        <van-icon name="arrow" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { NavBar as VanNavBar, Empty as VanEmpty, Icon as VanIcon } from 'vant';
import { articleList, articleDetail } from '../api';

const a = ref(null);
const loaded = ref(false);
onMounted(async () => {
  try {
    const r = await articleList({ category: 'appeal', page: 1, size: 1 });
    if (r.list.length) a.value = await articleDetail(r.list[0].id);
  } finally {
    loaded.value = true;
  }
});
</script>

<style scoped>
.wrap { padding: 16px; }
.content { background: #fff; border-radius: 14px; padding: 16px; font-size: 15px; line-height: 1.9; color: #303540; }
.content :deep(h3) { font-size: 16px; margin: 18px 0 8px; }
.link-card { display: flex; align-items: center; justify-content: space-between; font-weight: 600; }
</style>
