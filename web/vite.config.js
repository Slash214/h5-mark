import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import pxToViewport from 'postcss-px-to-viewport-8-plugin';

export default defineConfig({
  plugins: [vue()],
  base: './',
  css: {
    postcss: {
      plugins: [
        // 375 设计稿，写 px 自动转 vw，实现移动端响应式
        pxToViewport({
          viewportWidth: 375,
          unitPrecision: 5,
          propList: ['*'],
          selectorBlackList: ['.ignore-vw'],
          minPixelValue: 1,
          mediaQuery: false,
        }),
      ],
    },
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      '/api': { target: 'http://127.0.0.1:3000', changeOrigin: true },
      '/uploads': { target: 'http://127.0.0.1:3000', changeOrigin: true },
    },
  },
  build: { outDir: 'dist', assetsDir: 'static', chunkSizeWarningLimit: 1500 },
});
