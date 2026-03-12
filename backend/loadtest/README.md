# 부하 테스트 (Locust)

- **기본**: `bigger_locust_sample.pdf` 사용. 2분 동안 유저 1명으로 큰 파일 한 번 테스트.

## 로컬 실행 (표준: 2분 + 큰 파일)

```bash
locust -f locustfile.py --host http://localhost:3001 --headless -u 1 -r 1 -t 2m --csv /tmp/perf
```

결과 전송 (백엔드 실행 중일 때). `--sample-pdf` 넣으면 파일 크기 자동 전송:

```bash
# 로컬 (파일 크기 자동: 사용한 샘플 PDF 경로만 지정)
python3 send_results_to_api.py --csv /tmp/perf_stats.csv --backend-url http://localhost:3001 --users 1 --duration 2m --notes "로컬 2분 큰파일" --sample-pdf bigger_locust_sample.pdf
```

## EC2에서 부하테스트 (배포 DB에 결과 쌓기)

샘플 PDF는 Git에 없으므로, **EC2에 한 번 올려둔다.**

```bash
# 로컬에서 (한 번만)
scp backend/loadtest/locust_sample.pdf backend/loadtest/bigger_locust_sample.pdf ubuntu@EC2_IP:~/프로젝트경로/backend/loadtest/
```

이후 EC2 SSH 접속 → `cd backend/loadtest` → 위 "로컬 실행"과 동일하게 `--host http://localhost:3001` 로 실행.

## CI

부하테스트는 CI에 포함하지 않음. 포트폴리오 수집 시 EC2 SSH에서 수동 실행.

## 작은 파일로 짧게 돌리기

```bash
LOCUST_SAMPLE_PDF=locust_sample.pdf locust -f locustfile.py --host http://localhost:3001 --headless -u 1 -r 1 -t 20s --csv /tmp/perf
```
