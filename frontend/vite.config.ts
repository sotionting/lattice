import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    host: '0.0.0.0',  // 监听所有网络接口
    // Docker on Windows：宿主机文件系统变更不会触发 Linux 容器内的 inotify 事件
    // 必须开启轮询模式，让 Vite 主动定时检查文件是否变化（代价是 CPU 稍高，开发环境可接受）
    watch: {
      usePolling: true,   // 启用轮询，解决 Windows+Docker 下 HMR 不生效的问题
      interval: 300,      // 每 300ms 轮询一次，平衡实时性和 CPU 占用
    },
    proxy: {
      '/api': {
        // 通过 Docker 网络内的 Nginx 容器处理 API 请求
        // 同一个 agent_network 内，frontend 和 nginx 可以用服务名直接通信
        target: 'http://nginx',
        changeOrigin: true,
      },
    },
  },
})
