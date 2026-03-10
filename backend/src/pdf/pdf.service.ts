import { Injectable } from '@nestjs/common';
import { PDFDocument, degrees, StandardFonts, rgb } from 'pdf-lib';
import { exec, execFile } from 'child_process';
import { promisify } from 'util';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import JSZip from 'jszip';

/** 페이지별로 가릴 사각형 영역 (PDF 좌표, 원점 좌하단) */
export interface RedactRect {
  x: number;
  y: number;
  width: number;
  height: number;
}
export interface PageRects {
  pageIndex: number;
  rects: RedactRect[];
}

/** 사용자 지정 가리기 영역. x,y,width,height는 비율(0~1, 원점 좌상단). */
export type RedactAreaStyle = 'black' | 'blur' | 'background';
export interface UserRedactArea {
  pageIndex: number;
  x: number;
  y: number;
  width: number;
  height: number;
  style: RedactAreaStyle;
}

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

  /**
   * 특정 문자열을 찾아 반투명 사각형으로 흐리게 가림 (블라인드).
   * pdfjs-dist로 텍스트+좌표 추출 → pdf-lib로 사각형 그리기.
   */
  async redactByText(file: Express.Multer.File, searchString: string): Promise<Buffer> {
    if (!file?.buffer) throw new Error('PDF 파일이 필요합니다.');
    const search = searchString?.trim();
    if (!search) throw new Error('가릴 문자열을 입력해 주세요.');

    const pageRects = await this.findTextPositions(file.buffer, search);
    if (pageRects.every((pr) => pr.rects.length === 0)) {
      // 매칭 없으면 원본 반환
      return Buffer.from(file.buffer);
    }

    const doc = await PDFDocument.load(file.buffer);
    const pages = doc.getPages();

    for (const { pageIndex, rects } of pageRects) {
      if (pageIndex >= pages.length || !rects.length) continue;
      const page = pages[pageIndex];
      for (const r of rects) {
        page.drawRectangle({
          x: r.x,
          y: r.y,
          width: r.width,
          height: r.height,
          color: rgb(1, 1, 1),
          opacity: 0.88,
        });
      }
    }

    const bytes = await doc.save();
    return Buffer.from(bytes);
  }

  /** 사용자 지정 사각형 영역을 black / blur / background 스타일로 가리기. */
  async redactByAreas(file: Express.Multer.File, areas: UserRedactArea[]): Promise<Buffer> {
    if (!file?.buffer) throw new Error('PDF 파일이 필요합니다.');
    if (!areas?.length) throw new Error('가릴 영역이 1개 이상 필요합니다.');

    const doc = await PDFDocument.load(file.buffer);
    const pages = doc.getPages();
    const GS_DPI = 150;
    const scale = GS_DPI / 72;
    const sharp = (await import('sharp')).default;

    const byPage = new Map<number, UserRedactArea[]>();
    for (const a of areas) {
      if (a.pageIndex < 0 || a.pageIndex >= pages.length) continue;
      if (!byPage.has(a.pageIndex)) byPage.set(a.pageIndex, []);
      byPage.get(a.pageIndex)!.push(a);
    }

    for (const [pageIndex, pageAreas] of byPage) {
      const page = pages[pageIndex];
      const pageWidth = page.getWidth();
      const pageHeight = page.getHeight();
      let pngBuffer: Buffer | null = null;

      for (const area of pageAreas) {
        const { x: xRatio, y: yRatio, width: wRatio, height: hRatio, style } = area;
        const px = Math.max(0, Math.min(1, xRatio)) * pageWidth;
        const py = (1 - Math.max(0, Math.min(1, yRatio + hRatio))) * pageHeight;
        const pw = Math.max(1, Math.min(1, wRatio) * pageWidth);
        const ph = Math.max(1, Math.min(1, hRatio) * pageHeight);

        if (style === 'black') {
          page.drawRectangle({
            x: px,
            y: py,
            width: pw,
            height: ph,
            color: rgb(0, 0, 0),
          });
          continue;
        }

        if (style === 'blur' || style === 'background') {
          if (!pngBuffer) pngBuffer = await this.renderPdfPageToPng(file.buffer, pageIndex + 1);
          const left = Math.floor(px * scale);
          const top = Math.floor((pageHeight - py - ph) * scale);
          const imgW = Math.max(1, Math.floor(pw * scale));
          const imgH = Math.max(1, Math.floor(ph * scale));
          const meta = await sharp(pngBuffer).metadata();
          const iw = meta.width ?? 0;
          const ih = meta.height ?? 0;
          const clampedLeft = Math.max(0, Math.min(left, iw - 1));
          const clampedTop = Math.max(0, Math.min(top, ih - 1));
          const clampedW = Math.max(1, Math.min(imgW, iw - clampedLeft));
          const clampedH = Math.max(1, Math.min(imgH, ih - clampedTop));

          if (style === 'blur') {
            const blurred = await sharp(pngBuffer)
              .extract({ left: clampedLeft, top: clampedTop, width: clampedW, height: clampedH })
              .blur(35)
              .png()
              .toBuffer();
            const embed = await doc.embedPng(blurred);
            page.drawImage(embed, { x: px, y: py, width: pw, height: ph });
          } else {
            const { data: rawBuffer, info } = await sharp(pngBuffer)
              .extract({ left: clampedLeft, top: clampedTop, width: clampedW, height: clampedH })
              .raw()
              .toBuffer({ resolveWithObject: true });
            const channels = info.channels ?? 4;
            const band = Math.max(1, Math.min(3, Math.floor(Math.min(clampedW, clampedH) * 0.25)));
            let r = 0, g = 0, b = 0, n = 0;
            const stride = clampedW * channels;
            for (let row = 0; row < clampedH; row++) {
              for (let col = 0; col < clampedW; col++) {
                const isEdge = row < band || row >= clampedH - band || col < band || col >= clampedW - band;
                if (!isEdge) continue;
                const i = row * stride + col * channels;
                r += rawBuffer[i];
                g += rawBuffer[i + 1] ?? 0;
                b += rawBuffer[i + 2] ?? 0;
                n += 1;
              }
            }
            if (n > 0) {
              const R = r / n / 255;
              const G = g / n / 255;
              const B = b / n / 255;
              page.drawRectangle({
                x: px,
                y: py,
                width: pw,
                height: ph,
                color: rgb(R, G, B),
              });
            }
          }
        }
      }
    }

    const bytes = await doc.save();
    return Buffer.from(bytes);
  }

  /** Poppler pdftotext 실행 경로. PATH 미반영 시 PDFTOTEXT_PATH 환경 변수로 전체 경로 지정 (예: C:\poppler-25.12.0\bin\pdftotext.exe) */
  private getPdftotextCommand(): string {
    const envPath = process.env.PDFTOTEXT_PATH;
    if (envPath?.trim()) return envPath.trim();
    return 'pdftotext';
  }

  /**
   * Poppler pdftotext로 같은 PDF 텍스트 추출 → 콘솔 로그 (엔진 비교용).
   * pdftotext 미설치 시 무시.
   */
  private async logPopplerExtract(pdfBuffer: Buffer): Promise<void> {
    const tempDir = await fs.mkdtemp(path.join(this.tmpDir, 'pdf-poppler-'));
    const inputPath = path.join(tempDir, 'input.pdf');
    const pdftotextCmd = this.getPdftotextCommand();
    try {
      await fs.writeFile(inputPath, pdfBuffer);
      const { stdout } = await execFilePromise(pdftotextCmd, [inputPath, '-'], { encoding: 'utf-8', maxBuffer: 2 * 1024 * 1024 });
      const text = (stdout ?? '').trim();
      // eslint-disable-next-line no-console
      console.log('[pdf-redact] Poppler pdftotext 추출 텍스트 전체 (' + text.length + '자):\n' + (text || '(비어 있음)'));
    } catch (e) {
      // eslint-disable-next-line no-console
      console.log('[pdf-redact] Poppler pdftotext 미사용 (미설치 또는 오류):', (e as Error).message);
    } finally {
      await fs.rm(tempDir, { recursive: true, force: true });
    }
  }

  /**
   * Ghostscript으로 PDF 한 페이지를 PNG 이미지로 렌더 (OCR용).
   * GS 미설치 시 예외.
   */
  private async renderPdfPageToPng(pdfBuffer: Buffer, pageNum: number): Promise<Buffer> {
    const tempDir = await fs.mkdtemp(path.join(this.tmpDir, 'pdf-ocr-'));
    const inputPath = path.join(tempDir, 'input.pdf');
    const outputPath = path.join(tempDir, 'page.png');
    try {
      await fs.writeFile(inputPath, pdfBuffer);
      const args = ['-dNOPAUSE', '-dBATCH', '-sDEVICE=pngalpha', `-dFirstPage=${pageNum}`, `-dLastPage=${pageNum}`, '-r150', `-sOutputFile=${outputPath}`, inputPath];
      await execFilePromise(gsCommand, args);
      return await fs.readFile(outputPath);
    } finally {
      await fs.rm(tempDir, { recursive: true, force: true });
    }
  }

  /**
   * Tesseract.js OCR으로 이미지에서 텍스트 추출 (한글+영어).
   * tesseract.js 설치 필요. 실패 시 빈 문자열 반환.
   */
  private async extractTextWithOcr(imageBuffer: Buffer): Promise<string> {
    try {
      const { createWorker } = await import('tesseract.js');
      const worker = await createWorker('kor+eng');
      const { data } = await worker.recognize(imageBuffer);
      await worker.terminate();
      return (data?.text ?? '').trim();
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn('[pdf-redact] OCR(tesseract.js) 실패:', (e as Error).message);
      return '';
    }
  }

  /**
   * OCR(tesseract.js)로 PDF 전체 페이지 텍스트 추출 후 콘솔에 출력.
   * Ghostscript으로 페이지별 PNG 렌더 후 OCR. 블라인드 좌표는 사용하지 않음.
   */
  private async logOcrExtract(pdfBuffer: Buffer): Promise<void> {
    let numPages = 1;
    try {
      const doc = await PDFDocument.load(pdfBuffer);
      numPages = doc.getPageCount();
    } catch {
      numPages = 1;
    }
    // eslint-disable-next-line no-console
    console.log('[pdf-redact] OCR 추출 시작 (페이지 수:', numPages, ')');
    const parts: string[] = [];
    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      try {
        const pngBuffer = await this.renderPdfPageToPng(pdfBuffer, pageNum);
        const text = await this.extractTextWithOcr(pngBuffer);
        parts.push(text || '');
        // eslint-disable-next-line no-console
        console.log(`[pdf-redact] OCR 페이지 ${pageNum} (${text.length}자):`, text ? text.slice(0, 200) + (text.length > 200 ? '...' : '') : '(비어 있음)');
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn(`[pdf-redact] OCR 페이지 ${pageNum} 실패:`, (e as Error).message);
        parts.push('');
      }
    }
    const full = parts.join('\n\n').trim();
    // eslint-disable-next-line no-console
    console.log('[pdf-redact] OCR 추출 텍스트 전체 (' + full.length + '자):\n' + (full || '(비어 있음)'));
  }

  /**
   * pdfjs-dist로 PDF에서 검색어 위치(페이지별 사각형 목록) 추출.
   * 텍스트 출력은 OCR로 하고, 블라인드 좌표만 pdfjs 사용 (pdfjs 0자면 좌표 없음).
   */
  private async findTextPositions(pdfBuffer: Buffer, searchString: string): Promise<PageRects[]> {
    await this.logOcrExtract(pdfBuffer);

    const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
    const opts = (pdfjsLib as any).GlobalWorkerOptions;
    if (opts && !opts.workerSrc) {
      try {
        opts.workerSrc = require.resolve('pdfjs-dist/legacy/build/pdf.worker.mjs');
      } catch {
        opts.workerSrc = path.join(process.cwd(), 'node_modules', 'pdfjs-dist', 'legacy', 'build', 'pdf.worker.mjs');
      }
    }

    const data = new Uint8Array(pdfBuffer);
    const loadingTask = (pdfjsLib as any).getDocument({
      data,
      useSystemFonts: true,
      disableFontFace: true,
      standardFontDataUrl: undefined,
    });
    const pdf = await loadingTask.promise;
    const numPages = pdf.numPages;
    const result: PageRects[] = [];

    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      const items = textContent?.items ?? [];
      const rects = this.findSearchRects(items, searchString);
      result.push({ pageIndex: pageNum - 1, rects });
    }

    return result;
  }

  /** 공백 접기 + NFC 정규화 (PDF 추출 텍스트와 검색어 매칭 보정) */
  private normalizeForSearch(s: string): string {
    return (s ?? '')
      .normalize('NFC')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /** 정규화된 문자열에서 검색하고, 원본 fullText 상의 [start, end) 범위 반환 */
  private normalizedSearch(
    fullText: string,
    searchString: string,
  ): { origStart: number; origEnd: number }[] {
    const normSearch = this.normalizeForSearch(searchString);
    if (!normSearch) return [];

    const fullNorm = fullText.normalize('NFC');
    const normToFull: number[] = [];
    let norm = '';
    for (let i = 0; i < fullNorm.length; i++) {
      const c = fullNorm[i];
      const isSpace = /\s/.test(c);
      if (isSpace && norm.length > 0 && /\s/.test(norm[norm.length - 1])) continue;
      norm += c;
      normToFull.push(i);
    }

    const hits: { origStart: number; origEnd: number }[] = [];
    let idx = 0;
    while (idx < norm.length) {
      const found = norm.indexOf(normSearch, idx);
      if (found < 0) break;
      const endNorm = found + normSearch.length;
      const origStart = normToFull[found] ?? 0;
      const lastNormIdx = Math.min(endNorm - 1, normToFull.length - 1);
      const origEnd = (normToFull[lastNormIdx] ?? 0) + 1;
      hits.push({ origStart, origEnd });
      idx = endNorm;
    }
    return hits;
  }

  private findSearchRects(
    items: { str?: string; transform?: number[]; width?: number; height?: number }[],
    searchString: string,
  ): RedactRect[] {
    const rects: RedactRect[] = [];
    let fullText = '';
    const itemRanges: { start: number; end: number; x: number; y: number; w: number; h: number }[] = [];

    for (const it of items) {
      const str = (it.str ?? '').toString();
      const start = fullText.length;
      fullText += str;
      const end = fullText.length;
      const t = it.transform;
      const x = t && t[4] != null ? t[4] : 0;
      const y = t && t[5] != null ? t[5] : 0;
      let w = typeof it.width === 'number' ? it.width : 0;
      let h = typeof it.height === 'number' ? it.height : 0;
      if (h <= 0) h = 8;
      if (w <= 0) w = 4;
      itemRanges.push({ start, end, x, y, w, h });
    }

    const hits = this.normalizedSearch(fullText, searchString);
    if (hits.length === 0) {
      const direct = fullText.indexOf(searchString.trim());
      if (direct >= 0) {
        hits.push({ origStart: direct, origEnd: direct + searchString.trim().length });
      }
    }

    for (const { origStart: found, origEnd: endFound } of hits) {
      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;
      for (const r of itemRanges) {
        if (r.end <= found || r.start >= endFound) continue;
        minX = Math.min(minX, r.x);
        minY = Math.min(minY, r.y);
        maxX = Math.max(maxX, r.x + r.w);
        maxY = Math.max(maxY, r.y + r.h);
      }
      if (minX !== Infinity && minY !== Infinity) {
        let width = maxX - minX;
        let height = maxY - minY;
        if (height <= 0) height = 10;
        if (width <= 0) width = 20;
        rects.push({
          x: minX,
          y: minY,
          width,
          height,
        });
      }
    }

    return rects;
  }
}
