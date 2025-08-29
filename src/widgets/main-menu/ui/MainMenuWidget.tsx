
import Link from 'next/link';
import { FileJson, Scissors, Minimize, RefreshCw } from 'lucide-react';

const tools = [
  {
    name: 'PDF 병합',
    description: '여러 개의 PDF 파일을 하나로 합칩니다.',
    href: '/merge',
    icon: FileJson,
    bgColor: 'bg-blue-500',
  },
  {
    name: 'PDF 분리',
    description: 'PDF 파일의 특정 페이지를 추출합니다.',
    href: '/editor',
    icon: Scissors,
    bgColor: 'bg-green-500',
  },
  {
    name: 'PDF 압축',
    description: 'PDF 파일의 크기를 줄입니다.',
    href: '/compress',
    icon: Minimize,
    bgColor: 'bg-yellow-500',
  },
  {
    name: 'PDF 변환',
    description: 'PDF를 다른 포맷으로 변환합니다.',
    href: '/convert',
    icon: RefreshCw,
    bgColor: 'bg-red-500',
  },
];

export function MainMenuWidget() {
  return (
    <div className="w-full max-w-4xl rounded-lg bg-white p-8 shadow-md dark:bg-gray-800">
      <div className="text-center mb-10">
        <h1 className="text-4xl font-bold text-gray-800 dark:text-white">PDF 유틸리티</h1>
        <p className="mt-2 text-lg text-gray-600 dark:text-gray-400">필요한 도구를 선택하세요.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      {tools.map((tool) => {
  const Icon = tool.icon; // 정상
  return (
    <Link href={tool.href} key={tool.name}>
      <div className="flex items-center p-6 rounded-lg bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 transition-all duration-300 cursor-pointer shadow-sm hover:shadow-lg">
        <div className={`p-4 rounded-full ${tool.bgColor} mr-6`}>
          <Icon className="h-8 w-8 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white">{tool.name}</h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">{tool.description}</p>
        </div>
      </div>
    </Link>
  );
})}

      </div>
    </div>
  );
}
