<template>
  <div class="up">
    <el-upload
      :action="action"
      :headers="headers"
      name="file"
      :show-file-list="false"
      accept="image/*"
      :on-success="onSuccess"
      :on-error="onError"
    >
      <img v-if="modelValue" :src="modelValue" class="preview" />
      <el-button v-else type="primary" plain icon="Upload">上传图片</el-button>
    </el-upload>
    <el-input v-model="url" placeholder="也可直接粘贴图片地址" style="margin-top: 8px" clearable />
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { getToken } from '../api';
import { ElMessage } from 'element-plus';

const props = defineProps({ modelValue: { type: String, default: '' } });
const emit = defineEmits(['update:modelValue']);

const action = '/api/admin/upload/image';
const headers = computed(() => ({ Authorization: `Bearer ${getToken()}` }));
const url = computed({ get: () => props.modelValue, set: (v) => emit('update:modelValue', v) });

function onError() { ElMessage.error('上传失败'); }

function onSuccess(res) {
  if (res && res.code === 0) emit('update:modelValue', res.data.path);
}
</script>

<style scoped>
.up { max-width: 420px; }
.preview { width: 140px; height: 140px; object-fit: cover; border-radius: 6px; border: 1px solid #ebeef5; }
</style>
