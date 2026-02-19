'use client';

import dynamic from 'next/dynamic';

const PdfMergeWidget = dynamic(
  () => import('@/widgets/pdf-merger/ui/PdfMergeWidget').then((mod) => mod.default),
  { ssr: false, loading: () => <p>병합 위젯을 불러오는 중...</p> }
);

export default function MergeClientWrapper() {
  return <PdfMergeWidget />;
}
