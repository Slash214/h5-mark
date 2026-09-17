<template>
  <el-card shadow="never" class="page-card">
    <div class="toolbar">
      <el-input v-model="q.phone" placeholder="手机号" style="width: 170px" clearable @keyup.enter="load" />
      <el-input v-model="q.orderNo" placeholder="订单号" style="width: 220px" clearable @keyup.enter="load" />
      <el-select v-model="q.status" placeholder="状态" style="width: 130px" clearable @change="load">
        <el-option label="待支付" :value="0" /><el-option label="已支付" :value="1" />
        <el-option label="已关闭" :value="2" /><el-option label="已退款" :value="3" />
      </el-select>
      <el-button type="primary" icon="Search" @click="load">查询</el-button>
      <div class="grow"></div>
      <el-tag type="success" size="large">筛选结果已收款 ¥{{ (paidAmount / 100).toFixed(2) }}</el-tag>
    </div>

    <el-table :data="list" v-loading="loading" border>
      <el-table-column prop="order_no" label="订单号" width="200" />
      <el-table-column prop="phone" label="号码" width="130" />
      <el-table-column label="金额" width="100">
        <template #default="{ row }">¥{{ (row.amount / 100).toFixed(2) }}</template>
      </el-table-column>
      <el-table-column prop="days" label="天数" width="70" />
      <el-table-column label="状态" width="100">
        <template #default="{ row }">
          <el-tag :type="['info','success','warning','danger'][row.status]" size="small">{{ statusText[row.status] }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="transaction_id" label="微信支付单号" width="200" show-overflow-tooltip />
      <el-table-column prop="paid_at" label="支付时间" width="170" />
      <el-table-column prop="created_at" label="下单时间" width="170" />
      <el-table-column label="操作" width="170" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" @click="sync(row)">同步微信</el-button>
          <el-popconfirm v-if="row.status !== 1" title="确认手动补单并开通会员？" @confirm="markPaid(row)">
            <template #reference><el-button link type="warning">补单</el-button></template>
          </el-popconfirm>
        </template>
      </el-table-column>
    </el-table>

    <el-pagination class="pager" background layout="total, prev, pager, next"
      :total="total" :page-size="q.size" v-model:current-page="q.page" @current-change="load" />
  </el-card>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { api } from '../api';

const q = ref({ page: 1, size: 15, phone: '', orderNo: '', status: '' });
const list = ref([]); const total = ref(0); const paidAmount = ref(0); const loading = ref(false);
const statusText = { 0: '待支付', 1: '已支付', 2: '已关闭', 3: '已退款' };

async function load() {
  loading.value = true;
  try { const r = await api.orders(q.value); list.value = r.list; total.value = r.total; paidAmount.value = r.paidAmount; }
  finally { loading.value = false; }
}
async function sync(row) { await api.syncOrder(row.order_no); load(); }
async function markPaid(row) { await api.markOrderPaid(row.order_no); load(); }
onMounted(load);
</script>

<style scoped>.pager { margin-top: 16px; justify-content: flex-end; }</style>
