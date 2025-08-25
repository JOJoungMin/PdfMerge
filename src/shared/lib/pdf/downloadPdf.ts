// libs/pdf/downloadPdf.ts
import { PDFDocument } from 'pdf-lib';
import type { PdfPage } from '@/entities/pdf-file/model/types';
export async function downloadPdf(pages: PdfPage[], fileName?: string) {
  if (pages.length === 0) return;

  const pdfDoc = await PDFDocument.create();

  for (const page of pages) {
    if (!page.imageUrl) continue;

    const imgBytes = await fetch(page.imageUrl).then(res => res.arrayBuffer());
    const img = await pdfDoc.embedPng(imgBytes);
    const pdfPage = pdfDoc.addPage([img.width, img.height]);

    pdfPage.drawImage(img, {
      x: 0,
      y: 0,
      width: img.width,
      height: img.height,
    });
  }

  const pdfBytes = await pdfDoc.save();
  // Create a new Uint8Array copy to satisfy the Blob constructor's type requirements.
  const newPdfBytes = new Uint8Array(pdfBytes);
  const blob = new Blob([newPdfBytes], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = fileName || 'edited.pdf';
  a.click();

  URL.revokeObjectURL(url);
}
