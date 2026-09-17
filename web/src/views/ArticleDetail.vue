<template>
  <div class="page">
    <van-nav-bar title="详情" left-arrow @click-left="$router.back()" />
    <div v-if="a" class="wrap">
      <h1 class="title">{{ a.title }}</h1>
      <div class="meta">{{ (a.created_at || '').slice(0, 16) }} · 阅读 {{ a.views }}</div>
      <img v-if="a.cover" :src="a.cover" class="cover" />
      <div class="content" v-html="a.content"></div>
      <a v-if="a.source_url" class="source" :href="a.source_url">查看公众号原文 ›</a>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { NavBar as VanNavBar } from 'vant';
import { articleDetail } from '../api';

const route = useRoute();
const a = ref(null);
onMounted(async () => {
  a.value = await articleDetail(route.params.id);
  if (a.value?.title) document.title = a.value.title;
});
</script>

<style scoped>
.wrap { padding: 16px; background: #fff; min-height: calc(100vh - 46px); }
.title { font-size: 20px; line-height: 1.5; margin: 0 0 10px; }
.meta { font-size: 12px; color: #9aa2ad; margin-bottom: 16px; }
.cover { width: 100%; border-radius: 10px; margin-bottom: 16px; }
.content { font-size: 15px; line-height: 1.9; color: #303540; }
.content :deep(img) { width: 100%; border-radius: 8px; margin: 10px 0; }
.content :deep(h3) { font-size: 16px; margin: 20px 0 8px; }
.content :deep(p) { margin: 10px 0; }
.source { display: block; margin-top: 24px; color: var(--brand); font-size: 14px; }
</style>
