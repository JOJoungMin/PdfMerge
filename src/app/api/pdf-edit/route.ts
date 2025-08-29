import { NextResponse } from 'next/server';
import { PDFDocument } from 'pdf-lib';
import { OperationType } from '@/generated/prisma';
import { prisma } from '@/lib/prisma';
import { Readable } from 'stream';

export async function POST(request: Request) {
  const startTime = performance.now();

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const pageInstructionsString = formData.get('pageInstructions') as string;
    const githubVersion = formData.get('githubVersion') as string | null;

    if (!file) {
      return NextResponse.json({ error: '원본 PDF 파일이 필요합니다.' }, { status: 400 });
    }
    if (!pageInstructionsString) {
      return NextResponse.json({ error: '페이지 수정 정보가 필요합니다.' }, { status: 400 });
    }

    const pageInstructions: number[] = JSON.parse(pageInstructionsString);

    const totalInputSizeInBytes = file.size;
    const arrayBuffer = await file.arrayBuffer();
    const originalPdfDoc = await PDFDocument.load(arrayBuffer);

    const editedPdfDoc = await PDFDocument.create();

    let fileCount = 0; // 처리된 페이지 수
    for (const pageNum of pageInstructions) {
      if (pageNum >= 0 && pageNum < originalPdfDoc.getPageCount()) {
        const [copiedPage] = await editedPdfDoc.copyPages(originalPdfDoc, [pageNum]);
        editedPdfDoc.addPage(copiedPage);
        fileCount++;
      }
    }

    const editedPdfBytes = await editedPdfDoc.save();
    const outputSizeInBytes = BigInt(editedPdfBytes.byteLength);

    const endTime = performance.now();
    const processingTimeInMs = Math.round(endTime - startTime);

    // 성능 로그 기록
    prisma.performanceLog.create({
      data: {
        operationType: OperationType.EDIT,
        fileCount: fileCount,
        totalInputSizeInBytes: BigInt(totalInputSizeInBytes),
        outputSizeInBytes,
        processingTimeInMs,
        githubVersion,
      }
    }).catch((err: unknown) => {
      console.error("Failed to log performance data for editing:", err);
    });

    const nodeReadable = Readable.from([new Uint8Array(editedPdfBytes)]);
    const webReadable = Readable.toWeb(nodeReadable) as any;


    


    return new NextResponse(webReadable, {
      status: 200,
      headers: {
        'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(`edited-${file.name}`)}`,
        'Content-Type': 'application/pdf',
      },
    });

  } catch (error) {
    console.error('PDF 수정 중 서버 오류 발생:', error);
    let errorMessage = '서버에서 알 수 없는 오류가 발생했습니다.';
    if (error instanceof Error) {
        errorMessage = error.message;
    }
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}