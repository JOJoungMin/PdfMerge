import Link from 'next/link';
import { FileJson } from 'lucide-react';

const CONTACT_EMAIL = 'c4851007@gmail.com';

const toolLinks = [
  { name: 'PDF 병합', href: '/merge' },
  { name: 'PDF 분리', href: '/editor' },
  { name: 'PDF 압축', href: '/compress' },
  { name: 'PDF 변환', href: '/convert' },
  { name: 'PDF 회전', href: '/rotate' },
  { name: '이미지→PDF', href: '/image-to-pdf' },
  { name: '페이지 번호', href: '/page-number' },
  { name: 'PDF 블라인드', href: '/redact' },
];

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
      {/* 상단: 브랜딩 + 링크 컬럼 */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-8">
          {/* 왼쪽: 로고 + 슬로건 */}
          <div className="flex-shrink-0">
            <Link href="/" className="flex items-center gap-2 text-xl font-bold text-gray-800 dark:text-white">
              <FileJson className="h-7 w-7 text-blue-600" />
              <span>PDF-Utils</span>
            </Link>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              브라우저에서 바로 쓰는 무료 PDF 도구. 회원가입 없이 사용할 수 있습니다.
            </p>
          </div>

          {/* 오른쪽: 링크 컬럼 */}
          <div className="flex flex-wrap gap-x-12 gap-y-6">
            <div>
              <h3 className="text-sm font-semibold text-gray-800 dark:text-white mb-3">기능</h3>
              <ul className="space-y-2">
                {toolLinks.map(({ name, href }) => (
                  <li key={href}>
                    <Link
                      href={href}
                      className="text-sm text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
                    >
                      {name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-800 dark:text-white mb-3">법적</h3>
              <ul className="space-y-2">
                <li>
                  <Link
                    href="/privacy"
                    className="text-sm text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
                  >
                    개인정보처리방침
                  </Link>
                </li>
                <li>
                  <a
                    href={`mailto:${CONTACT_EMAIL}`}
                    className="text-sm text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
                  >
                    문의하기
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* 하단: 저작권 + 링크 */}
      <div className="border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-sm text-gray-600 dark:text-gray-400">
            <span>©{year} PDF-Utils</span>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
              <Link href="/privacy" className="hover:text-blue-600 dark:hover:text-blue-400">
                개인정보처리방침
              </Link>
              <span className="text-gray-400 dark:text-gray-500">|</span>
              <a href={`mailto:${CONTACT_EMAIL}`} className="hover:text-blue-600 dark:hover:text-blue-400">
                문의하기
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
