<template>
  <el-container style="height: 100%">
    <el-aside width="210px" class="aside">
      <div class="logo">号码标记后台</div>
      <el-menu :default-active="$route.path" router background-color="#20222a" text-color="#c9ccd4" active-text-color="#fff">
        <el-menu-item index="/dashboard"><el-icon><DataLine /></el-icon><span>数据概览</span></el-menu-item>
        <el-menu-item index="/orders"><el-icon><List /></el-icon><span>订单管理</span></el-menu-item>
        <el-menu-item index="/members"><el-icon><User /></el-icon><span>会员管理</span></el-menu-item>
        <el-menu-item index="/tasks"><el-icon><Tickets /></el-icon><span>处理工单</span></el-menu-item>
        <el-menu-item index="/articles"><el-icon><Document /></el-icon><span>文章管理</span></el-menu-item>
        <el-menu-item index="/platforms"><el-icon><Grid /></el-icon><span>平台配置</span></el-menu-item>
        <el-menu-item index="/config"><el-icon><Setting /></el-icon><span>系统配置</span></el-menu-item>
      </el-menu>
    </el-aside>
    <el-container>
      <el-header class="header">
        <span class="title">{{ $route.meta.title }}</span>
        <div class="grow"></div>
        <el-dropdown @command="onCmd">
          <span class="user">{{ name }} <el-icon><ArrowDown /></el-icon></span>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="pwd">修改密码</el-dropdown-item>
              <el-dropdown-item command="out" divided>退出登录</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </el-header>
      <el-main><router-view /></el-main>
    </el-container>
  </el-container>

  <el-dialog v-model="pwdVisible" title="修改密码" width="420px">
    <el-form label-width="90px">
      <el-form-item label="原密码"><el-input v-model="pwd.oldPassword" type="password" show-password /></el-form-item>
      <el-form-item label="新密码"><el-input v-model="pwd.newPassword" type="password" show-password /></el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="pwdVisible = false">取消</el-button>
      <el-button type="primary" @click="savePwd">确定</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { api, clearToken } from '../api';

const router = useRouter();
const name = ref('管理员');
const pwdVisible = ref(false);
const pwd = ref({ oldPassword: '', newPassword: '' });

onMounted(async () => {
  try { const p = await api.profile(); name.value = p.nickname || p.username; } catch (e) { /* */ }
});

function onCmd(c) {
  if (c === 'out') { clearToken(); router.push('/login'); }
  if (c === 'pwd') { pwd.value = { oldPassword: '', newPassword: '' }; pwdVisible.value = true; }
}
async function savePwd() {
  await api.changePassword(pwd.value);
  pwdVisible.value = false;
}
</script>

<style scoped>
.aside { background: #20222a; }
.logo { height: 60px; line-height: 60px; text-align: center; color: #fff; font-size: 16px; font-weight: 600; }
:deep(.el-menu) { border-right: none; }
.header { background: #fff; display: flex; align-items: center; border-bottom: 1px solid #ebeef5; }
.title { font-size: 16px; font-weight: 600; }
.user { cursor: pointer; display: flex; align-items: center; gap: 4px; }
</style>
