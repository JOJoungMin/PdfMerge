'use client';

import dynamic from 'next/dynamic';

const PdfConverterWidget = dynamic(
  () => import('./PdfConverterWidget'),
  {
    ssr: false,
    loading: () => <p>Loading PDF Converter...</p>
  }
);

export default function ConverterClientWrapper() {
  return <PdfConverterWidget />;
}
