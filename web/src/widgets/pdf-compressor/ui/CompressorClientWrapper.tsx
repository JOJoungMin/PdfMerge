'use client';

import dynamic from 'next/dynamic';

const PdfCompressorWidget = dynamic(() => import('./PdfCompressorWidget'), {
  ssr: false,
  loading: () => <p>압축 위젯을 불러오는 중...</p>,
});

export default function CompressorClientWrapper() {
  return <PdfCompressorWidget />;
}
