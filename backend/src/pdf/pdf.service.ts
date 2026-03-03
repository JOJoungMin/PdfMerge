import { Injectable } from '@nestjs/common';
import { PDFDocument, degrees, StandardFonts, rgb } from 'pdf-lib';
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
  fileIndex?: number;
  fileName?: string;
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
    const sourceDocs: PDFDocument[] = [];
    for (const f of files) {
      const pdfDoc = await PDFDocument.load(f.buffer);
      sourceDocs.push(pdfDoc);
    }
    const newPdfDoc = await PDFDocument.create();
    for (const pageInfo of orderedPages) {
      const idx = pageInfo.fileIndex ?? (pageInfo.fileName != null ? files.findIndex((f) => f.originalname === pageInfo.fileName) : -1);
      const sourceDoc = idx >= 0 ? sourceDocs[idx] : undefined;
      if (!sourceDoc) continue;
      const [copiedPage] = await newPdfDoc.copyPages(sourceDoc, [pageInfo.pageIndex]);
      newPdfDoc.addPage(copiedPage);
    }
    const bytes = await newPdfDoc.save();
    return Buffer.from(bytes);
  }

  /** 미리보기: 페이지 수는 pdf-lib 사용, 썸네일은 Ghostscript 필요 */
  async preview(
    file: Express.Multer.File,
    firstPage: number,
    lastPage?: number,
  ): Promise<{ previews: string[]; totalPages: number }> {
    if (!file) throw new Error('파일이 필요합니다.');
    let totalPages = 1;
    try {
      const pdfDoc = await PDFDocument.load(file.buffer);
      totalPages = pdfDoc.getPageCount();
    } catch {
      // pdf-lib 실패 시 기본값
    }
    const tempDir = await fs.mkdtemp(path.join(this.tmpDir, 'pdf-preview-'));
    const inputPath = path.join(tempDir, 'input.pdf');
    try {
      await fs.writeFile(inputPath, file.buffer);
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

  /** PDF 회전 (pdf-lib만 사용). pageIndex 있으면 해당 페이지만 회전, 없으면 전체 동일 각도 */
  async rotate(file: Express.Multer.File, angle: 90 | 180 | 270, pageIndex?: number): Promise<Buffer> {
    if (!file) throw new Error('회전할 파일이 필요합니다.');
    const pdfDoc = await PDFDocument.load(file.buffer);
    const pages = pdfDoc.getPages();
    const rotation = angle === 90 ? degrees(90) : angle === 180 ? degrees(180) : degrees(270);
    if (pageIndex != null && pageIndex >= 0 && pageIndex < pages.length) {
      pages[pageIndex].setRotation(rotation);
    } else {
      for (const page of pages) {
        page.setRotation(rotation);
      }
    }
    const bytes = await pdfDoc.save();
    return Buffer.from(bytes);
  }

  /** 이미지 1장 → 1페이지 PDF. 여러 장이면 PDF 여러 개를 ZIP으로 반환 */
  async imagesToPdf(files: Express.Multer.File[]): Promise<{ buffer: Buffer; contentType: 'application/pdf' | 'application/zip'; filename: string }> {
    if (!files?.length) throw new Error('이미지 파일이 1개 이상 필요합니다.');
    const pdfBuffers: { buffer: Buffer; name: string }[] = [];
    for (const file of files) {
      const mime = file.mimetype?.toLowerCase() || '';
      const buffer = file.buffer;
      const doc = await PDFDocument.create();
      const img = mime === 'image/jpeg' || mime === 'image/jpg'
        ? await doc.embedJpg(buffer)
        : await doc.embedPng(buffer);
      const page = doc.addPage([img.width, img.height]);
      page.drawImage(img, { x: 0, y: 0, width: img.width, height: img.height });
      const bytes = await doc.save();
      const baseName = (file.originalname || 'image').replace(/\.(jpe?g|png)$/i, '');
      pdfBuffers.push({ buffer: Buffer.from(bytes), name: `${baseName}.pdf` });
    }
    if (pdfBuffers.length === 1) {
      return {
        buffer: pdfBuffers[0].buffer,
        contentType: 'application/pdf',
        filename: pdfBuffers[0].name,
      };
    }
    const zip = new JSZip();
    pdfBuffers.forEach((p, i) => zip.file(p.name, p.buffer));
    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });
    return {
      buffer: zipBuffer,
      contentType: 'application/zip',
      filename: 'images-to-pdf.zip',
    };
  }

  /** 페이지 번호 넣기 (pdf-lib만 사용) */
  async addPageNumbers(
    file: Express.Multer.File,
    opts: {
      position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right';
      margin: 'narrow' | 'medium' | 'wide';
      startPage: number;
      endPage: number;
      startNumber: number;
      textFormat: 'number-only' | 'n-of-total';
      padding: 1 | 2 | 3;
    },
  ): Promise<Buffer> {
    if (!file) throw new Error('PDF 파일이 필요합니다.');
    const doc = await PDFDocument.load(file.buffer);
    const font = await doc.embedStandardFont(StandardFonts.Helvetica);
    const pages = doc.getPages();
    const totalPages = pages.length;
    const fontSize = 12;
    const marginPt = opts.margin === 'narrow' ? 12 : opts.margin === 'wide' ? 28 : 20;

    const formatNum = (n: number, total: number): string => {
      const pad = (v: number) => {
        const s = String(v);
        if (opts.padding === 2) return s.padStart(2, '0');
        if (opts.padding === 3) return s.padStart(3, '0');
        return s;
      };
      if (opts.textFormat === 'n-of-total') return `${pad(n)} / ${total}`;
      return pad(n);
    };

    const start = Math.max(1, Math.min(opts.startPage, totalPages));
    const end = Math.max(start, Math.min(opts.endPage, totalPages));
    const totalInRange = end - start + 1;

    for (let i = start - 1; i < end; i++) {
      const page = pages[i];
      const pageNum = opts.startNumber + (i - (start - 1));
      const text = formatNum(pageNum, totalInRange);
      const textWidth = font.widthOfTextAtSize(text, fontSize);
      const w = page.getWidth();
      const h = page.getHeight();

      let x: number;
      let y: number;
      switch (opts.position) {
        case 'top-left':
          x = marginPt;
          y = h - marginPt - fontSize;
          break;
        case 'top-right':
          x = w - marginPt - textWidth;
          y = h - marginPt - fontSize;
          break;
        case 'bottom-left':
          x = marginPt;
          y = marginPt;
          break;
        case 'bottom-center':
          x = (w - textWidth) / 2;
          y = marginPt;
          break;
        case 'bottom-right':
          x = w - marginPt - textWidth;
          y = marginPt;
          break;
        default:
          x = w - marginPt - textWidth;
          y = marginPt;
      }

      page.drawText(text, {
        x,
        y,
        size: fontSize,
        font,
        color: rgb(0, 0, 0),
      });
    }

    const bytes = await doc.save();
    return Buffer.from(bytes);
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
