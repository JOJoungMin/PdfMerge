# Stage 1: Builder - 애플리케이션 빌드 단계
FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/

RUN apk add --no-cache build-base cairo-dev jpeg-dev pango-dev giflib-dev pkgconfig
RUN npm install

RUN npx prisma generate
COPY . .
RUN npm run build

# ---

# Stage 2: Runner - 애플리케이션 실행 단계
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN apk add --no-cache cairo jpeg pango giflib

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./

COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules/.prisma ./.prisma
# ✅ prisma/schema.prisma 파일을 복사하는 이 한 줄이 추가되었습니다.
COPY --from=builder /app/prisma ./prisma/

EXPOSE 3000

# 컨테이너 시작 시 마이그레이션 실행 후 서버 시작
CMD ["sh", "-c", "npx prisma migrate deploy && npm start -H 0.0.0.0"]