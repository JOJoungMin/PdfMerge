# ======================================================================================
# STAGE 1: Builder
# - 소스 코드를 빌드하고, 운영에 필요한 최소한의 결과물을 생성하는 단계
# ======================================================================================
FROM node:18-slim AS builder

# 시스템 패키지 업데이트 및 ghostscript, poppler-utils 설치
RUN apt-get update && apt-get install -y \
    ghostscript \
    poppler-utils \
    --no-install-recommends && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# 의존성 설치
COPY package*.json ./
RUN npm install

# 소스 코드 복사 및 빌드
COPY . .
RUN npx prisma generate
RUN npm run build

# ======================================================================================
# STAGE 2: Runner
# - 빌드된 결과물만 가져와 실제 애플리케이션을 실행하는 단계
# - 빌드에만 필요했던 소스코드나 개발용 패키지가 포함되지 않아 가볍고 안전함
# ======================================================================================
FROM node:18-slim AS runner

WORKDIR /app

ENV NODE_ENV=production

# 런타임에 필요한 ghostscript만 설치
RUN apt-get update && apt-get install -y ghostscript --no-install-recommends && \
    rm -rf /var/lib/apt/lists/*

# Builder 스테이지에서 생성된 빌드 결과물만 복사
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder /app/test_files ./test_files

EXPOSE 3000

# Next.js standalone 모드의 공식 실행 명령어
CMD ["node", "server.js"]