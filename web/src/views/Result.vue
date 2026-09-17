<template>
  <div class="page result">
    <van-nav-bar title="查询" left-arrow @click-left="$router.back()" />

    <div class="wrap">
      <!-- 号码卡片 -->
      <div class="card phone-card">
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

      <h2 class="mark-title">
        您的号码已被 <b>{{ data.markCount }}</b> 个平台标记
      </h2>

      <!-- 未开通：遮罩条 -->
      <template v-if="!data.isMember">
        <div v-for="(it, i) in data.list" :key="'lock' + i" class="card mark-row">
          <div class="mark-left">
            <span class="crown">👑</span>
            <span class="lock-text">开通会员后可见</span>
          </div>
          <span class="badge-mark">有标记</span>
        </div>
        <div v-if="data.markCount === 0" class="card center clean">
          <div class="clean-icon">✓</div>
          <p>太棒了，当前未查询到该号码被标记</p>
        </div>
      </template>

      <!-- 已开通：明细 -->
      <template v-else>
        <div v-for="it in markedList" :key="it.code" class="card mark-row column">
          <div class="row">
            <div class="mark-left">
              <span class="plat-dot small" :style="{ background: platColor(it.code) }">
                {{ platShort(it.code) }}
              </span>
              <div>
                <div class="plat-title">{{ it.name }}</div>
                <div v-if="it.tag" class="plat-tag">{{ it.tag }}</div>
              </div>
            </div>
            <span class="badge-mark">有标记</span>
          </div>
          <div class="row end">
            <button class="btn-mini" :disabled="submitting" @click="handleClear([it.code])">立即处理</button>
          </div>
        </div>

        <div v-if="!markedList.length" class="card center clean">
          <div class="clean-icon">✓</div>
          <p>该号码目前没有被任何平台标记</p>
        </div>

        <div v-if="markedList.length > 1" class="card mt12 center">
          <button class="btn-main" :disabled="submitting" @click="handleClear(markedList.map((x) => x.code))">
            一键处理全部标记
          </button>
        </div>

        <div class="card mt12 link-card" @click="$router.push({ path: '/tasks', query: { phone: data.phone } })">
          <span>查看处理进度</span>
          <van-icon name="arrow" />
        </div>
      </template>
    </div>

    <!-- 未开通会员：底部支付栏 -->
    <div v-if="!data.isMember" class="pay-bar safe-bottom">
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
  NavBar as VanNavBar, Icon as VanIcon, Checkbox as VanCheckbox, Popup as VanPopup,
  showToast, showLoadingToast, closeToast, showSuccessToast, showDialog,
} from 'vant';
import { store, yuan, loadConfig } from '../store';
import { queryMark, createPay, orderStatus, submitClear } from '../api';
import { getToken } from '../api/request';

const route = useRoute();
const router = useRouter();

const data = ref(
  store.lastQuery || { phone: route.query.phone || '', isMember: false, markCount: 0, list: [], price: store.price }
);
const agreed = ref(false);
const paying = ref(false);
const submitting = ref(false);
const showAgreement = ref(false);

const markedList = computed(() => (data.value.list || []).filter((x) => x.marked));

const platMap = computed(() => Object.fromEntries((store.platforms || []).map((p) => [p.code, p])));
const platColor = (code) => platMap.value[code]?.color || '#2b4acb';
const platShort = (code) => platMap.value[code]?.short || (platMap.value[code]?.name || '').slice(0, 1);

