'use client';

import dynamic from 'next/dynamic';

const PdfRotatorWidget = dynamic(() => import('./PdfRotatorWidget'), {
  ssr: false,
  loading: () => <p>회전 위젯을 불러오는 중...</p>,
});

export default function RotatorClientWrapper() {
  return <PdfRotatorWidget />;
}
