from locust import HttpUser, task, between
import os


class PreviewUser(HttpUser):
    """ /pdf-preview 엔드포인트 부하 테스트용 Locust 유저 """

    # 각 요청 사이 대기 시간 (초)
    wait_time = between(1, 3)

    def on_start(self):
        """테스트 시작 시 샘플 PDF를 메모리에 올려둔다. 기본: 큰 파일(2분 1유저 테스트용)."""
        base_dir = os.path.dirname(os.path.abspath(__file__))
        # 기본: bigger_locust_sample.pdf (2분 동안 큰 파일 한 번 테스트). CI는 LOCUST_SAMPLE_PDF=locust_sample.pdf 로 작은 파일 사용
        sample_file = os.environ.get("LOCUST_SAMPLE_PDF", "bigger_locust_sample.pdf")
        sample_path = os.path.join(base_dir, sample_file)
        with open(sample_path, "rb") as f:
            self.sample_pdf = f.read()
        self.sample_filename = sample_file

    @task
    def preview_pdf(self):
        """ /api/pdf-preview 로 multipart 업로드 요청 """
        files = {
            "file": (getattr(self, "sample_filename", "bigger_locust_sample.pdf"), self.sample_pdf, "application/pdf"),
        }

        with self.client.post(
            "/api/pdf-preview",
            files=files,
            data={},  # data를 명시적으로 dict로 넘겨서 requests가 문자열로 인식하지 않도록
            headers={"X-Loadtest": "locust-preview-local"},
            name="/pdf-preview",
            catch_response=True,
        ) as res:
            if res.status_code not in (200, 201):
                res.failure(f"status={res.status_code}")