onMounted(async () => {
  await loadConfig().catch(() => {});
  if (!store.lastQuery && route.query.phone) await refresh();
  // 支付回来后刷新
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

/* -------------------- 支付 -------------------- */
async function doPay() {
  if (!agreed.value) return showToast('请先阅读并同意用户协议');
  if (!getToken()) return gotoAuth();
  paying.value = true;
  showLoadingToast({ message: '正在下单...', forbidClick: true, duration: 0 });
  try {
    const r = await createPay(data.value.phone);
    closeToast();
    if (r.devPaid) {
      // 本地联调模式
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
      if (res.err_msg === 'get_brand_wcpay_request:ok') {
        onPaid(orderNo);
      } else if (res.err_msg === 'get_brand_wcpay_request:cancel') {
        showToast('已取消支付');
      } else {
        showToast('支付未完成');
      }
    });
  };
  if (typeof window.WeixinJSBridge === 'undefined') {
    document.addEventListener('WeixinJSBridgeReady', invoke, false);
    showToast('请在微信中打开本页面完成支付');
  } else {
    invoke();
  }
}

async function onPaid(orderNo) {
  showLoadingToast({ message: '正在确认支付结果...', forbidClick: true, duration: 0 });
  // 微信回调可能有延迟，轮询 6 次
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

/* -------------------- 提交去标记工单 -------------------- */
async function checkOrder(no) {
  try {
    const o = await orderStatus(no);
    if (o.paid) await refresh();
  } catch (e) { /* ignore */ }
}

async function handleClear(codes) {
  if (!getToken()) return gotoAuth();
  submitting.value = true;
  try {
    const r = await submitClear(data.value.phone, codes);
    showSuccessToast('已提交处理');
    router.push({ path: '/tasks', query: { phone: data.value.phone } });
    return r;
  } finally {
    submitting.value = false;
  }
}
</script>

<style scoped>
.result { background: #f5f6f8; }
.wrap { padding: 12px 16px 220px; }

.row { display: flex; align-items: center; justify-content: space-between; }
.row.end { justify-content: flex-end; margin-top: 12px; }

.phone-card .phone { font-size: 24px; font-weight: 700; letter-spacing: 1px; }
.tag { font-size: 12px; padding: 3px 10px; border-radius: 20px; }
.tag-normal { background: #f1f2f4; color: #9aa2ad; }
.tag-vip { background: var(--brand); color: #fff; }
.expire { margin-top: 12px; padding-top: 12px; border-top: 1px solid #f0f1f3; font-size: 13px; }
.left-days { color: var(--brand); }

.mark-title { font-size: 17px; font-weight: 700; text-align: center; margin: 22px 0 14px; }
.mark-title b { color: var(--danger); margin: 0 2px; }

.mark-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
.mark-row.column { display: block; }
.mark-left { display: flex; align-items: center; gap: 10px; }
.crown { font-size: 20px; }
.lock-text { color: #9aa2ad; font-size: 15px; }
.plat-dot.small { width: 36px; height: 36px; font-size: 14px; margin: 0; }
.plat-title { font-size: 15px; font-weight: 600; }
.plat-tag { font-size: 12px; color: var(--text-2); margin-top: 2px; }
.badge-mark { background: #ffeaec; color: #f5455a; font-size: 12px; padding: 4px 12px; border-radius: 20px; }

.btn-mini {
  background: var(--brand-2); color: #fff; border: none;
  padding: 8px 22px; border-radius: 20px; font-size: 14px;
}
.btn-main {
  background: var(--brand); color: #fff; border: none;
  width: 100%; padding: 12px; border-radius: 24px; font-size: 15px;
}
.link-card { display: flex; align-items: center; justify-content: space-between; font-size: 15px; font-weight: 600; }

.clean { padding: 30px 16px; color: var(--text-2); }
.clean-icon {
  width: 52px; height: 52px; line-height: 52px; margin: 0 auto 12px;
  border-radius: 50%; background: #e8f7ee; color: #22c55e; font-size: 26px;
}

.pay-bar {
  position: fixed; left: 0; right: 0; bottom: 0;
  background: #fff; padding: 10px 16px 12px;
  box-shadow: 0 -4px 16px rgba(20, 40, 90, 0.08);
}
.notice { margin: 0 0 8px; font-size: 11px; line-height: 1.6; color: #e6a23c; background: #fffbe6; padding: 8px 10px; border-radius: 8px; }
.agree { display: flex; align-items: center; font-size: 12px; color: var(--text-2); margin-bottom: 10px; }
.agree-link { color: var(--brand); }
.pay-row { display: flex; align-items: center; gap: 10px; }
.btn-service { background: var(--brand-2); color: #fff; border: none; padding: 10px 14px; border-radius: 22px; font-size: 13px; white-space: nowrap; }
.price { flex: 1; text-align: center; font-size: 13px; color: var(--text-2); }
.price b { color: var(--danger); font-size: 18px; }
.btn-pay { background: #f5455a; color: #fff; border: none; padding: 11px 26px; border-radius: 24px; font-size: 15px; white-space: nowrap; }
.btn-pay:disabled { opacity: 0.7; }

.agreement { padding: 20px 16px calc(20px + env(safe-area-inset-bottom)); }
.agreement h3 { margin: 0 0 12px; text-align: center; }
.agreement-body { font-size: 13px; line-height: 1.8; color: #4b5563; }
</style>
