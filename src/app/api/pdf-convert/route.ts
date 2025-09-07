import { NextResponse } from 'next/server';
import { OperationType, User as PrismaUser } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { exec } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import { promisify } from 'util';
import JSZip from 'jszip';
import { Readable } from 'stream';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

const execPromise = promisify(exec);
const MAX_DOWNLOADS_PER_DAY = 1;

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

  const formData = await request.formData();
  const file = formData.get('file') as File;
  const targetFormat = formData.get('targetFormat') as string || 'png';
  const githubVersion = formData.get('githubVersion') as string | null;

  if (!file) {
    return NextResponse.json({ error: '변환할 파일이 필요합니다.' }, { status: 400 });
  }

  const totalInputSizeInBytes = file.size;
  const inputBuffer = Buffer.from(await file.arrayBuffer());
  let tempDir: string | null = null;

  try {
    tempDir = await fs.mkdtemp(path.join('/tmp', 'pdf-convert-'));
    const inputFilePath = path.join(tempDir, 'input.pdf');
    const outputImagePattern = path.join(tempDir, `output-%d.${targetFormat}`);

    await fs.writeFile(inputFilePath, inputBuffer);

    const device = targetFormat === 'jpeg' ? 'jpeg' : 'pngalpha';
    const command = `gs -sDEVICE=${device} -o ${outputImagePattern} ${inputFilePath}`;
    await execPromise(command);

    const zip = new JSZip();
    const filesInTempDir = await fs.readdir(tempDir);

    for (const fileName of filesInTempDir) {
      if (fileName.startsWith('output-') && fileName.endsWith(targetFormat)) {
        const imagePath = path.join(tempDir, fileName);
        const imageBuffer = await fs.readFile(imagePath);
        zip.file(fileName, imageBuffer);
      }
    }

    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });
    const finalOutputSizeInBytes = BigInt(zipBuffer.length);

    const endTime = performance.now();
    const processingTimeInMs = Math.round(endTime - startTime);

    // --- 성공 시 DB 업데이트 ---
    const logAndUserUpdatePromises = [];

    logAndUserUpdatePromises.push(
      prisma.performanceLog.create({
        data: {
          operationType: OperationType.CONVERT_TO_IMAGE,
          fileCount: 1,
          totalInputSizeInBytes: BigInt(totalInputSizeInBytes),
          outputSizeInBytes: finalOutputSizeInBytes,
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

    const nodeReadable = Readable.from([new Uint8Array(zipBuffer)]);
    const webReadable = Readable.toWeb(nodeReadable) as any;

    return new NextResponse(webReadable, {
      status: 200,
      headers: {
        'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(`converted-${file.name.replace('.pdf', '')}.zip`)}`,
        'Content-Type': 'application/zip',
      },
    });

  } catch (error) {
    console.error('PDF 변환 중 서버 오류 발생:', error);
    let errorMessage = '서버에서 알 수 없는 오류가 발생했습니다.';
    if (error instanceof Error) {
        errorMessage = error.message;
    }
    return NextResponse.json({ error: errorMessage }, { status: 500 });

  } finally {
    if (tempDir) {
      await fs.rm(tempDir, { recursive: true, force: true });
    }
  }
}