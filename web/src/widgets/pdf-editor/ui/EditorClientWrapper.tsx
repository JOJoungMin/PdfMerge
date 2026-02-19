'use client';

import dynamic from 'next/dynamic';

const PdfEditorWidget = dynamic(
  () => import('@/widgets/pdf-editor/ui/PdfEditorWidget').then((mod) => mod.default),
  { ssr: false, loading: () => <p>편집 위젯을 불러오는 중...</p> }
);

export default function EditorClientWrapper() {
  return <PdfEditorWidget />;
}
