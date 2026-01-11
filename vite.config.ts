import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  base: '/pindou/',
  build: {
    outDir: 'build',
    rollupOptions: {
      output: {
        manualChunks: {
          // 将 React 相关库单独打包
          'react-vendor': ['react', 'react-dom'],
          // 将 Ant Design 单独打包（这是最大的库）
          'antd-vendor': ['antd'],
          // 将大型工具库单独打包
          'utils-vendor': ['xlsx', 'color-diff'],
        },
      },
    },
    chunkSizeWarningLimit: 600,
  },
  server: {
    port: 3000,
    open: true,
  },
});

