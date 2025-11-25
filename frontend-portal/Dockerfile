FROM node:20-alpine AS base
WORKDIR /app

# 安裝依賴
COPY package.json ./
RUN corepack enable && corepack prepare pnpm@latest --activate
RUN pnpm i

# 複製所有檔案
COPY . .

# 建置 Next.js（standalone）
RUN pnpm run build

# Production
FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=base /app/.next/standalone ./
COPY --from=base /app/.next/static ./.next/static
COPY --from=base /app/public ./public
EXPOSE 3000
CMD ["node", "server.js"]
