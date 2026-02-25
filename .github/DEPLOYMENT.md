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
| `VERCEL_DEPLOY_HOOK_URL` | Vercel Deploy Hook URL | Vercel 프로젝트 → Settings → Git → Deploy Hooks에서 생성 |

## EC2 사전 설정

1. **포트 열기**: Security Group에서 3000(프론트), 3001(백엔드) 인바운드 허용
2. **PM2 설치**: `npm install -g pm2`
3. **저장소 클론**: `git clone https://github.com/owner/mergepdf.git` (또는 해당 경로)
4. **백엔드/프론트 최소 1회 수동 빌드**로 `node_modules` 등 준비

## Vercel Deploy Hook

1. Vercel 대시보드 → 해당 프로젝트
2. Settings → Git → Deploy Hooks
3. "Create Hook" → 예: `production-deploy`
4. 생성된 URL을 `VERCEL_DEPLOY_HOOK_URL` 시크릿에 등록

## 파이프라인 흐름

```
push to main → EC2 배포 (backend + frontend) → Playwright E2E 실행
→ 테스트 통과 시 → Vercel Deploy Hook 호출 (프로덕션 배포)
```
