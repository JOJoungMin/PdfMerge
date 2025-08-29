import { NextResponse } from 'next/server';
import { OperationType } from '@/generated/prisma';
import { prisma } from '@/lib/prisma';
import { exec } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import { promisify } from 'util';
import JSZip from 'jszip';
import { Readable } from 'stream';

const execPromise = promisify(exec);

export async function POST(request: Request) {
  const startTime = performance.now();
  const formData = await request.formData();
  const file = formData.get('file') as File;
  const targetFormat = formData.get('targetFormat') as string || 'png'; // 'png' or 'jpeg'
  const githubVersion = formData.get('githubVersion') as string | null;

  if (!file) {
    return NextResponse.json({ error: '변환할 파일이 필요합니다.' }, { status: 400 });
  }

  const totalInputSizeInBytes = file.size;
  const inputBuffer = Buffer.from(await file.arrayBuffer());
  let tempDir: string | null = null;

  try {
    // 1. 임시 디렉토리 및 파일 경로 생성
    tempDir = await fs.mkdtemp(path.join('/tmp', 'pdf-convert-'));
    const inputFilePath = path.join(tempDir, 'input.pdf');
    const outputImagePattern = path.join(tempDir, `output-%d.${targetFormat}`);

    // 2. 업로드된 파일을 임시 디렉토리에 저장
    await fs.writeFile(inputFilePath, inputBuffer);

    // 3. Ghostscript 명령어 정의 및 실행 (PDF 페이지를 이미지로 변환)
    // -sDEVICE: 출력 장치 (pngalpha, jpeg 등)
    // -o: 출력 파일 패턴 (%d는 페이지 번호로 대체됨)
    const device = targetFormat === 'jpeg' ? 'jpeg' : 'pngalpha';
    const command = `gs -sDEVICE=${device} -o ${outputImagePattern} ${inputFilePath}`;
    await execPromise(command);

    // 4. 생성된 이미지 파일들을 읽고 ZIP으로 압축
    const zip = new JSZip();
    let outputSizeInBytes = 0;
    const filesInTempDir = await fs.readdir(tempDir);

    for (const fileName of filesInTempDir) {
      if (fileName.startsWith('output-') && fileName.endsWith(targetFormat)) {
        const imagePath = path.join(tempDir, fileName);
        const imageBuffer = await fs.readFile(imagePath);
        zip.file(fileName, imageBuffer);
        outputSizeInBytes += imageBuffer.length;
      }
    }

    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });
    const finalOutputSizeInBytes = BigInt(zipBuffer.length);

    const endTime = performance.now();
    const processingTimeInMs = Math.round(endTime - startTime);

    // 5. 성능 로그 기록
    prisma.performanceLog.create({
      data: {
        operationType: OperationType.CONVERT_TO_IMAGE,
        fileCount: 1, // 단일 PDF 파일 변환
        totalInputSizeInBytes: BigInt(totalInputSizeInBytes),
        outputSizeInBytes: finalOutputSizeInBytes,
        processingTimeInMs,
        githubVersion,
      }
    }).catch((err: unknown) => {
      console.error("Failed to log performance data for conversion:", err);
    });

    // 6. 압축된 ZIP 파일과 함께 응답 반환
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
    // 7. 임시 디렉토리 정리
    if (tempDir) {
      await fs.rm(tempDir, { recursive: true, force: true });
    }
  }
}