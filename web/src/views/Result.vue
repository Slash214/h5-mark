<template>
  <div class="page result" :class="{ 'has-pay': showPayBar }">
    <van-nav-bar title="查询" left-arrow @click-left="$router.back()" />

    <div class="wrap">
      <div class="panel phone-card">
        <div class="row">
          <div class="phone">{{ data.phone }}</div>
          <span v-if="data.isMember" class="tag tag-vip">会员</span>
          <span v-else class="tag tag-normal">普通用户</span>
        </div>
        <div v-if="data.isMember" class="expire">
          <span class="muted">到期时间：</span>{{ data.expireAt }}
          <span class="left-days">（剩余 {{ data.leftDays }} 天）</span>
        </div>
      </div>

      <h2 class="mark-title" :class="{ clean: !data.markCount }">
        <template v-if="data.markCount > 0">
          您的号码已被 <b>{{ data.markCount }}</b> 个平台标记
        </template>
        <template v-else>
          未检测到平台标记
        </template>
      </h2>

      <!-- 未开通 -->
      <template v-if="!data.isMember">
        <template v-if="data.markCount > 0">
          <div v-for="(it, i) in data.list" :key="'lock' + i" class="panel mark-row">
            <div class="mark-left">
              <span class="lock-badge">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 018 0v3"/></svg>
              </span>
              <span class="lock-text">开通会员后可见</span>
            </div>
            <span class="badge-mark">有标记</span>
          </div>
        </template>
        <div v-else class="panel center clean">
          <div class="clean-icon">
            <svg viewBox="0 0 64 64" width="56" height="56" aria-hidden="true">
              <circle cx="32" cy="32" r="30" fill="#ecfdf5"/>
              <circle cx="32" cy="32" r="22" fill="#d1fae5"/>
              <path d="M20 33.5l8 8 16-18" fill="none" stroke="#10b981" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </div>
          <p class="clean-title">号码状态良好</p>
          <p class="clean-desc">太棒了，当前未查询到该号码被标记</p>
        </div>
      </template>

      <!-- 已开通：明细 -->
      <template v-else>
        <div v-for="it in markedList" :key="it.code" class="panel mark-row column">
          <div class="row">
            <div class="mark-left">
              <PlatIcon
                size="sm"
                :code="it.code"
                :name="it.name"
                :short="platShort(it.code)"
                :color="platColor(it.code)"
                :icon="platIcon(it.code)"
              />
              <div>
                <div class="plat-title">{{ it.name }}</div>
                <div v-if="it.tag" class="plat-tag">{{ it.tag }}</div>
              </div>
            </div>
            <span class="badge-mark">有标记</span>
          </div>
          <div class="row end">
            <button class="btn-mini" @click="handleAppeal(it)">立即处理</button>
          </div>
        </div>

        <div v-if="!markedList.length" class="panel center clean">
          <div class="clean-icon">
            <svg viewBox="0 0 64 64" width="56" height="56" aria-hidden="true">
              <circle cx="32" cy="32" r="30" fill="#ecfdf5"/>
              <circle cx="32" cy="32" r="22" fill="#d1fae5"/>
              <path d="M20 33.5l8 8 16-18" fill="none" stroke="#10b981" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </div>
          <p class="clean-title">号码状态良好</p>
          <p class="clean-desc">该号码目前没有被任何平台标记</p>
        </div>

        <div v-if="markedList.length > 1" class="panel mt12 tip-card">
          <p>请分别点击各平台「立即处理」，跳转官方申诉页完成解标。</p>
        </div>
      </template>
    </div>

    <!-- 有标记且未开通：底部支付栏 -->
    <div v-if="showPayBar" class="pay-bar safe-bottom">
      <p class="notice">{{ store.notice }}</p>
      <div class="agree">
        <van-checkbox v-model="agreed" icon-size="16px" checked-color="#2b4acb">
          我已阅读条款并同意
        </van-checkbox>
        <span class="agree-link" @click="showAgreement = true">《用户协议》</span>
      </div>
      <div class="pay-row">
        <button class="btn-service" @click="$router.push('/contact')">联系客服</button>
        <div class="price">
          合计：<b>¥{{ yuan(data.price || store.price) }}</b>
        </div>
        <button class="btn-pay" :disabled="paying" @click="doPay">
          {{ paying ? '处理中...' : '立即处理' }}
        </button>
      </div>
    </div>

    <van-popup v-model:show="showAgreement" position="bottom" round :style="{ maxHeight: '70%' }">
      <div class="agreement">
        <h3>用户协议</h3>
        <div class="agreement-body" v-html="store.agreement"></div>
      </div>
    </van-popup>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import {
  NavBar as VanNavBar, Checkbox as VanCheckbox, Popup as VanPopup,
  showToast, showLoadingToast, closeToast, showSuccessToast, showDialog,
} from 'vant';
import { store, yuan, loadConfig } from '../store';
import { queryMark, createPay, orderStatus } from '../api';
import { getToken } from '../api/request';
import PlatIcon from '../components/PlatIcon.vue';

