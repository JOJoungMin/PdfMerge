
import { NextResponse } from 'next/server';
import { PDFDocument } from 'pdf-lib';

// POST /api/pdf-merge 요청을 처리하는 핸들러
export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const files = formData.getAll('files') as File[];

    if (!files || files.length < 2) {
      return NextResponse.json({ error: '병합할 파일이 2개 이상 필요합니다.' }, { status: 400 });
    }

    // 새로운 PDF 문서를 생성합니다.
    const mergedPdf = await PDFDocument.create();

    // 받은 파일들을 순회하며 새 문서에 페이지를 복사합니다.
    for (const file of files) {
      // 파일을 ArrayBuffer 형태로 읽어들입니다.
      const fileBuffer = await file.arrayBuffer();
      // ArrayBuffer를 PDFDocument 객체로 로드합니다.
      const pdfDoc = await PDFDocument.load(fileBuffer);
      // 원본 문서의 모든 페이지를 복사합니다.
      const copiedPages = await mergedPdf.copyPages(pdfDoc, pdfDoc.getPageIndices());
      // 복사된 페이지들을 새 문서에 추가합니다.
      copiedPages.forEach((page) => mergedPdf.addPage(page));
    }

    // 병합된 PDF를 바이트 배열(Uint8Array)로 저장합니다.
    const mergedPdfBytes = await mergedPdf.save();

    // 병합된 PDF 파일을 클라이언트에 응답으로 보냅니다.
    return new NextResponse(mergedPdfBytes, { 
      status: 200,
      headers: { 
        'Content-Type': 'application/pdf',
        // 이 헤더는 브라우저에게 파일을 다운로드하도록 지시합니다.
        'Content-Disposition': 'attachment; filename="merged.pdf"',
      },
    });

  } catch (error) {
    console.error('PDF 병합 중 서버 오류 발생:', error);
    return NextResponse.json({ error: '서버에서 오류가 발생했습니다.' }, { status: 500 });
  }
}
