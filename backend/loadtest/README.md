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

## CI

워크플로에서는 작은 파일(`locust_sample.pdf`) + 20초로 빠르게 돌리고, 결과만 DB에 저장한다.

## 작은 파일로 짧게 돌리기

```bash
LOCUST_SAMPLE_PDF=locust_sample.pdf locust -f locustfile.py --host http://localhost:3001 --headless -u 1 -r 1 -t 20s --csv /tmp/perf
```
