<template>
  <div class="login-bg">
    <el-card class="box">
      <h2>号码标记 · 管理后台</h2>
      <el-form :model="form" @keyup.enter="submit">
        <el-form-item>
          <el-input v-model="form.username" placeholder="用户名" prefix-icon="User" size="large" />
        </el-form-item>
        <el-form-item>
          <el-input v-model="form.password" type="password" placeholder="密码" prefix-icon="Lock" size="large" show-password />
        </el-form-item>
        <el-button type="primary" size="large" style="width: 100%" :loading="loading" @click="submit">登录</el-button>
      </el-form>
      <p class="tip">默认账号 admin / admin888，登录后请立即修改密码</p>
    </el-card>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { api, setToken } from '../api';

const router = useRouter();
const form = ref({ username: 'admin', password: '' });
const loading = ref(false);

async function submit() {
  loading.value = true;
  try {
    const r = await api.login(form.value);
    setToken(r.token);
    router.push('/dashboard');
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.login-bg { height: 100%; display: flex; align-items: center; justify-content: center;
  background: linear-gradient(135deg, #2f5bef, #1e2f8c); }
.box { width: 380px; padding: 10px 14px 20px; }
h2 { text-align: center; margin: 6px 0 24px; font-size: 20px; }
.tip { margin-top: 16px; font-size: 12px; color: #909399; text-align: center; }
</style>
