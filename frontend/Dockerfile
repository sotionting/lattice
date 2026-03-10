# 使用 Node.js 20 Debian slim 版（glibc）作为基础镜像
FROM node:20-slim

# 设置容器内的工作目录
WORKDIR /app

# 声明对外暴露 5173 端口（Vite 开发服务器默认端口）
EXPOSE 5173

# 注意：npm install 不在构建时运行，而是在容器启动时通过 docker-compose command 运行
# 原因：若 build 时安装 node_modules 后再通过 named volume + bind mount 覆盖，
# Docker 无法可靠地将 image 内 node_modules 初始化到空 volume，导致 rollup 找不到原生二进制。
# 在容器启动时运行 npm install 可确保在 Linux glibc 环境中安装正确的原生二进制。
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
