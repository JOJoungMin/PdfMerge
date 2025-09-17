# Stage 1: Builder - 애플리케이션 빌드 및 의존성 정리 단계
FROM node:20-alpine AS builder
WORKDIR /app

# 네이티브 모듈 빌드에 필요한 시스템 의존성 설치 (e.g., canvas)
RUN apk add --no-cache build-base python3 make g++ cairo-dev jpeg-dev pango-dev giflib-dev

# package.json, package-lock.json, prisma 스키마 복사
COPY package*.json ./
COPY prisma ./prisma/

# 전체 의존성 설치
RUN npm install

# Prisma 클라이언트 생성
RUN npx prisma generate

# 나머지 소스 코드 복사
COPY . .

# Next.js 애플리케이션 빌드
RUN npm run build

# 프로덕션용이 아닌 의존성(devDependencies) 제거
RUN npm prune --production

# --- 

# Stage 2: Runner - 애플리케이션 실행 단계
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

# 빌더 스테이지에서 프로덕션용으로 정리된 파일만 복사
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma

# 애플리케이션이 실행될 포트 노출
EXPOSE 3000

# 마이그레이션 실행 후 애플리케이션 시작
CMD ["sh", "-c", "npx prisma migrate deploy && npm start"]