const route = useRoute();
const router = useRouter();

const data = ref(
  store.lastQuery || { phone: route.query.phone || '', isMember: false, markCount: 0, list: [], price: store.price }
);
const agreed = ref(false);
const paying = ref(false);
const showAgreement = ref(false);

const markedList = computed(() => (data.value.list || []).filter((x) => x.marked));
const showPayBar = computed(() => !data.value.isMember && Number(data.value.markCount || 0) > 0);

const FALLBACK_APPEAL = {
  '360': 'http://haomashensu.360.cn/index.html',
  tencent: 'https://yun.m.qq.com/content.html#1',
  teddy: 'https://www.teddymobile.cn/numberComplain',
  dianhuabang: 'http://www.dianhua.cn/appeal',
  baidu: 'https://haoma.baidu.com',
};

const platMap = computed(() => Object.fromEntries((store.platforms || []).map((p) => [p.code, p])));
const platColor = (code) => platMap.value[code]?.color || '#2b4acb';
const platShort = (code) => platMap.value[code]?.short || (platMap.value[code]?.name || '').slice(0, 1);
const platIcon = (code) => platMap.value[code]?.icon || '';

function resolveAppealUrl(it) {
  return it.appealUrl
    || platMap.value[it.code]?.appealUrl
    || FALLBACK_APPEAL[it.code]
    || '';
}

onMounted(async () => {
  await loadConfig().catch(() => {});
  if (!store.lastQuery && route.query.phone) await refresh();
  if (route.query.orderNo) checkOrder(route.query.orderNo);
});

async function refresh() {
  const p = data.value.phone || route.query.phone;
  if (!p) return router.replace('/');
  showLoadingToast({ message: '加载中...', forbidClick: true, duration: 0 });
  try {
    data.value = await queryMark(p);
    store.lastQuery = data.value;
  } finally {
    closeToast();
  }
}

async function doPay() {
  if (!agreed.value) return showToast('请先阅读并同意用户协议');
  if (!getToken()) return gotoAuth();
  paying.value = true;
  showLoadingToast({ message: '正在下单...', forbidClick: true, duration: 0 });
  try {
    const r = await createPay(data.value.phone);
    closeToast();
    if (r.devPaid) {
      await onPaid(r.orderNo);
      return;
    }
    invokeWxPay(r.payParams, r.orderNo);
  } catch (e) {
    closeToast();
  } finally {
    paying.value = false;
  }
}

function gotoAuth() {
  const base = import.meta.env.VITE_API_BASE || '/api';
  location.href = `${base}/auth/login?redirect=${encodeURIComponent('/result?phone=' + data.value.phone)}`;
}

function invokeWxPay(params, orderNo) {
  const invoke = () => {
    window.WeixinJSBridge.invoke('getBrandWCPayRequest', {
      appId: params.appId,
      timeStamp: params.timeStamp,
      nonceStr: params.nonceStr,
      package: params.package,
      signType: params.signType,
      paySign: params.paySign,
    }, (res) => {
      if (res.err_msg === 'get_brand_wcpay_request:ok') onPaid(orderNo);
      else if (res.err_msg === 'get_brand_wcpay_request:cancel') showToast('已取消支付');
      else showToast('支付未完成');
    });
  };
  if (typeof window.WeixinJSBridge === 'undefined') {
    document.addEventListener('WeixinJSBridgeReady', invoke, false);
    showToast('请在微信中打开本页面完成支付');
  } else invoke();
}

async function onPaid(orderNo) {
  showLoadingToast({ message: '正在确认支付结果...', forbidClick: true, duration: 0 });
  for (let i = 0; i < 6; i++) {
    try {
      const o = await orderStatus(orderNo);
      if (o.paid) {
        closeToast();
        showSuccessToast('开通成功');
        store.lastQuery = null;
        await refresh();
        return;
      }
    } catch (e) { /* ignore */ }
    await new Promise((r) => setTimeout(r, 1500));
  }
  closeToast();
  showDialog({ title: '提示', message: '支付结果确认中，请稍后下拉刷新或联系客服。' });
}

