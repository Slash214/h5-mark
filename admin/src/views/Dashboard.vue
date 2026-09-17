<template>
  <div>
    <el-row :gutter="16">
      <el-col v-for="c in cards" :key="c.label" :span="6">
        <el-card shadow="never" class="stat">
          <div class="label">{{ c.label }}</div>
          <div class="value" :style="{ color: c.color }">{{ c.value }}</div>
          <div class="sub">{{ c.sub }}</div>
        </el-card>
      </el-col>
    </el-row>

    <el-card shadow="never" class="page-card" style="margin-top: 16px">
      <template #header>近 15 天查询 / 成交趋势</template>
      <div class="chart">
        <div v-for="d in days" :key="d.date" class="bar-group">
          <div class="bars">
            <div class="bar q" :style="{ height: barH(d.query, maxQuery) }" :title="`查询 ${d.query}`"></div>
            <div class="bar p" :style="{ height: barH(d.pay, maxPay) }" :title="`成交 ${d.pay}`"></div>
          </div>
          <div class="date">{{ d.date.slice(5) }}</div>
        </div>
      </div>
      <div class="legend"><i class="q"></i>查询量 <i class="p"></i>成交量</div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { api } from '../api';

const s = ref({});
const days = ref([]);

const cards = computed(() => [
  { label: '今日查询', value: s.value.queryToday ?? '-', sub: `累计 ${s.value.queryTotal ?? 0}`, color: '#409eff' },
  { label: '今日成交', value: s.value.orderToday ?? '-', sub: `今日收入 ¥${((s.value.amountToday || 0) / 100).toFixed(2)}`, color: '#67c23a' },
  { label: '有效会员', value: s.value.memberValid ?? '-', sub: `授权用户 ${s.value.userTotal ?? 0}`, color: '#e6a23c' },
  { label: '待处理工单', value: s.value.taskPending ?? '-', sub: `累计收入 ¥${((s.value.amountPaid || 0) / 100).toFixed(2)}`, color: '#f56c6c' },
]);

const maxQuery = computed(() => Math.max(1, ...days.value.map((d) => d.query)));
const maxPay = computed(() => Math.max(1, ...days.value.map((d) => d.pay)));
const barH = (v, max) => `${Math.max(2, (v / max) * 100)}%`;

onMounted(async () => {
  s.value = await api.stat();
  const t = await api.trend();
  const map = {};
  for (let i = 14; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
    map[d] = { date: d, query: 0, pay: 0 };
  }
  (t.query || []).forEach((r) => { if (map[r.d]) map[r.d].query = r.c; });
  (t.pay || []).forEach((r) => { if (map[r.d]) map[r.d].pay = r.c; });
  days.value = Object.values(map);
});
</script>

<style scoped>
.stat { text-align: center; }
.stat .label { color: #909399; font-size: 13px; }
.stat .value { font-size: 30px; font-weight: 700; margin: 8px 0 4px; }
.stat .sub { font-size: 12px; color: #c0c4cc; }
.chart { display: flex; align-items: flex-end; gap: 10px; height: 220px; padding-top: 10px; }
.bar-group { flex: 1; display: flex; flex-direction: column; justify-content: flex-end; height: 100%; }
.bars { display: flex; gap: 3px; align-items: flex-end; height: 100%; }
.bar { flex: 1; border-radius: 3px 3px 0 0; }
.bar.q { background: #409eff; }
.bar.p { background: #67c23a; }
.date { text-align: center; font-size: 11px; color: #909399; margin-top: 6px; }
.legend { margin-top: 12px; font-size: 12px; color: #909399; display: flex; align-items: center; gap: 6px; }
.legend i { width: 12px; height: 8px; border-radius: 2px; display: inline-block; margin-left: 12px; }
.legend i.q { background: #409eff; }
.legend i.p { background: #67c23a; }
</style>
