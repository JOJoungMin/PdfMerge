# Stage 1: Builder - 애플리케이션 빌드 단계
FROM node:20-alpine AS builder
WORKDIR /app

# package.json, package-lock.json, prisma 스키마 복사
COPY package*.json ./
COPY prisma ./prisma/

# ✅ C++ 애드온 빌드에 필요한 시스템 도구 설치
RUN apk add --no-cache python3 make g++

# 의존성 설치 (빌드 환경의 유연성을 위해 npm install 사용)
RUN npm install

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

# ✅ C++ 애드온 실행에 필요할 수 있는 런타임 라이브러리 설치 (예방 차원)
RUN apk add --no-cache libc6-compat

# 프로덕션용 의존성만 설치
RUN npm install --omit=dev

# 빌드 단계에서 생성된 빌드 결과물 복사
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/node_modules/.prisma ./.prisma

# 애플리케이션이 실행될 포트 노출
EXPOSE 3000

# 애플리케이션 실행 명령어
CMD ["npm", "start"]