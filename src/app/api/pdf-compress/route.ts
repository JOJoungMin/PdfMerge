import { NextResponse } from 'next/server';
import { OperationType } from '@/generated/prisma';
import { prisma } from '@/lib/prisma';
import { exec } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import { promisify } from 'util';
import { Readable } from 'stream';

const execPromise = promisify(exec);



export async function POST(request: Request) {
  const startTime = performance.now();
  const formData = await request.formData();
  const file = formData.get('file') as File;
  const githubVersion = formData.get('githubVersion') as string | null;
  // Ghostscript는 품질 설정을 직접 받기보다 사전 설정(e.g., /ebook)을 사용합니다.
  // const quality = parseFloat(formData.get('quality') as string || '0.7');

  if (!file) {
    return NextResponse.json({ error: '압축할 파일이 필요합니다.' }, { status: 400 });
  }

  const totalInputSizeInBytes = file.size;
  const inputBuffer = Buffer.from(await file.arrayBuffer());
  let tempDir: string | null = null;

  try {
    // 1. 임시 디렉토리 및 파일 경로 생성
    tempDir = await fs.mkdtemp(path.join('/tmp', 'pdf-compress-'));
    const inputFilePath = path.join(tempDir, 'input.pdf');
    const outputFilePath = path.join(tempDir, 'output.pdf');

    // 2. 업로드된 파일을 임시 디렉토리에 저장
    await fs.writeFile(inputFilePath, inputBuffer);

    // 3. Ghostscript 명령어 정의 및 실행
    const command = `gs -sDEVICE=pdfwrite -dCompatibilityLevel=1.4 -dPDFSETTINGS=/ebook -dNOPAUSE -dQUIET -dBATCH -sOutputFile=${outputFilePath} ${inputFilePath}`;
    await execPromise(command);

    // 4. 압축된 결과 파일을 읽기
    const outputBuffer = await fs.readFile(outputFilePath);
    const outputSizeInBytes = BigInt(outputBuffer.length);

    const endTime = performance.now();
    const processingTimeInMs = Math.round(endTime - startTime);

    // 5. 성능 로그 기록
    prisma.performanceLog.create({
      data: {
        operationType: OperationType.COMPRESS,
        fileCount: 1,
        totalInputSizeInBytes: BigInt(totalInputSizeInBytes),
        outputSizeInBytes,
        processingTimeInMs,
        githubVersion, // Add this line
      }
    }).catch((err: unknown) => {
      console.error("Failed to log performance data for compression:", err);
    });

    // 6. 압축된 파일과 함께 응답 반환
    const nodeReadable = Readable.from([new Uint8Array(outputBuffer)]);
    const webReadable = Readable.toWeb(nodeReadable) as any;

    return new NextResponse(webReadable, {
      status: 200,
      headers: {
        'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(`edited-${file.name}`)}`,
        'Content-Type': 'application/pdf',
      },
    });

  } catch (error) {
    console.error('PDF 압축 중 서버 오류 발생:', error);
    let errorMessage = '서버에서 알 수 없는 오류가 발생했습니다.';
    if (error instanceof Error) {
        errorMessage = error.message;
    }
    return NextResponse.json({ error: errorMessage }, { status: 500 });

  } finally {
    // 7. 임시 디렉토리 정리
    if (tempDir) {
      await fs.rm(tempDir, { recursive: true, force: true });
    }
  }
}