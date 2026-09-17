<template>
  <div class="page">
    <van-nav-bar title="资讯文章" left-arrow @click-left="$router.back()" />
    <van-list v-model:loading="loading" :finished="finished" finished-text="没有更多了" @load="load">
      <div class="wrap">
        <div v-for="a in list" :key="a.id" class="card item" @click="open(a)">
          <img v-if="a.cover" :src="a.cover" class="cover" />
          <div class="body">
            <div class="title">
              <van-tag v-if="a.top" type="danger" plain size="mini">置顶</van-tag>
              {{ a.title }}
            </div>
            <div v-if="a.summary" class="summary">{{ a.summary }}</div>
            <div class="meta">
              <span>{{ (a.created_at || '').slice(0, 10) }}</span>
              <span v-if="a.type === 1" class="oa">公众号原文</span>
            </div>
          </div>
        </div>
      </div>
    </van-list>
    <van-empty v-if="finished && !list.length" description="暂无文章" />
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { NavBar as VanNavBar, List as VanList, Empty as VanEmpty, Tag as VanTag } from 'vant';
import { articleList } from '../api';

const router = useRouter();
const list = ref([]);
const page = ref(0);
const loading = ref(false);
const finished = ref(false);

async function load() {
  page.value += 1;
  try {
    const r = await articleList({ page: page.value, size: 10, category: 'news' });
    list.value.push(...r.list);
    if (list.value.length >= r.total || !r.list.length) finished.value = true;
  } catch (e) {
    finished.value = true;
  } finally {
    loading.value = false;
  }
}

function open(a) {
  // 公众号外链直接跳转，站内文章走详情页
  if (a.type === 1 && a.source_url) location.href = a.source_url;
  else router.push(`/article/${a.id}`);
}
</script>

<style scoped>
.wrap { padding: 12px 16px 24px; }
.item { display: flex; gap: 12px; margin-bottom: 12px; padding: 12px; }
.cover { width: 96px; height: 72px; object-fit: cover; border-radius: 8px; flex: none; }
.body { flex: 1; min-width: 0; }
.title { font-size: 15px; font-weight: 600; line-height: 1.5; }
.summary {
  margin-top: 6px; font-size: 12px; color: var(--text-2); line-height: 1.6;
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
}
.meta { margin-top: 8px; font-size: 11px; color: #9aa2ad; display: flex; gap: 10px; }
.oa { color: var(--brand); }
</style>
