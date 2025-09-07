'use client';

import { useEffect, useRef } from 'react';
import type { PDFDocumentProxy } from 'pdfjs-dist';

interface PdfPagePreviewProps {
  pdf: PDFDocumentProxy;
  pageNumber: number;
  className?: string;
}

export function PdfPagePreview({ pdf, pageNumber, className }: PdfPagePreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let isCancelled = false;

    async function renderPage() {
      if (!pdf || !canvasRef.current) return;

      try {
        const page = await pdf.getPage(pageNumber);
        const viewport = page.getViewport({ scale: 0.5 });
        const canvas = canvasRef.current;
        if (!canvas) return;

        const context = canvas.getContext('2d');
        if (!context) return;

        canvas.height = viewport.height;
        canvas.width = viewport.width;

        const renderContext = {
          canvas,
          viewport: viewport,
        };

        await page.render(renderContext).promise;
        if (isCancelled) {
          page.cleanup();
        }
      } catch (error) {
        console.error(`Failed to render page ${pageNumber}`, error);
      }
    }

    renderPage();

    return () => {
      isCancelled = true;
    };
  }, [pdf, pageNumber]);

  return <canvas ref={canvasRef} className={className} />;
}
