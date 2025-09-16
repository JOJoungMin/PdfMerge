# Stage 1: Builder - 애플리케이션 빌드 단계
FROM node:20-alpine AS builder
WORKDIR /app

# package.json, package-lock.json, prisma 스키마 복사
COPY package*.json ./
COPY prisma ./prisma/

# 의존성 설치 (CI 환경에서는 npm ci가 더 안정적이고 빠릅니다)
RUN npm ci

# Prisma 클라이언트 생성
RUN npx prisma generate

# 나머지 소스 코드 복사
COPY . .

# Next.js 애플리케이션 빌드
RUN npm run build

# --- 

# Stage 2: Runner - 애플리케이션 실행 단계
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

# 빌드 단계에서 프로덕션용 의존성만 복사
COPY --from=builder /app/package*.json ./
RUN npm ci --omit=dev

# 빌드 단계에서 생성된 빌드 결과물 복사
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public

# 애플리케이션이 실행될 포트 노출
EXPOSE 3000

# 애플리케이션 실행 명령어
CMD ["npm", "start"]