import { Injectable } from '@nestjs/common';
import { PDFDocument } from 'pdf-lib';
import { exec, execFile } from 'child_process';
import { promisify } from 'util';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import JSZip from 'jszip';

const execPromise = promisify(exec);
const execFilePromise = promisify(execFile);

/** Windows: env 또는 기본 설치 경로. Linux/Mac: gs */
function getGsCommand(): string {
  if (process.platform !== 'win32') return 'gs';
  const envPath = process.env.GHOSTSCRIPT_PATH || process.env.GSWIN64C;
  if (envPath) return envPath;
  return 'C:\\Program Files\\gs\\gs10.06.0\\bin\\gswin64c.exe';
}
const gsCommand = getGsCommand();

export interface PageRepresentation {
  fileName: string;
  pageIndex: number;
}

@Injectable()
export class PdfService {
  private readonly tmpDir = os.tmpdir();

  /** PDF 병합 (pdf-lib만 사용) */
  async merge(files: Express.Multer.File[]): Promise<Buffer> {
    if (!files || files.length < 2) {
      throw new Error('병합할 파일이 2개 이상 필요합니다.');
    }
    const mergedPdf = await PDFDocument.create();
    for (const f of files) {
      const pdfDoc = await PDFDocument.load(f.buffer);
      const copiedPages = await mergedPdf.copyPages(pdfDoc, pdfDoc.getPageIndices());
      copiedPages.forEach((page) => mergedPdf.addPage(page));
    }
    const bytes = await mergedPdf.save();
    return Buffer.from(bytes);
  }

  /** 페이지 추출/재배치 (pdf-lib만 사용) */
  async editCombined(files: Express.Multer.File[], pagesJSON: string): Promise<Buffer> {
    if (!files?.length || !pagesJSON) {
      throw new Error('필수 데이터가 누락되었습니다.');
    }
    const orderedPages: PageRepresentation[] = JSON.parse(pagesJSON);
    const sourceDocs = new Map<string, PDFDocument>();
    for (const f of files) {
      const pdfDoc = await PDFDocument.load(f.buffer);
      sourceDocs.set(f.originalname, pdfDoc);
    }
    const newPdfDoc = await PDFDocument.create();
    for (const pageInfo of orderedPages) {
      const sourceDoc = sourceDocs.get(pageInfo.fileName);
      if (!sourceDoc) continue;
      const [copiedPage] = await newPdfDoc.copyPages(sourceDoc, [pageInfo.pageIndex]);
      newPdfDoc.addPage(copiedPage);
    }
    const bytes = await newPdfDoc.save();
    return Buffer.from(bytes);
  }

  /** 미리보기: 페이지 수 + 썸네일 base64 (Ghostscript, pdfinfo 필요) */
  async preview(
    file: Express.Multer.File,
    firstPage: number,
    lastPage?: number,
  ): Promise<{ previews: string[]; totalPages: number }> {
    if (!file) throw new Error('파일이 필요합니다.');
    const tempDir = await fs.mkdtemp(path.join(this.tmpDir, 'pdf-preview-'));
    const inputPath = path.join(tempDir, 'input.pdf');
    try {
      await fs.writeFile(inputPath, file.buffer);
      let totalPages = 1;
      try {
        const { stdout } = await execPromise(`pdfinfo "${inputPath}"`);
        const match = stdout.match(/Pages:\s+(\d+)/);
        if (match) totalPages = Number(match[1]);
      } catch {
        // pdfinfo 없으면 기본값
      }
      const last = lastPage !== undefined && lastPage !== null ? lastPage : totalPages;
      const previews: string[] = [];
      for (let i = firstPage; i <= last; i++) {
        const outputPath = path.join(tempDir, `page-${i}.png`);
        const args = ['-dNOPAUSE', '-dBATCH', '-sDEVICE=pngalpha', `-dFirstPage=${i}`, `-dLastPage=${i}`, '-r150', `-sOutputFile=${outputPath}`, inputPath];
        await execFilePromise(gsCommand, args);
        const imageBuffer = await fs.readFile(outputPath);
        previews.push(`data:image/png;base64,${imageBuffer.toString('base64')}`);
      }
      return { previews, totalPages };
    } finally {
      await fs.rm(tempDir, { recursive: true, force: true });
    }
  }

  /** 압축 (Ghostscript 필요) */
  async compress(file: Express.Multer.File): Promise<Buffer> {
    if (!file) throw new Error('압축할 파일이 필요합니다.');
    const tempDir = await fs.mkdtemp(path.join(this.tmpDir, 'pdf-compress-'));
    const inputPath = path.join(tempDir, 'input.pdf');
    const outputPath = path.join(tempDir, 'output.pdf');
    try {
      await fs.writeFile(inputPath, file.buffer);
      const args = ['-sDEVICE=pdfwrite', '-dCompatibilityLevel=1.4', '-dPDFSETTINGS=/ebook', '-dNOPAUSE', '-dQUIET', '-dBATCH', `-sOutputFile=${outputPath}`, inputPath];
      await execFilePromise(gsCommand, args);
      return await fs.readFile(outputPath);
    } finally {
      await fs.rm(tempDir, { recursive: true, force: true });
    }
  }

  /** PDF → 이미지 ZIP (Ghostscript + jszip) */
  async convert(file: Express.Multer.File, targetFormat: string): Promise<Buffer> {
    if (!file) throw new Error('변환할 파일이 필요합니다.');
    const format = targetFormat === 'jpeg' ? 'jpeg' : 'png';
    const tempDir = await fs.mkdtemp(path.join(this.tmpDir, 'pdf-convert-'));
    const inputPath = path.join(tempDir, 'input.pdf');
    const outputPattern = path.join(tempDir, `output-%d.${format === 'jpeg' ? 'jpg' : 'png'}`);
    try {
      await fs.writeFile(inputPath, file.buffer);
      const device = format === 'jpeg' ? 'jpeg' : 'pngalpha';
      const args = [`-sDEVICE=${device}`, `-o`, outputPattern, inputPath];
      await execFilePromise(gsCommand, args);
      const zip = new JSZip();
      const names = await fs.readdir(tempDir);
      for (const name of names) {
        if (name.startsWith('output-') && (name.endsWith('.png') || name.endsWith('.jpg'))) {
          const buf = await fs.readFile(path.join(tempDir, name));
          zip.file(name, buf);
        }
      }
      const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });
      return zipBuffer;
    } finally {
      await fs.rm(tempDir, { recursive: true, force: true });
    }
  }
}
