FROM node:20-alpine AS base
WORKDIR /app

COPY package.json .
RUN corepack enable && corepack prepare pnpm@latest --activate
RUN pnpm i

COPY . .

ENV NEXT_PUBLIC_JAVA_API_URL=http://java-api:8080
ENV NEXT_PUBLIC_ML_API_URL=http://ml-api:8000

RUN pnpm run build

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production

COPY --from=base /app/.next/standalone ./
COPY --from=base /app/.next/static ./.next/static
COPY --from=base /app/public ./public

ENV HOST=0.0.0.0

EXPOSE 3000
CMD ["node", "server.js"]
