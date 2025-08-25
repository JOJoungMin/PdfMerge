import { NextResponse } from 'next/server';
import { PDFDocument } from 'pdf-lib';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const files = formData.getAll('files') as File[];

    if (!files || files.length < 2) {
      return NextResponse.json({ error: '병합할 파일이 2개 이상 필요합니다.' }, { status: 400 });
    }

    const mergedPdf = await PDFDocument.create();

    for (const file of files) {
      const fileBuffer = await file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(fileBuffer);
      const copiedPages = await mergedPdf.copyPages(pdfDoc, pdfDoc.getPageIndices());
      copiedPages.forEach((page) => mergedPdf.addPage(page));
    }

    const mergedPdfBytes = await mergedPdf.save();

    // Create a new Uint8Array copy to satisfy the Blob constructor's type requirements.
    const newPdfBytes = new Uint8Array(mergedPdfBytes);
    const blob = new Blob([newPdfBytes], { type: 'application/pdf' });

    return new NextResponse(blob, {
      status: 200,
      headers: {
        'Content-Disposition': 'attachment; filename="merged.pdf"',
      },
    });

  } catch (error) {
    console.error('PDF 병합 중 서버 오류 발생:', error);
    return NextResponse.json({ error: '서버에서 오류가 발생했습니다.' }, { status: 500 });
  }
}
