# PDF Merge Web (프론트엔드)

FSD 패턴 기반 Next.js 프론트엔드. Vercel 배포용.

## 로컬 실행

```bash
cd web
npm install
npm run dev
```

http://localhost:3000 접속

## Vercel 배포

1. [Vercel](https://vercel.com) 접속 → New Project
2. GitHub 저장소 연결
3. **Root Directory**: `web` 지정
4. 환경 변수 (선택):
   - `NEXT_PUBLIC_API_URL`: 백엔드 API URL (예: `https://api.xxx.com`)
5. Deploy

## 환경 변수

| 변수 | 설명 |
|------|------|
| `NEXT_PUBLIC_API_URL` | 백엔드 API URL. 비우면 상대 경로 `/api` 사용 |
| `NEXT_PUBLIC_ASSET_PREFIX` | 정적 자산 prefix (선택) |

## 현재 상태

- UI: 메인 메뉴, 병합/압축/변환/편집 페이지
- API 미연결: 백엔드 없이 placeholder 표시. `NEXT_PUBLIC_API_URL` 설정 시 실제 동작
