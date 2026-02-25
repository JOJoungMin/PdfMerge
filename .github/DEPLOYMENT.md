# GitHub Actions 배포 설정

## 필요한 변수 (Variables)

**Settings → Secrets and variables → Actions → Variables**에서 설정

| 변수명 | 설명 | 예시 |
|--------|------|------|
| `EC2_HOST` | EC2 퍼블릭 IP 또는 도메인 | `54.123.45.67` 또는 `staging.example.com` |
| `EC2_USER` | EC2 SSH 사용자명 | `ubuntu` (Ubuntu AMI) / `ec2-user` (Amazon Linux) |
| `EC2_PROJECT_PATH` | EC2 내 프로젝트 루트 경로 | `/home/ubuntu/mergepdf` |
| `EC2_BACKEND_URL` | 백엔드 API URL (프론트 빌드 시 `NEXT_PUBLIC_API_URL`) | `http://54.123.45.67:3001` |
| `E2E_BASE_URL` | E2E 테스트 대상 프론트 URL | `http://54.123.45.67:3000` |

## 필요한 시크릿 (Secrets)

**Settings → Secrets and variables → Actions → Secrets**에서 설정

| 시크릿명 | 설명 | 설정 방법 |
|----------|------|-----------|
| `EC2_SSH_KEY` | EC2 SSH 비밀키 전체 내용 | EC2 키 페어 `.pem` 파일 내용 복사 |
| `AWS_ACCESS_KEY_ID` | ECR push용 AWS 액세스 키 | IAM 사용자 생성 후 액세스 키 발급 (ECR push 권한 필요) |
| `AWS_SECRET_ACCESS_KEY` | ECR push용 AWS 시크릿 키 | 위 IAM 사용자의 시크릿 키 |
| `VERCEL_DEPLOY_HOOK_URL` | Vercel Deploy Hook URL | Vercel 프로젝트 → Settings → Git → Deploy Hooks에서 생성 |

## EC2 사전 설정

1. **포트 열기**: Security Group에서 3000(프론트), 3001(백엔드) 인바운드 허용
2. **Docker 설치**: 백엔드 컨테이너(`pdf-api`) 실행용
3. **AWS CLI 설치 + ECR 접근 권한**: EC2에서 `docker pull` 하려면 IAM 역할에 `AmazonEC2ContainerRegistryReadOnly` 정책 연결 (또는 해당 ECR 저장소 읽기 권한)
4. **PM2 설치**: `npm install -g pm2` (프론트 서빙용)
5. **저장소 클론**: `git clone ...` 후 **web** 쪽만 최소 1회 수동 빌드로 `node_modules` 준비

## Vercel Deploy Hook

1. Vercel 대시보드 → 해당 프로젝트
2. Settings → Git → Deploy Hooks
3. "Create Hook" → 예: `production-deploy`
4. 생성된 URL을 `VERCEL_DEPLOY_HOOK_URL` 시크릿에 등록

## 파이프라인 흐름

```
push to main
  → 백엔드 Docker 이미지 빌드 → ECR push
  → EC2: docker pull 후 pdf-api 컨테이너 재시작 (백엔드)
  → EC2: git pull, web 빌드, PM2로 프론트 재시작
  → Playwright E2E 실행 (EC2 스테이징 대상)
  → 테스트 통과 시 → Vercel Deploy Hook 호출 (프로덕션 배포)
```
