# 1. Base Image
# Node.js 18-slim 버전을 기반으로 합니다. 가볍고 필요한 대부분의 도구를 포함하고 있습니다.
FROM node:18-slim

# Install git for version info
RUN apt-get update && apt-get install -y git --no-install-recommends && \
    rm -rf /var/lib/apt/lists/*

# 2. Install Ghostscript
# apt-get 패키지 매니저를 업데이트하고 ghostscript를 설치합니다.
# -y 플래그는 모든 프롬프트에 자동으로 yes라고 답해줍니다.
# --no-install-recommends는 불필요한 추천 패키지를 설치하지 않아 이미지를 가볍게 유지합니다.
RUN apt-get update && apt-get install -y ghostscript --no-install-recommends && \
    # 캐시 정리하여 최종 이미지 크기를 줄입니다.
    rm -rf /var/lib/apt/lists/*

# Set Git commit hash as an environment variable for the dev server
RUN echo "NEXT_PUBLIC_GIT_COMMIT_SHA=$(git rev-parse HEAD)" > .env.local

# 3. Set Working Directory

# 컨테이너 내부에서 작업할 디렉토리를 설정합니다.
WORKDIR /app

# 4. Copy package files and Install Dependencies
# 소스 코드를 복사하기 전에 package.json 파일을 먼저 복사하여 의존성을 설치합니다.
# 이렇게 하면 소스 코드가 변경되어도 의존성이 바뀌지 않았다면 Docker는 캐시된 레이어를 사용해 빌드 시간을 단축합니다.
COPY . .
COPY test_files /app/test_files
RUN npm install && npx prisma generate

# 6. Build the App
# 프로덕션용으로 Next.js 애플리케이션을 빌드합니다.

# 7. Expose Port
# 컨테이너가 3000번 포트를 외부에 노출하도록 설정합니다.
EXPOSE 3000

# 8. Set Default Command
# 컨테이너가 시작될 때 실행될 기본 명령어를 설정합니다.
CMD ["npm", "run", "dev"]