async function checkOrder(no) {
  try {
    const o = await orderStatus(no);
    if (o.paid) await refresh();
  } catch (e) { /* ignore */ }
}

function handleAppeal(it) {
  const url = resolveAppealUrl(it);
  if (!url) {
    showDialog({
      title: '提示',
      message: `「${it.name}」暂无在线申诉入口，请联系客服协助处理。`,
      confirmButtonText: '联系客服',
      showCancelButton: true,
    }).then(() => router.push('/contact')).catch(() => {});
    return;
  }
  window.location.href = url;
}
</script>

<style scoped>
.result { background: #f3f5f9; }
.wrap { padding: 12px 16px 28px; }
.result.has-pay .wrap { padding-bottom: 210px; }

.row { display: flex; align-items: center; justify-content: space-between; }
.row.end { justify-content: flex-end; margin-top: 12px; }

.panel {
  background: #fff;
  border-radius: 14px;
  border: 1px solid #eef0f4;
  padding: 16px;
}

.phone-card .phone { font-size: 24px; font-weight: 700; letter-spacing: 1px; }
.tag { font-size: 12px; padding: 3px 10px; border-radius: 20px; }
.tag-normal { background: #f1f2f4; color: #9aa2ad; }
.tag-vip { background: var(--brand); color: #fff; }
.expire { margin-top: 12px; padding-top: 12px; border-top: 1px solid #f0f1f3; font-size: 13px; }
.left-days { color: var(--brand); }

.mark-title { font-size: 17px; font-weight: 700; text-align: center; margin: 20px 0 14px; }
.mark-title b { color: var(--danger); margin: 0 2px; }
.mark-title.clean { color: #059669; }

.mark-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
.mark-row.column { display: block; }
.mark-left { display: flex; align-items: center; gap: 10px; }
.lock-badge {
  width: 32px; height: 32px; border-radius: 10px;
  background: #fff7ed; color: #f59e0b;
  display: inline-flex; align-items: center; justify-content: center;
}
.lock-text { color: #9aa2ad; font-size: 15px; }
.plat-title { font-size: 15px; font-weight: 600; }
.plat-tag { font-size: 12px; color: var(--text-2); margin-top: 2px; }
.badge-mark { background: #ffeaec; color: #f5455a; font-size: 12px; padding: 4px 12px; border-radius: 20px; }

.btn-mini {
  background: linear-gradient(135deg, #3b6cf6, #2b4acb); color: #fff; border: none;
  padding: 8px 22px; border-radius: 20px; font-size: 14px;
}
.tip-card { font-size: 13px; color: var(--text-2); line-height: 1.6; }
.tip-card p { margin: 0; }

.clean { padding: 36px 16px; }
.clean-icon { margin: 0 auto 10px; width: 56px; height: 56px; }
.clean-title { margin: 0 0 6px; font-size: 17px; font-weight: 700; color: #059669; }
.clean-desc { margin: 0; color: var(--text-2); font-size: 13px; }

.pay-bar {
  position: fixed; left: 0; right: 0; bottom: 0;
  background: #fff; padding: 10px 16px 12px;
  border-top: 1px solid #eef0f4;
}
.notice { margin: 0 0 8px; font-size: 11px; line-height: 1.6; color: #c47d0e; background: #fffbeb; padding: 8px 10px; border-radius: 8px; }
.agree { display: flex; align-items: center; font-size: 12px; color: var(--text-2); margin-bottom: 10px; }
.agree-link { color: var(--brand); }
.pay-row { display: flex; align-items: center; gap: 10px; }
.btn-service { background: #3b6cf6; color: #fff; border: none; padding: 10px 14px; border-radius: 22px; font-size: 13px; white-space: nowrap; }
.price { flex: 1; text-align: center; font-size: 13px; color: var(--text-2); }
.price b { color: var(--danger); font-size: 18px; }
.btn-pay { background: #f5455a; color: #fff; border: none; padding: 11px 26px; border-radius: 24px; font-size: 15px; white-space: nowrap; }
.btn-pay:disabled { opacity: 0.7; }

.agreement { padding: 20px 16px calc(20px + env(safe-area-inset-bottom)); }
.agreement h3 { margin: 0 0 12px; text-align: center; }
.agreement-body { font-size: 13px; line-height: 1.8; color: #4b5563; }
</style>
