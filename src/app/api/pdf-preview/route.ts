import { NextResponse } from 'next/server';
import {promises as fs} from 'fs';
import {exec} from 'child_process';
import { promisify } from 'util';
import path from 'path';

const execPromise = promisify(exec);
export async function POST(request: Request) {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
        return NextResponse.json({ error: '파일이 필요합니다.' }, { status: 400 });
    }

    const firstPageParam = formData.get('firstPage');
    const lastPageParam = formData.get('lastPage');
    const firstPage = firstPageParam ? Number(firstPageParam) : 1;
    let lastPage = lastPageParam ? Number(lastPageParam) : 1;

    const buffer = Buffer.from(await file.arrayBuffer());
    const tempDir = await fs.mkdtemp(path.join(process.cwd(), 'tmp-')); 
    const inputPath = path.join(tempDir, 'input.pdf');

    try {
        await fs.writeFile(inputPath, buffer);

        // pdfinfo로 전체 페이지 수 가져오기
        let totalPages = 1;
        try {
          const { stdout } = await execPromise(`pdfinfo "${inputPath}"`);
          const match = stdout.match(/Pages:\s+(\d+)/);
          if (match) {
            totalPages = Number(match[1]);
          }
        } catch (e) {
          console.warn('pdfinfo로 페이지 수 확인 실패, 기본값 1 사용', e);
        }

        // lastPage가 지정되지 않았으면 전체 페이지로 설정
        if (!lastPageParam) lastPage = totalPages;

        const previews: string[] = [];

        for (let i = firstPage; i <= lastPage; i++) {
            const outputPath = path.join(tempDir, `page-${i}.png`);
            const command = `gs -dNOPAUSE -dBATCH -sDEVICE=pngalpha -dFirstPage=${i} -dLastPage=${i} -r150 -sOutputFile=${outputPath} ${inputPath}`;
            await execPromise(command);

            const imageBuffer = await fs.readFile(outputPath);
            previews.push(`data:image/png;base64,${imageBuffer.toString('base64')}`);
        }

        return NextResponse.json({ previews, totalPages });
    } finally {
        await fs.rm(tempDir, { recursive: true, force: true });
    }
}
