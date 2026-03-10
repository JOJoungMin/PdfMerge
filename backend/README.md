# PDF Utils Backend (NestJS)

`web` 프론트엔드에서 호출하는 PDF API 서버입니다.

## 엔드포인트

| 메서드 | 경로 | 설명 |
|--------|------|------|
| POST | /api/pdf-merge | 여러 PDF 병합 |
| POST | /api/pdf-edit-combined | 페이지 추출·재배치 |
| POST | /api/pdf-preview | 미리보기(썸네일 + 페이지 수) |
| POST | /api/pdf-compress | PDF 압축 |
| POST | /api/pdf-convert | PDF → 이미지(ZIP) |

## 설치 및 실행

**Docker (권장, gs/pdfinfo 포함)**

```bash
cd backend
docker build -t pdf-utils-backend .
docker run -p 3001:3001 pdf-utils-backend
```

**로컬 직접 실행**

```bash
cd backend
npm install
npm run start:dev   # 개발 (watch)
# 또는
npm run build && npm run start:prod
```

기본 포트: **3001** (환경변수 `PORT`로 변경 가능)

## 프론트엔드 연동

`web` 프로젝트에서 환경변수로 백엔드 URL 지정:

- 로컬: `NEXT_PUBLIC_API_URL=http://localhost:3001`
- 배포: `NEXT_PUBLIC_API_URL=https://your-backend-url.com`

(끝에 `/api` 붙이지 않음 — 프론트가 이미 `/api/pdf-merge` 등으로 호출함)

## 시스템 요구사항

- **pdf-merge, pdf-edit-combined**: Node만 필요 (pdf-lib)
- **pdf-preview, pdf-compress, pdf-convert**: 서버에 설치 필요
  - [Ghostscript](https://www.ghostscript.com/) (`gs`)
  - [Poppler](https://poppler.freedesktop.org/) (`pdfinfo` — 미리보기 페이지 수용)

Windows: Chocolatey `choco install ghostscript poppler`  
macOS: `brew install ghostscript poppler`  
Linux: `apt install ghostscript poppler-utils` 등

- **pdf-redact** (문자열 블라인드): 텍스트 추출 비교용으로 Poppler `pdftotext`를 사용할 수 있음.  
  cmd에서는 `pdftotext`가 보이는데 Nest(IDE 터미널)에서만 못 찾을 때는 **PATH 대신 전체 경로**를 쓰면 됨.  
  - 예: `PDFTOTEXT_PATH=C:\poppler-25.12.0\Library\bin\pdftotext.exe` (프로젝트 루트 `.env` 또는 터미널에서 설정)

- **OCR (tesseract.js)**: pdfjs가 텍스트를 0자만 뽑을 때(폰트 오류 등) **이미지처럼 인식해 텍스트를 추출**하려면 OCR을 씁니다.  
  - `npm install tesseract.js` 로 설치 후, pdf-redact 요청 시 pdfjs가 0자면 **Ghostscript로 1페이지를 PNG로 렌더 → Tesseract.js로 한글+영어 인식**해 콘솔에 로그합니다.  
  - OCR은 **텍스트 추출만** 하고, 블라인드 좌표는 당분간 pdfjs만 사용합니다. (OCR bbox로 가리기는 추후 확장 가능)

이미지 미리보기/압축/변환 없이 **병합·편집만** 쓰려면 `gs`/`pdfinfo` 없이도 동작합니다.

금일 일감 정리 

페이지 구성 정리. , 기능 추가, 
