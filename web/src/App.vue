<template>
  <router-view v-slot="{ Component }">
    <keep-alive include="Home">
      <component :is="Component" />
    </keep-alive>
  </router-view>
</template>

<script setup>
import { onMounted } from 'vue';
import { loadConfig } from './store';

onMounted(() => {
  loadConfig().catch(() => {});
});
</script>
