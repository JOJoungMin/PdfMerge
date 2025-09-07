import { NextResponse } from 'next/server';
import { PDFDocument } from 'pdf-lib';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { OperationType, User as PrismaUser } from '@prisma/client';
import { Readable } from 'stream';

// 하루 최대 사용량
const MAX_DOWNLOADS_PER_DAY = 1;

export async function POST(request: Request) {
  const startTime = performance.now();
  const session = await getServerSession(authOptions);

  // --- 🔽 [추가된 로직] 사용자 사용량 체크 🔽 ---
  if (session?.user?.email) {
    const user: PrismaUser | null = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (user) {
      const today = new Date();
      today.setHours(0, 0, 0, 0); // 오늘 날짜의 시작

      const lastDownload = user.lastDownloadDate;
      let currentDownloads = user.downloadCount;

      // 마지막 다운로드 날짜가 오늘 이전이면, 카운트 리셋
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
  // --- 🔼 [추가된 로직] 사용자 사용량 체크 🔼 ---

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

    // --- 🔽 [추가된 로직] 성공 시 DB 업데이트 🔽 ---
    const logAndUserUpdatePromises = [];

    // 1. 성능 로그 기록
    logAndUserUpdatePromises.push(
      prisma.performanceLog.create({
        data: {
          operationType: OperationType.MERGE,
          fileCount: files.length,
          totalInputSizeInBytes: BigInt(totalInputSizeInBytes),
          outputSizeInBytes,
          processingTimeInMs,
          githubVersion,
        }
      })
    );

    // 2. 사용자 다운로드 횟수 업데이트 (로그인한 경우)
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

    // 두 작업을 동시에 실행 (실패해도 클라이언트에게 영향을 주지 않음)
    Promise.all(logAndUserUpdatePromises).catch((err) => {
      console.error("Failed to log or update user data:", err);
    });
    // --- 🔼 [추가된 로직] 성공 시 DB 업데이트 🔼 ---

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
