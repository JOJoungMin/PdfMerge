# 커밋 메시지 컨벤션

한 줄 형식: **`<타입>: <설명>`**

---

## 타입

| 타입 | 설명 | 예시 |
|------|------|------|
| `feat` | 새 기능 | feat: PDF 병합 API 추가 |
| `fix` | 버그 수정 | fix: Windows에서 gs 경로 공백 처리 |
| `refactor` | 리팩터링 (동작 변경 없음) | refactor: web 분리, Vercel 배포 준비 |
| `docs` | 문서만 수정 | docs: 백엔드 README Docker 실행 방법 추가 |
| `chore` | 빌드/설정/기타 | chore: .env.example 추가 |
| `style` | 코드 포맷, 세미콜론 등 | style: Prettier 적용 |

---

## 작성 규칙

1. **타입은 소문자**, 뒤에 **영문 콜론+공백** 한 칸.
2. **설명**은 한글이어도 되고, 동사 현재형으로 끝내기. (추가, 수정, 제거)
3. 제목은 **50자 이내** 권장. 길면 본문에 상세 내용.

---

## 예시 (이 레포 기준)

```
feat: NestJS 백엔드 추가 (pdf-merge, preview, compress, convert)
fix: Windows에서 Ghostscript 실행 파일 경로 따옴표 처리
refactor: web 분리, Vercel 배포 준비
docs: 백엔드 Docker 로컬 실행 방법 정리
chore: web .env.example 추가
```

이 컨벤션대로 메시지 쓰면 됩니다.
