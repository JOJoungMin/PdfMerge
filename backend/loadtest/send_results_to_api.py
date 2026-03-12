#!/usr/bin/env python3
"""
Locust CSV 결과를 파싱해서 PDF-Utils 백엔드 POST /api/admin/load-test-results 로 전송.
CI에서 Locust 실행 후 이 스크립트를 호출하면 DB에 기록되고, 관리자 페이지에서 조회 가능.

사용 예:
  locust -f locustfile.py --host http://localhost:3001 --headless -u 5 -r 1 -t 30s --csv /tmp/perf
  python send_results_to_api.py --csv /tmp/perf_stats.csv --backend-url http://localhost:3001 --run-name "ci-$(date +%Y%m%d-%H%M)"
"""
import argparse
import csv
import json
import os
import sys
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError
from urllib.parse import urljoin


def parse_stats_csv(path: str) -> dict:
    """Locust stats CSV에서 Aggregated 행을 찾아 요청 수, 실패 수, 평균 응답시간(ms) 등을 반환."""
    with open(path, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        rows = list(reader)
    if not rows:
        raise ValueError(f"No rows in {path}")

    # Aggregated 행 우선, 없으면 마지막 행
    aggregated = None
    for row in rows:
        name = (row.get("Name") or "").strip()
        if name == "Aggregated":
            aggregated = row
            break
    if not aggregated:
        aggregated = rows[-1]

    def get_int(*keys: str) -> int:
        for k in keys:
            if not k:
                continue
            v = aggregated.get(k)
            if v is not None and v != "":
                try:
                    return int(float(v))
                except (ValueError, TypeError):
                    pass
        return 0

    def get_float(*keys: str) -> float:
        for k in keys:
            if not k:
                continue
            v = aggregated.get(k)
            if v is not None and v != "":
                try:
                    return float(v)
                except (ValueError, TypeError):
                    pass
        return 0.0

    # Locust 버전에 따라 컬럼명이 다를 수 있음 (공백/대소문자 등)
    request_count = get_int("Request Count", "# requests")
    failure_count = get_int("Failure Count", "# failures")
    avg_ms = get_float("Average Response Time", "Average response time", "Avg (ms)")
    if avg_ms == 0:
        avg_ms = get_float("Median Response Time", "Median response time", "Median (ms)")
    p95_ms = get_float("95%", "95%ile (ms)")
    p99_ms = get_float("99%", "99%ile (ms)")
    rps = get_float("Requests/s", "RPS")

    return {
        "total_requests": request_count,
        "failure_count": failure_count,
        "avg_latency_ms": round(avg_ms, 2) if avg_ms else None,
        "p95_latency_ms": round(p95_ms, 2) if p95_ms else None,
        "p99_latency_ms": round(p99_ms, 2) if p99_ms else None,
        "rps": round(rps, 2) if rps else None,
    }


def send_to_api(
    backend_url: str,
    run_name: str,
    target_url: str,
    users: int,
    rps_or_duration: str,
    stats: dict,
    notes: str = "",
    file_size_bytes: int | None = None,
) -> None:
    """POST /api/admin/load-test-results 로 전송."""
    url = urljoin(backend_url.rstrip("/") + "/", "api/admin/load-test-results")
    payload = {
        "run_name": run_name,
        "target_url": target_url,
        "users": users,
        "rps_or_duration": rps_or_duration,
        "total_requests": stats["total_requests"],
        "failure_count": stats["failure_count"],
        "avg_latency_ms": stats.get("avg_latency_ms"),
        "p95_latency_ms": stats.get("p95_latency_ms"),
        "p99_latency_ms": stats.get("p99_latency_ms"),
        "notes": notes or None,
        "file_size_bytes": file_size_bytes,
    }
    body = json.dumps(payload).encode("utf-8")
    req = Request(
        url,
        data=body,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urlopen(req, timeout=30) as resp:
            code = resp.getcode()
            data = resp.read().decode()
            if code not in (200, 201):
                raise SystemExit(f"API returned {code}: {data}")
            print(f"OK {code}: {data}")
    except HTTPError as e:
        raise SystemExit(f"API error {e.code}: {e.read().decode()}")
    except URLError as e:
        raise SystemExit(f"Request failed: {e.reason}")


def main():
    ap = argparse.ArgumentParser(description="Send Locust CSV results to PDF-Utils admin API")
    ap.add_argument("--csv", required=True, help="Path to Locust stats CSV (e.g. /tmp/perf_stats.csv)")
    ap.add_argument("--backend-url", required=True, help="Base URL of backend (e.g. http://localhost:3001)")
    ap.add_argument("--run-name", default=None, help="Run name (default: ci-<timestamp>)")
    ap.add_argument("--target-url", default=None, help="Target URL used in test (default: same as backend-url)")
    ap.add_argument("--users", type=int, default=0, help="Number of concurrent users")
    ap.add_argument("--duration", default="", help="e.g. 30s")
    ap.add_argument("--rps", default="", help="e.g. 1")
    ap.add_argument("--notes", default="", help="Optional notes")
    ap.add_argument("--file-size", type=int, default=None, metavar="BYTES", help="Sample PDF file size in bytes")
    ap.add_argument("--sample-pdf", default=None, metavar="PATH", help="Path to sample PDF used in test (script will read file size automatically)")
    args = ap.parse_args()

    if not os.path.isfile(args.csv):
        print(f"File not found: {args.csv}", file=sys.stderr)
        sys.exit(1)

    file_size_bytes = args.file_size
    if file_size_bytes is None and args.sample_pdf and os.path.isfile(args.sample_pdf):
        file_size_bytes = os.path.getsize(args.sample_pdf)
        print(f"Sample PDF size: {file_size_bytes} bytes", file=sys.stderr)

    stats = parse_stats_csv(args.csv)
    backend = args.backend_url.rstrip("/")
    target = (args.target_url or backend).rstrip("/")
    run_name = args.run_name
    if not run_name:
        from datetime import datetime
        run_name = "ci-" + datetime.utcnow().strftime("%Y%m%d-%H%M%S")

    parts = []
    if args.users:
        parts.append(f"{args.users} users")
    if args.rps:
        parts.append(f"{args.rps} rps")
    if args.duration:
        parts.append(args.duration)
    rps_or_duration = ", ".join(parts) if parts else "headless"

    send_to_api(
        backend_url=backend,
        run_name=run_name,
        target_url=target,
        users=args.users,
        rps_or_duration=rps_or_duration,
        stats=stats,
        notes=args.notes or f"CI load test: {rps_or_duration}",
        file_size_bytes=file_size_bytes,
    )


if __name__ == "__main__":
    main()
