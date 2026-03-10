# PDF-Utils 프로젝트 요약

| PDF-Utils 개인 / 25.08.01 - 진행중 |
| Next.js, NestJS (Node.js), Playwright (E2E), GitHub Actions, Vercel, ECR, Docker, EC2 |

---

## 5개 항목 요약 (직접 작성 버전)

1. **풀스택 PDF 유틸 서비스 기획·구현**  
   Next.js + NestJS로 병합·압축·변환·편집·회전·블라인드(가리기)·페이지번호·이미지→PDF 등 8개 기능을 하나의 웹 서비스로 제공했고, 프론트·백엔드·배포 전 과정을 직접 설계하고 구현했다.

2. **FSD + NestJS 레이어드 아키텍처**  
   프론트는 Feature-Sliced Design(app / widgets / features / shared)으로 기능 단위 분리와 재사용을, 백엔드는 Controller–Service 분리와 모듈(pdf, admin, database 등) 구성으로 확장성과 유지보수성을 고려해 설계했다.

3. **E2E 통과 시에만 프로덕션 배포**  
   GitHub Actions로 백엔드 Docker 빌드·ECR 푸시·EC2 배포 후, EC2 스테이징에서 Playwright E2E를 실행하고, **모든 테스트 통과 시에만** Vercel 프로덕션 배포를 트리거하도록 해 배포 품질을 보장했다.

4. **기능별 REST API + 전달 사이드바 UX**  
   기능마다 전용 REST API를 두고, 처리 결과를 "다른 기능 사용하기" 사이드바로 이어 받아 병합→압축→변환처럼 연속 작업할 수 있도록 API와 전역 상태(transfer sidebar)를 설계했다. "다시 편집하기" 등 재진입 플로우도 포함했다.

5. **실제 스테이징 대상 E2E로 품질 검증**  
   Playwright로 페이지 이동, 업로드·다운로드, 사이드바 전달·유지, 버튼/UI 동작 등 다수 시나리오를 자동화했고, EC2 스테이징 URL을 E2E 대상으로 사용해 **실제 배포 환경**에서 동작을 확인한 뒤 프로덕션 배포가 이루어지도록 했다.

---

## 프로젝트 소개 (상세)

**역할:** 프론트엔드·백엔드·배포 전반을 담당한 PDF 유틸 웹 서비스

Next.js(프론트엔드) + NestJS(백엔드)로 설계·구현한 PDF 유틸 서비스이며, GitHub Actions로 Docker 이미지 빌드·ECR 푸시 후 EC2에 배포하고, EC2 스테이징 환경에서 Playwright E2E 검증을 통과한 뒤에만 Vercel 프로덕션 배포가 트리거되도록 자동화했다.  
프론트엔드는 FSD(Feature-Sliced Design)에 따라 features / widgets / shared 계층으로 나누었고, 백엔드는 Controller–Service 분리의 레이어드 아키텍처로 확장성과 유지보수성을 고려해 설계했다.

---

## 1. 모듈형 프론트/백엔드 아키텍처 설계 및 구축

- **프론트엔드:** FSD에 따라 `app`, `widgets`, `features`, `shared` 계층을 두고, 기능 단위로 도메인 로직과 UI를 분리했다. 페이지별로 병합·압축·변환·편집·회전·블라인드·페이지번호·이미지→PDF 등 위젯을 조합해 사용한다.
- **백엔드:** NestJS 레이어드 아키텍처로 Controller(API)와 Service(비즈니스 로직)를 분리하고, PDF 처리·DB 연동·관리자 API 등을 모듈 단위로 구성해 확장성과 유지보수를 고려했다.
- **폴더 구조 (요약):**
  - `web/src`: `app/`(라우트·페이지), `widgets/`(기능별 위젯), `features/`(기능 모듈·스토어), `shared/`(UI·유틸·API 설정)
  - `backend/src`: `pdf/`, `admin/`, `database/`, `common/` 등 도메인·공통 모듈

---

## 2. CI/CD 파이프라인 및 배포 프로세스 자동화

- GitHub Actions에서 `main` 푸시 시 **백엔드 Docker 이미지 빌드 → ECR 푸시 → EC2 SSH 배포**까지 자동화했다. EC2에서는 백엔드를 Docker 컨테이너로, 프론트는 `web` 빌드 후 PM2로 띄워 스테이징 환경을 구성한다.
- EC2 스테이징이 준비된 뒤 **Playwright E2E**를 해당 환경 대상으로 실행하고, **모든 테스트 통과 시에만** Vercel Deploy Hook을 호출해 프로덕션 배포가 이루어지도록 했다.
- AWS(ECR, EC2), Vercel, GitHub Secrets/Vars를 이용해 키·URL·환경 변수를 관리했다.

---

## 3. 기능별 REST API 설계 및 UI 연동

- **기능별 엔드포인트:** 병합·압축·변환·편집·회전·블라인드(가리기)·페이지번호·이미지→PDF 등 기능마다 전용 API를 두고, 프론트 플로우에 맞춰 요청/응답(멀티파트·JSON·스트리밍 등)을 설계했다.
- **다운로드 후 사이드바 전달 플로우:** 처리 결과를 다운로드한 뒤, 전달용 사이드바로 다른 기능 페이지로 이동하면서 파일을 이어서 사용할 수 있도록 API와 전역 상태(예: transfer sidebar store)를 설계했다. “다시 편집하기” 등 재진입 플로우도 반영했다.

---

## 4. E2E 테스트 및 배포 품질 검증

- **Playwright**로 페이지 이동, 업로드·다운로드, 사이드바 전달·유지, 버튼/UI 동작 등 **다수의 시나리오**(페이지별 다운로드 플로우, 전달 유지, 네비게이션, UI 버튼)를 자동 검증한다.
- EC2 스테이징 URL을 E2E 대상으로 사용해, 실제 배포 환경에서 동작을 확인한 뒤 프로덕션(Vercel) 배포가 진행되도록 파이프라인을 구성했다.

---

## 참고: IDE 단축키

- **폴더 구조(탐색기) 보이기/숨기기:** `Ctrl+B` (Windows/Linux), `Cmd+B` (Mac)
