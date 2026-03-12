import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: '개인정보처리방침 | PDF-Utils',
  description: 'PDF-Utils 개인정보처리방침입니다.',
};

const CONTACT_EMAIL = 'c4851007@gmail.com';

export default function PrivacyPage() {
  return (
    <div className="bg-gray-100 dark:bg-gray-900 min-h-full">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-10 max-w-3xl">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
          개인정보처리방침
        </h1>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-8">
          시행일: 2025년 3월 6일
        </p>

        <section className="mb-8">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-3">
            1. 서비스 소개
          </h2>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
            PDF-Utils(이하 &quot;서비스&quot;)는 PDF 병합, 분리, 압축, 변환, 회전, 블라인드, 페이지 번호 추가 등
            PDF 관련 기능을 브라우저에서 제공하는 웹 서비스입니다. 회원가입 없이 이용할 수 있습니다.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-3">
            2. 수집하는 개인정보 항목
          </h2>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-2">
            본 서비스는 회원가입을 하지 않으며, 이용자를 개별 식별하는 정보(이름, 이메일, 전화번호 등)를
            수집하지 않습니다.
          </p>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
            서비스 이용 제한(일일 다운로드 횟수 등)을 위해 브라우저의 로컬 저장소에 이용 기록이 저장될 수 있습니다.
            해당 데이터는 사용자 기기 내에만 존재하며 서버로 전송되지 않습니다.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-3">
            3. 수집 목적 및 이용
          </h2>
          <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 space-y-1">
            <li>서비스 제공 및 품질 유지</li>
            <li>일일 다운로드 제한 등 남용 방지</li>
            <li>관련 법령 준수 및 분쟁 대응</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-3">
            4. 보관 기간
          </h2>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
            로컬 저장소에 저장된 이용 기록은 사용자가 브라우저 데이터를 삭제할 때까지 또는 해당 기능에서
            정한 기간까지 보관됩니다. 서버에 개인을 식별할 수 있는 정보를 저장하지 않습니다.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-3">
            5. 제3자 제공 및 광고
          </h2>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-2">
            본 서비스에는 Google AdSense 등 제3자 광고 서비스가 사용될 수 있습니다. 광고 제공을 위해
            Google은 쿠키 등을 통해 방문 기록·광고 노출·클릭 정보를 수집·처리할 수 있으며, 이에 대한
            내용은 Google의 개인정보처리방침을 참고하시기 바랍니다.
          </p>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
            본 서비스 운영자는 위 제3자가 수집하는 정보의 구체적 범위와 이용에 대해 통제하지 않으며,
            이용자는 브라우저 설정 또는 Google 광고 설정을 통해 맞춤 광고 등을 제한할 수 있습니다.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-3">
            6. 쿠키
          </h2>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
            서비스 이용 시 쿠키가 사용될 수 있습니다. 쿠키는 서비스 기능(예: 이용 제한 적용) 및 광고 서비스
            제공에 활용됩니다. 이용자는 브라우저 설정에서 쿠키 저장을 거부할 수 있으며, 이 경우 일부
            기능이 제한될 수 있습니다.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-3">
            7. 이용자의 권리
          </h2>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
            이용자는 개인정보와 관련한 문의·열람·정정·삭제 요청을 아래 문의처로 할 수 있습니다.
            로컬 저장소에 저장된 데이터는 사용자가 브라우저에서 직접 삭제할 수 있습니다.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-3">
            8. 개인정보처리방침의 변경
          </h2>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
            본 방침은 법령·서비스 변경에 따라 수정될 수 있습니다. 변경 시 이 페이지를 통해 공지하며,
            시행일을 명시합니다.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-3">
            9. 문의처
          </h2>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
            개인정보 처리와 관련한 문의:{' '}
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              {CONTACT_EMAIL}
            </a>
          </p>
        </section>

        <p className="text-sm text-gray-500 dark:text-gray-400 mt-10">
          <Link href="/" className="text-blue-600 dark:text-blue-400 hover:underline">
            ← 홈으로
          </Link>
        </p>
      </div>
    </div>
  );
}
