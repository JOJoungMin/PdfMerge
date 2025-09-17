# Stage 1: Builder - 애플리케이션 빌드 단계
FROM node:20-alpine AS builder
WORKDIR /app

# package.json, package-lock.json, prisma 스키마 복사
COPY package*.json ./
COPY prisma ./prisma/

# canvas 패키지 빌드에 필요한 모든 시스템 도구 및 라이브러리 설치
RUN apk add --no-cache build-base cairo-dev jpeg-dev pango-dev giflib-dev pkgconfig

# 의존성 설치
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

# canvas 실행에 필요한 런타임 라이브러리 설치
RUN apk add --no-cache cairo jpeg pango giflib

# ✅ Builder에서 모든 의존성 파일(node_modules)을 통째로 복사
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./

# 빌드 단계에서 생성된 빌드 결과물 복사
COPY --from=builder /app/.next ./.next
# public 폴더가 없다면 이 줄은 삭제하거나 주석 처리하세요.
# COPY --from=builder /app/public ./public
COPY --from=builder /app/node_modules/.prisma ./.prisma

# 애플리케이션이 실행될 포트 노출
EXPOSE 3000

# 애플리케이션 실행 명령어
CMD ["sh", "-c", "npx prisma migrate deploy && npm start -H 0.0.0.0"]