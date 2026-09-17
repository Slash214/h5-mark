<template>
  <el-card shadow="never" class="page-card">
    <div class="toolbar">
      <el-input v-model="q.keyword" placeholder="标题关键词" style="width: 200px" clearable @keyup.enter="load" />
      <el-select v-model="q.category" placeholder="分类" style="width: 150px" clearable @change="load">
        <el-option label="资讯文章" value="news" />
        <el-option label="申诉说明" value="appeal" />
        <el-option label="帮助中心" value="help" />
      </el-select>
      <el-button type="primary" icon="Search" @click="load">查询</el-button>
      <div class="grow"></div>
      <el-button type="primary" icon="Plus" @click="openEdit()">发布文章</el-button>
    </div>

    <el-table :data="list" v-loading="loading" border>
      <el-table-column prop="id" label="ID" width="70" />
      <el-table-column label="封面" width="90">
        <template #default="{ row }"><el-image v-if="row.cover" :src="row.cover" style="width: 56px; height: 40px" fit="cover" /></template>
      </el-table-column>
      <el-table-column prop="title" label="标题" min-width="220" show-overflow-tooltip />
      <el-table-column label="类型" width="110">
        <template #default="{ row }">
          <el-tag v-if="row.type === 1" type="success" size="small">公众号外链</el-tag>
          <el-tag v-else size="small">站内文章</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="category" label="分类" width="90" />
      <el-table-column prop="views" label="阅读" width="80" />
      <el-table-column label="状态" width="90">
        <template #default="{ row }">
          <el-tag :type="row.status ? 'success' : 'info'" size="small">{{ row.status ? '已上架' : '已下架' }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="created_at" label="创建时间" width="170" />
      <el-table-column label="操作" width="150" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" @click="openEdit(row)">编辑</el-button>
          <el-popconfirm title="确定删除？" @confirm="del(row)">
            <template #reference><el-button link type="danger">删除</el-button></template>
          </el-popconfirm>
        </template>
      </el-table-column>
    </el-table>

    <el-pagination class="pager" background layout="total, prev, pager, next"
      :total="total" :page-size="q.size" v-model:current-page="q.page" @current-change="load" />

    <el-drawer v-model="visible" :title="form.id ? '编辑文章' : '发布文章'" size="720px">
      <el-form label-width="120px">
        <el-form-item label="文章来源">
          <el-radio-group v-model="form.type">
            <el-radio-button :label="0">站内文章</el-radio-button>
            <el-radio-button :label="1">公众号外链</el-radio-button>
          </el-radio-group>
          <div class="tip">选「公众号外链」时，H5 列表点击后直接跳转到你的公众号文章链接。</div>
        </el-form-item>
        <el-form-item label="标题" required><el-input v-model="form.title" /></el-form-item>
        <el-form-item label="分类">
          <el-select v-model="form.category" style="width: 180px">
            <el-option label="资讯文章" value="news" />
            <el-option label="申诉说明" value="appeal" />
            <el-option label="帮助中心" value="help" />
          </el-select>
        </el-form-item>
        <el-form-item v-if="form.type === 1" label="公众号文章链接" required>
          <el-input v-model="form.source_url" placeholder="https://mp.weixin.qq.com/s/xxxx" />
        </el-form-item>
        <el-form-item label="封面图"><UploadImage v-model="form.cover" /></el-form-item>
        <el-form-item label="摘要"><el-input v-model="form.summary" type="textarea" :rows="2" /></el-form-item>
        <el-form-item v-if="form.type === 0" label="正文（HTML）">
          <el-input v-model="form.content" type="textarea" :rows="14" placeholder="支持 HTML，如 <h3>标题</h3><p>正文</p>" />
        </el-form-item>
        <el-form-item label="置顶"><el-switch v-model="form.top" :active-value="1" :inactive-value="0" /></el-form-item>
        <el-form-item label="排序"><el-input-number v-model="form.sort" :min="0" /></el-form-item>
        <el-form-item label="上架"><el-switch v-model="form.status" :active-value="1" :inactive-value="0" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="visible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="save">保存</el-button>
      </template>
    </el-drawer>
  </el-card>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { api } from '../api';
import UploadImage from '../components/UploadImage.vue';

const q = ref({ page: 1, size: 15, keyword: '', category: '' });
const list = ref([]); const total = ref(0);
const loading = ref(false); const saving = ref(false); const visible = ref(false);
const blank = { id: null, title: '', cover: '', summary: '', content: '', source_url: '', type: 0, category: 'news', status: 1, top: 0, sort: 0 };
const form = ref({ ...blank });

async function load() {
  loading.value = true;
  try { const r = await api.articles(q.value); list.value = r.list; total.value = r.total; }
  finally { loading.value = false; }
}
async function openEdit(row) {
  form.value = row ? await api.article(row.id) : { ...blank };
  visible.value = true;
}
async function save() {
  saving.value = true;
  try {
    if (form.value.id) await api.updateArticle(form.value.id, form.value);
    else await api.createArticle(form.value);
    visible.value = false; load();
  } finally { saving.value = false; }
}
async function del(row) { await api.deleteArticle(row.id); load(); }
onMounted(load);
</script>

<style scoped>
.pager { margin-top: 16px; justify-content: flex-end; }
.tip { font-size: 12px; color: #909399; margin-top: 6px; }
</style>
