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
    // Docker on Windows：宿主机文件系统变更不会触发 Linux 容器内的 inotify 事件
    // 必须开启轮询模式，让 Vite 主动定时检查文件是否变化（代价是 CPU 稍高，开发环境可接受）
    watch: {
      usePolling: true,   // 启用轮询，解决 Windows+Docker 下 HMR 不生效的问题
      interval: 300,      // 每 300ms 轮询一次，平衡实时性和 CPU 占用
    },
    proxy: {
      '/api': {
        // Docker Desktop（Windows/Mac）提供 host.docker.internal 让容器内能访问宿主机
        // 后端已在宿主机上映射 8000 端口（docker-compose ports: 8000:8000），走这条路可靠
        // 注意：不能用 backend:8000，Vite 的 http-proxy 无法正确解析 Docker 内部服务名
        target: 'http://host.docker.internal:8000',
        changeOrigin: true,
      },
    },
  },
})
