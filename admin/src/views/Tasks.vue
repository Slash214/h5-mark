<template>
  <el-card shadow="never" class="page-card">
    <div class="toolbar">
      <el-input v-model="q.phone" placeholder="手机号" style="width: 180px" clearable @keyup.enter="load" />
      <el-select v-model="q.status" placeholder="状态" style="width: 140px" clearable @change="load">
        <el-option label="待处理" :value="0" /><el-option label="处理中" :value="1" />
        <el-option label="已完成" :value="2" /><el-option label="处理失败" :value="3" />
      </el-select>
      <el-button type="primary" icon="Search" @click="load">查询</el-button>
      <div class="grow"></div>
      <el-tag type="warning" size="large">待处理 {{ pending }}</el-tag>
    </div>

    <el-table :data="list" v-loading="loading" border>
      <el-table-column prop="id" label="ID" width="70" />
      <el-table-column prop="phone" label="号码" width="140" />
      <el-table-column prop="platform_name" label="平台" width="140" />
      <el-table-column label="状态" width="110">
        <template #default="{ row }">
          <el-tag :type="['warning','primary','success','danger'][row.status]" size="small">{{ statusText[row.status] }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="remark" label="备注" min-width="200" show-overflow-tooltip />
      <el-table-column prop="created_at" label="提交时间" width="170" />
      <el-table-column prop="updated_at" label="更新时间" width="170" />
      <el-table-column label="操作" width="110" fixed="right">
        <template #default="{ row }"><el-button link type="primary" @click="edit(row)">处理</el-button></template>
      </el-table-column>
    </el-table>

    <el-pagination class="pager" background layout="total, prev, pager, next"
      :total="total" :page-size="q.size" v-model:current-page="q.page" @current-change="load" />

    <el-dialog v-model="visible" title="更新工单状态" width="460px">
      <el-form label-width="80px">
        <el-form-item label="号码">{{ cur.phone }} · {{ cur.platform_name }}</el-form-item>
        <el-form-item label="状态">
          <el-select v-model="cur.status">
            <el-option label="待处理" :value="0" /><el-option label="处理中" :value="1" />
            <el-option label="已完成" :value="2" /><el-option label="处理失败" :value="3" />
          </el-select>
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="cur.remark" type="textarea" :rows="3" placeholder="用户在 H5 端可见" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="visible = false">取消</el-button>
        <el-button type="primary" @click="save">保存</el-button>
      </template>
    </el-dialog>
  </el-card>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { api } from '../api';

const q = ref({ page: 1, size: 15, phone: '', status: '' });
const list = ref([]); const total = ref(0); const pending = ref(0); const loading = ref(false);
const visible = ref(false); const cur = ref({});
const statusText = { 0: '待处理', 1: '处理中', 2: '已完成', 3: '处理失败' };

async function load() {
  loading.value = true;
  try { const r = await api.tasks(q.value); list.value = r.list; total.value = r.total; pending.value = r.pending; }
  finally { loading.value = false; }
}
function edit(row) { cur.value = { ...row }; visible.value = true; }
async function save() {
  await api.updateTask(cur.value.id, { status: cur.value.status, remark: cur.value.remark });
  visible.value = false; load();
}
onMounted(load);
</script>

<style scoped>.pager { margin-top: 16px; justify-content: flex-end; }</style>
