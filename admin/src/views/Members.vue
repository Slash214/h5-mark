<template>
  <el-card shadow="never" class="page-card">
    <div class="toolbar">
      <el-input v-model="q.phone" placeholder="手机号" style="width: 180px" clearable @keyup.enter="load" />
      <el-select v-model="q.valid" placeholder="有效性" style="width: 140px" clearable @change="load">
        <el-option label="有效" value="1" /><el-option label="已过期" value="0" />
      </el-select>
      <el-button type="primary" icon="Search" @click="load">查询</el-button>
      <div class="grow"></div>
      <el-button type="primary" icon="Plus" @click="grantVisible = true">手动开通/赠送</el-button>
    </div>

    <el-table :data="list" v-loading="loading" border>
      <el-table-column prop="phone" label="号码" width="140" />
      <el-table-column label="状态" width="110">
        <template #default="{ row }">
          <el-tag :type="row.valid ? 'success' : 'info'" size="small">{{ row.valid ? '会员有效' : '已过期' }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="expire_at" label="到期时间" width="180" />
      <el-table-column label="剩余" width="100">
        <template #default="{ row }">{{ leftDays(row.expire_at) }} 天</template>
      </el-table-column>
      <el-table-column prop="total_days" label="累计天数" width="100" />
      <el-table-column prop="openid" label="openid" min-width="200" show-overflow-tooltip />
      <el-table-column prop="created_at" label="首次开通" width="170" />
      <el-table-column label="操作" width="190" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" @click="editExpire(row)">改到期时间</el-button>
          <el-popconfirm title="确定删除该会员记录？" @confirm="del(row)">
            <template #reference><el-button link type="danger">删除</el-button></template>
          </el-popconfirm>
        </template>
      </el-table-column>
    </el-table>

    <el-pagination class="pager" background layout="total, prev, pager, next"
      :total="total" :page-size="q.size" v-model:current-page="q.page" @current-change="load" />

    <el-dialog v-model="grantVisible" title="手动开通 / 赠送天数" width="440px">
      <el-form label-width="90px">
        <el-form-item label="手机号"><el-input v-model="grant.phone" maxlength="11" /></el-form-item>
        <el-form-item label="天数">
          <el-input-number v-model="grant.days" :min="-3650" :max="3650" />
          <div class="tip">正数为增加；未到期会在原到期时间上叠加。</div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="grantVisible = false">取消</el-button>
        <el-button type="primary" @click="doGrant">确定</el-button>
      </template>
    </el-dialog>
  </el-card>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { ElMessageBox } from 'element-plus';
import { api } from '../api';

const q = ref({ page: 1, size: 15, phone: '', valid: '' });
const list = ref([]); const total = ref(0); const loading = ref(false);
const grantVisible = ref(false);
const grant = ref({ phone: '', days: 30 });

function leftDays(exp) {
  const d = Math.ceil((new Date(exp.replace(/-/g, '/')) - Date.now()) / 86400000);
  return d > 0 ? d : 0;
}
async function load() {
  loading.value = true;
  try { const r = await api.members(q.value); list.value = r.list; total.value = r.total; }
  finally { loading.value = false; }
}
async function doGrant() {
  await api.grantMember(grant.value);
  grantVisible.value = false; load();
}
async function editExpire(row) {
  const { value } = await ElMessageBox.prompt('请输入新的到期时间', '修改到期时间', {
    inputValue: row.expire_at, inputPlaceholder: '2026-12-31 23:59:59',
  });
  await api.setMemberExpire(row.phone, value);
  load();
}
async function del(row) { await api.deleteMember(row.id); load(); }
onMounted(load);
</script>

<style scoped>
.pager { margin-top: 16px; justify-content: flex-end; }
.tip { font-size: 12px; color: #909399; }
</style>
