<template>
  <div class="page">
    <van-nav-bar title="联系客服" left-arrow @click-left="$router.back()" />
    <div class="wrap">
      <div class="card center">
        <template v-if="c.qrcode">
          <p class="tip">长按识别二维码添加客服微信</p>
          <img :src="c.qrcode" class="qr" />
        </template>
        <template v-if="c.wechat">
          <div class="line">
            <span class="label">客服微信</span>
            <span class="val">{{ c.wechat }}</span>
            <button class="copy" @click="copy(c.wechat)">复制</button>
          </div>
        </template>
        <template v-if="c.phone">
          <div class="line">
            <span class="label">客服电话</span>
            <a class="val" :href="'tel:' + c.phone">{{ c.phone }}</a>
            <button class="copy" @click="copy(c.phone)">复制</button>
          </div>
        </template>
        <a v-if="c.link" class="btn-link" :href="c.link">进入在线客服</a>
        <van-empty v-if="!c.qrcode && !c.wechat && !c.phone && !c.link" description="客服信息待配置" />
      </div>

      <div v-if="c.oaQrcode" class="card mt16 center">
        <p class="tip">关注公众号「{{ c.oaName || '我们' }}」获取最新资讯</p>
        <img :src="c.oaQrcode" class="qr" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted } from 'vue';
import { NavBar as VanNavBar, Empty as VanEmpty, showSuccessToast, showToast } from 'vant';
import { store, loadConfig } from '../store';

const c = computed(() => store.contact || {});
onMounted(() => loadConfig().catch(() => {}));

async function copy(text) {
  try {
    await navigator.clipboard.writeText(text);
    showSuccessToast('已复制');
  } catch (e) {
    const el = document.createElement('textarea');
    el.value = text; document.body.appendChild(el); el.select();
    document.execCommand('copy'); document.body.removeChild(el);
    showToast('已复制');
  }
}
</script>

<style scoped>
.wrap { padding: 16px; }
.tip { font-size: 13px; color: var(--text-2); margin: 4px 0 14px; }
.qr { width: 200px; margin: 0 auto 8px; border-radius: 10px; }
.line { display: flex; align-items: center; gap: 10px; padding: 14px 0; border-top: 1px solid #f0f1f3; }
.label { color: var(--text-2); font-size: 14px; }
.val { flex: 1; text-align: left; font-size: 15px; font-weight: 600; }
.copy { border: 1px solid var(--brand); background: #fff; color: var(--brand); border-radius: 16px; padding: 4px 14px; font-size: 12px; }
.btn-link { display: block; margin-top: 16px; background: var(--brand); color: #fff; padding: 12px; border-radius: 24px; }
</style>
