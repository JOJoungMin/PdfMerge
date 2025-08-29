import { NextResponse } from 'next/server';
import { PDFDocument } from 'pdf-lib';
import { OperationType } from '@/generated/prisma';
import { prisma } from '@/lib/prisma';
import { Readable } from 'stream';

export async function POST(request: Request) {
  const startTime = performance.now();

  try {
    const formData = await request.formData();
    const files = formData.getAll('files') as File[];
    const githubVersion = formData.get('githubVersion') as string | null;

    if (!files || files.length < 2) {
      return NextResponse.json({ error: '병합할 파일이 2개 이상 필요합니다.' }, { status: 400 });
    }

    const totalInputSizeInBytes = files.reduce((acc, file) => acc + file.size, 0);

    const mergedPdf = await PDFDocument.create();

    for (const file of files) {
      const fileBuffer = await file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(fileBuffer);
      const copiedPages = await mergedPdf.copyPages(pdfDoc, pdfDoc.getPageIndices());
      copiedPages.forEach((page) => mergedPdf.addPage(page));
    }

    const mergedPdfBytes = await mergedPdf.save();
    const outputSizeInBytes = BigInt(mergedPdfBytes.byteLength);

    const endTime = performance.now();
    const processingTimeInMs = Math.round(endTime - startTime);

    // Log to database (fire-and-forget)
    prisma.performanceLog.create({
      data: {
        operationType: OperationType.MERGE,
        fileCount: files.length,
        totalInputSizeInBytes: BigInt(totalInputSizeInBytes),
        outputSizeInBytes,
        processingTimeInMs,
        githubVersion, // Add this line
      }
    }).catch((err: unknown) => {
      // Log any errors during the logging process itself
      console.error("Failed to log performance data:", err);
    });

    // const newPdfBytes = new Uint8Array(mergedPdfBytes);
    // const blob = new Blob([newPdfBytes], { type: 'application/pdf' });

    const nodeReadable = Readable.from([new Uint8Array(mergedPdfBytes)]);
    const webReadable = Readable.toWeb(nodeReadable) as any;

    return new NextResponse(webReadable, {
      status: 200,
      headers: {
        'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(
          `merged-${files[0].name.replace('.pdf', '')}.pdf`
        )}`,
        'Content-Type': 'application/pdf',
      },
    });

  } catch (error) {
    console.error('PDF 병합 중 서버 오류 발생:', error);
    if (error instanceof Error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ error: '서버에서 알 수 없는 오류가 발생했습니다.' }, { status: 500 });
  }
}