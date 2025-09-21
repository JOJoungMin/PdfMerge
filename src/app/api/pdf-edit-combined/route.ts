
import { NextResponse } from 'next/server'
import { PDFDocument } from 'pdf-lib';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { OperationType, User as PrismaUser } from '@prisma/client';
import { Readable } from 'stream';

const MAX_DOWNLOADS_PER_DAY = 100;

// 프론트엔드와 동일한 페이지 표현 타입
interface PageRepresentation {
  fileName: string;
  pageIndex: number;
}

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
    const files = formData.getAll('files') as File[];
    const pagesJSON = formData.get('pages') as string;
    const githubVersion = formData.get('githubVersion') as string | null;

    if (!files || files.length === 0 || !pagesJSON) {
      return NextResponse.json({ error: '필수 데이터가 누락되었습니다.' }, { status: 400 });
    }

    const orderedPages: PageRepresentation[] = JSON.parse(pagesJSON);
    const totalInputSizeInBytes = files.reduce((acc, file) => acc + file.size, 0);

    // 파일 이름으로 원본 PDF 문서를 쉽게 찾기 위한 맵
    const sourceDocs = new Map<string, PDFDocument>();
    for (const file of files) {
      const arrayBuffer = await file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer);
      sourceDocs.set(file.name, pdfDoc);
    }

    const newPdfDoc = await PDFDocument.create();

    for (const pageInfo of orderedPages) {
      const sourceDoc = sourceDocs.get(pageInfo.fileName);
      if (!sourceDoc) {
        console.warn(`원본 파일을 찾을 수 없습니다: ${pageInfo.fileName}`);
        continue;
      }
      const [copiedPage] = await newPdfDoc.copyPages(sourceDoc, [pageInfo.pageIndex]);
      newPdfDoc.addPage(copiedPage);
    }

    const pdfBytes = await newPdfDoc.save();
    const outputSizeInBytes = BigInt(pdfBytes.byteLength);

    const endTime = performance.now();
    const processingTimeInMs = Math.round(endTime - startTime);

    // --- 성공 시 DB 업데이트 ---
    const logAndUserUpdatePromises = [];
    logAndUserUpdatePromises.push(
      prisma.performanceLog.create({
        data: {
          operationType: OperationType.EDIT, // 또는 새로운 OperationType 추가
          fileCount: files.length,
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

    const nodeReadable = Readable.from([new Uint8Array(pdfBytes)]);
    const webReadable = Readable.toWeb(nodeReadable) as any;

    return new NextResponse(webReadable, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="edited-document.pdf"',
      },
    });

  } catch (error) {
    console.error('PDF 편집 중 오류 발생:', error);
    const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.';
    return NextResponse.json({ error: `서버 오류: ${errorMessage}` }, { status: 500 });
  }
}
