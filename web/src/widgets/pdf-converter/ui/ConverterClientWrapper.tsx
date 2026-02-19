'use client';

import dynamic from 'next/dynamic';

const PdfConverterWidget = dynamic(() => import('./PdfConverterWidget'), {
  ssr: false,
  loading: () => <p>변환 위젯을 불러오는 중...</p>,
});

export default function ConverterClientWrapper() {
  return <PdfConverterWidget />;
}
