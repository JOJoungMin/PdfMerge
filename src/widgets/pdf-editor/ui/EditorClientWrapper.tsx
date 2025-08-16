'use client';

import dynamic from 'next/dynamic';

const PdfEditorWidget = dynamic(
  () => import('@/widgets/pdf-editor/ui/PdfEditorWidget').then((mod) => mod.PdfEditorWidget),
  { 
    ssr: false,
    loading: () => <p>Loading PDF Editor...</p> 
  }
);

export default function EditorClientWrapper() {
  return <PdfEditorWidget />;
}
