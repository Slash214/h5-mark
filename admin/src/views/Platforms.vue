<template>
  <el-card shadow="never" class="page-card">
    <div class="toolbar">
      <el-alert class="grow" type="info" :closable="false" show-icon
        title="这里配置 H5 首页展示的「支持去除以下平台标记」列表，也是查询结果的平台维度。" />
      <el-button type="primary" icon="Plus" @click="openEdit()">新增平台</el-button>
    </div>

    <el-table :data="list" v-loading="loading" border>
      <el-table-column label="图标" width="80">
        <template #default="{ row }">
          <div class="dot" :style="{ background: row.color }">
            <img v-if="row.icon" :src="row.icon" />
            <span v-else>{{ row.short || row.name.slice(0, 1) }}</span>
          </div>
        </template>
      </el-table-column>
      <el-table-column prop="code" label="标识 code" width="130" />
      <el-table-column prop="name" label="名称" width="120" />
      <el-table-column prop="appeal_url" label="解标跳转" min-width="220" show-overflow-tooltip />
      <el-table-column prop="color" label="颜色" width="100" />
      <el-table-column prop="sort" label="排序" width="80" />
      <el-table-column label="启用" width="80">
        <template #default="{ row }">
          <el-tag :type="row.enabled ? 'success' : 'info'" size="small">{{ row.enabled ? '启用' : '停用' }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="150" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" @click="openEdit(row)">编辑</el-button>
          <el-popconfirm title="确定删除？" @confirm="del(row)">
            <template #reference><el-button link type="danger">删除</el-button></template>
          </el-popconfirm>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog v-model="visible" :title="form.id ? '编辑平台' : '新增平台'" width="560px">
      <el-form label-width="110px">
        <el-form-item label="标识 code" required>
          <el-input v-model="form.code" placeholder="英文，如 360 / baidu；对接第三方接口时用它匹配" />
        </el-form-item>
        <el-form-item label="名称" required><el-input v-model="form.name" /></el-form-item>
        <el-form-item label="图标文字"><el-input v-model="form.short" maxlength="2" placeholder="圆形图标里的 1-2 个字" /></el-form-item>
        <el-form-item label="颜色"><el-color-picker v-model="form.color" /></el-form-item>
        <el-form-item label="图标图片"><UploadImage v-model="form.icon" /></el-form-item>
        <el-form-item label="解标跳转 URL">
          <el-input v-model="form.appeal_url" placeholder="会员点「立即处理」跳到此官方申诉页" />
        </el-form-item>
        <el-form-item label="排序"><el-input-number v-model="form.sort" :min="0" /></el-form-item>
        <el-form-item label="启用"><el-switch v-model="form.enabled" :active-value="1" :inactive-value="0" /></el-form-item>
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
import UploadImage from '../components/UploadImage.vue';

const list = ref([]); const loading = ref(false); const visible = ref(false);
const blank = { id: null, code: '', name: '', short: '', color: '#2b4acb', icon: '', appeal_url: '', sort: 0, enabled: 1 };
const form = ref({ ...blank });

async function load() {
  loading.value = true;
  try { list.value = await api.platforms(); } finally { loading.value = false; }
}
function openEdit(row) { form.value = row ? { ...row } : { ...blank }; visible.value = true; }
async function save() {
  if (form.value.id) await api.updatePlatform(form.value.id, form.value);
  else await api.createPlatform(form.value);
  visible.value = false; load();
}
async function del(row) { await api.deletePlatform(row.id); load(); }
onMounted(load);
</script>

<style scoped>
.dot { width: 40px; height: 40px; border-radius: 50%; color: #fff; display: flex;
  align-items: center; justify-content: center; font-weight: 700; overflow: hidden; }
.dot img { width: 100%; height: 100%; object-fit: cover; }
</style>
