import { NextResponse } from 'next/server';
import { PDFDocument } from 'pdf-lib';
import { OperationType, User as PrismaUser } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { Readable } from 'stream';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

const MAX_DOWNLOADS_PER_DAY = 100;

export async function POST(request: Request) {
  const startTime = performance.now();
  const session = await getServerSession(authOptions);

  // --- 사용자 사용량 체크 ---
  if (session?.user?.email) {
    const user: PrismaUser | null = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (user) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const lastDownload = user.lastDownloadDate;
      let currentDownloads = user.downloadCount;

      if (!lastDownload || lastDownload < today) {
        currentDownloads = 0;
      }

      if (currentDownloads >= MAX_DOWNLOADS_PER_DAY) {
        return NextResponse.json(
          { error: `일일 최대 사용량(${MAX_DOWNLOADS_PER_DAY}회)을 초과했습니다.` },
          { status: 429 }
        );
      }
    }
  }

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

    let fileCount = 0;
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

    // --- 성공 시 DB 업데이트 ---
    const logAndUserUpdatePromises = [];

    logAndUserUpdatePromises.push(
      prisma.performanceLog.create({
        data: {
          operationType: OperationType.EDIT,
          fileCount: fileCount,
          totalInputSizeInBytes: BigInt(totalInputSizeInBytes),
          outputSizeInBytes,
          processingTimeInMs,
          githubVersion,
        }
      })
    );

    if (session?.user?.email) {
      logAndUserUpdatePromises.push(
        prisma.user.update({
          where: { email: session.user.email },
          data: {
            downloadCount: { increment: 1 },
            lastDownloadDate: new Date(),
          },
        })
      );
    }

    Promise.all(logAndUserUpdatePromises).catch((err) => {
      console.error("Failed to log or update user data:", err);
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