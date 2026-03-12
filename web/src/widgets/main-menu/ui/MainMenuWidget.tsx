'use client';

import Link from 'next/link';
import { FileJson, Scissors, Minimize, RefreshCw, RotateCw, ImageIcon, Hash, Square } from 'lucide-react';

const tools = [
  { name: 'PDF 병합', description: '여러 개의 PDF 파일을 하나로 합칩니다.', href: '/merge', icon: FileJson, bgColor: 'bg-blue-500' },
  { name: 'PDF 분리', description: 'PDF 파일의 특정 페이지를 추출합니다.', href: '/editor', icon: Scissors, bgColor: 'bg-green-500' },
  { name: 'PDF 압축', description: 'PDF 파일의 크기를 줄입니다.', href: '/compress', icon: Minimize, bgColor: 'bg-yellow-500' },
  { name: 'PDF 변환', description: 'PDF를 다른 포맷으로 변환합니다.', href: '/convert', icon: RefreshCw, bgColor: 'bg-red-500' },
  { name: 'PDF 회전', description: 'PDF 페이지를 90°, 180°, 270°로 회전합니다.', href: '/rotate', icon: RotateCw, bgColor: 'bg-indigo-500' },
  { name: '이미지 PDF 변환', description: 'JPG, PNG 이미지 1장을 PDF 1개로 변환합니다.', href: '/image-to-pdf', icon: ImageIcon, bgColor: 'bg-teal-500' },
  { name: '페이지 번호 넣기', description: 'PDF에 페이지 번호를 추가합니다.', href: '/page-number', icon: Hash, bgColor: 'bg-slate-500' },
  { name: 'PDF 블라인드', description: '특정 문자열을 찾아 검은색으로 가립니다.', href: '/redact', icon: Square, bgColor: 'bg-amber-600' },
];

const featuredTools = [
  { name: 'PDF 병합', description: '여러 PDF를 하나로 합쳐 한 번에 관리하세요.', href: '/merge', icon: FileJson },
  { name: 'PDF 압축', description: '용량을 줄여 이메일 첨부나 공유를 편하게 하세요.', href: '/compress', icon: Minimize },
  { name: 'PDF 변환', description: '이미지·문서 포맷으로 변환해 활용 범위를 넓히세요.', href: '/convert', icon: RefreshCw },
];

function scrollToTools() {
  document.getElementById('tools')?.scrollIntoView({ behavior: 'smooth' });
}

export function MainMenuWidget() {
  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* 히어로: 로고 + 슬로건 + CTA */}
      <section className="text-center pt-4 pb-14 px-2">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-600 shadow-sm mb-6">
          <FileJson className="h-10 w-10 text-blue-600" />
        </div>
        <h1 className="text-4xl sm:text-5xl font-bold text-gray-800 dark:text-white tracking-tight">
          PDF 유틸리티
        </h1>
        <p className="mt-3 text-lg sm:text-xl text-gray-600 dark:text-gray-400 max-w-xl mx-auto">
          필요한 PDF 작업, 브라우저에서 바로 하세요.
        </p>
        <button
          type="button"
          onClick={scrollToTools}
          className="mt-6 px-8 py-3 rounded-lg bg-gray-800 dark:bg-gray-700 text-white font-medium hover:bg-gray-700 dark:hover:bg-gray-600 transition-colors"
        >
          도구 보기
        </button>
      </section>

      {/* 대표 기능 카드 3개 */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-14">
        {featuredTools.map(({ name, description, href, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="block p-6 rounded-xl bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-600 text-left hover:border-blue-400 dark:hover:border-blue-500 transition-colors"
          >
            <div className="w-12 h-12 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center mb-4">
              <Icon className="h-6 w-6 text-gray-700 dark:text-gray-300" />
            </div>
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white">{name}</h2>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
              {description}
            </p>
          </Link>
        ))}
      </section>

      {/* 전체 도구 그리드 */}
      <section id="tools" className="rounded-xl bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-600 p-8 shadow-sm">
        <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-6 text-center">
          전체 도구
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {tools.map((tool) => {
            const Icon = tool.icon;
            return (
              <Link href={tool.href} key={tool.name}>
                <div className="flex items-center p-5 rounded-lg bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-600 transition-colors">
                  <div className={`p-3 rounded-lg shrink-0 ${tool.bgColor} mr-4`}>
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-semibold text-gray-800 dark:text-white">{tool.name}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">{tool.description}</p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
