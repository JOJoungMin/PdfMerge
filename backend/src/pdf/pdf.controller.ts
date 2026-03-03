import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFiles,
  UploadedFile,
  Body,
  BadRequestException,
  StreamableFile,
  Header,
  Logger,
  Request,
  Req
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { PdfService } from './pdf.service';

@Controller()
export class PdfController {
  private readonly logger = new Logger(PdfController.name);

  constructor(private readonly pdfService: PdfService) {}

  @Post('pdf-merge')
  @UseInterceptors(
    FilesInterceptor('files', 20, { limits: { fileSize: 50 * 1024 * 1024 } }),
  )
  async merge(
    @UploadedFiles() files: Express.Multer.File[],
    @Req() req: Request,
    @Body('githubVersion') _githubVersion?: string,
  ) {
    const traceId = (req as any).traceId;
    this.logger.log(`[${traceId}] pdf-merge 요청 받음`);
    if (!files?.length) {
      throw new BadRequestException('병합할 파일이 2개 이상 필요합니다.');
    }
    const buffer = await this.pdfService.merge(files);
    const filename = `merged-${(files[0].originalname || 'document').replace(/\.pdf$/i, '')}.pdf`;
    return new StreamableFile(buffer, {
      type: 'application/pdf',
      disposition: `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
    });
  }

  @Post('pdf-edit-combined')
  @UseInterceptors(
    FilesInterceptor('files', 10, { limits: { fileSize: 50 * 1024 * 1024 } }),
  )
  async editCombined(
    @UploadedFiles() files: Express.Multer.File[],
    @Body('pages') pages: string,
    @Body('githubVersion') _githubVersion?: string,
  ) {
    this.logger.log('pdf-edit 요청 받음');
    if (!files?.length || !pages) {
      throw new BadRequestException('필수 데이터가 누락되었습니다.');
    }
    const buffer = await this.pdfService.editCombined(files, pages);
    return new StreamableFile(buffer, {
      type: 'application/pdf',
      disposition: 'attachment; filename="edited-document.pdf"',
    });
  }

  @Post('pdf-preview')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 30 * 1024 * 1024 } }))
  async preview(
    @UploadedFile() file: Express.Multer.File,
    @Body('firstPage') firstPage?: string,
    @Body('lastPage') lastPage?: string,
  ) {
    this.logger.log('pdf-preview 요청 받음');
    if (!file) {
      throw new BadRequestException('파일이 필요합니다.');
    }
    const first = firstPage ? Number(firstPage) : 1;
    const last = lastPage ? Number(lastPage) : undefined;
    return this.pdfService.preview(file, first, last);
  }

  @Post('pdf-compress')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 50 * 1024 * 1024 } }))
  async compress(
    @UploadedFile() file: Express.Multer.File,
    @Body('quality') _quality?: string,
    @Body('githubVersion') _githubVersion?: string,
  ) {
    this.logger.log('pdf-compress 요청 받음');
    if (!file) {
      throw new BadRequestException('압축할 파일이 필요합니다.');
    }
    const buffer = await this.pdfService.compress(file);
    const filename = `compressed-${file.originalname || 'document.pdf'}`;
    return new StreamableFile(buffer, {
      type: 'application/pdf',
      disposition: `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
    });
  }

  @Post('pdf-rotate')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 50 * 1024 * 1024 } }))
  async rotate(
    @UploadedFile() file: Express.Multer.File,
    @Body('angle') angleStr?: string,
  ) {
    this.logger.log('pdf-rotate 요청 받음');
    if (!file) {
      throw new BadRequestException('회전할 파일이 필요합니다.');
    }
    const angle = parseInt(angleStr ?? '90', 10);
    if (![90, 180, 270].includes(angle)) {
      throw new BadRequestException('회전 각도는 90, 180, 270 중 하나여야 합니다.');
    }
    const buffer = await this.pdfService.rotate(file, angle as 90 | 180 | 270);
    const filename = `rotated-${file.originalname || 'document.pdf'}`;
    return new StreamableFile(buffer, {
      type: 'application/pdf',
      disposition: `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
    });
  }

  @Post('image-to-pdf')
  @UseInterceptors(
    FilesInterceptor('files', 20, { limits: { fileSize: 20 * 1024 * 1024 } }),
  )
  async imageToPdf(@UploadedFiles() files: Express.Multer.File[]) {
    this.logger.log('image-to-pdf 요청 받음');
    if (!files?.length) {
      throw new BadRequestException('이미지 파일이 1개 이상 필요합니다.');
    }
    const allowed = ['image/jpeg', 'image/jpg', 'image/png'];
    const invalid = files.find((f) => !f.mimetype || !allowed.includes(f.mimetype.toLowerCase()));
    if (invalid) {
      throw new BadRequestException('JPG, PNG 이미지만 지원합니다.');
    }
    const result = await this.pdfService.imagesToPdf(files);
    return new StreamableFile(result.buffer, {
      type: result.contentType,
      disposition: `attachment; filename*=UTF-8''${encodeURIComponent(result.filename)}`,
    });
  }

  @Post('pdf-convert')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 50 * 1024 * 1024 } }))
  async convert(
    @UploadedFile() file: Express.Multer.File,
    @Body('targetFormat') targetFormat?: string,
    @Body('githubVersion') _githubVersion?: string,
  ) {
    this.logger.log('pdf-convert 요청 받음');
    if (!file) {
      throw new BadRequestException('변환할 파일이 필요합니다.');
    }
    const format = targetFormat === 'jpeg' ? 'jpeg' : 'png';
    const buffer = await this.pdfService.convert(file, format);
    const baseName = (file.originalname || 'document').replace(/\.pdf$/i, '');
    return new StreamableFile(buffer, {
      type: 'application/zip',
      disposition: `attachment; filename*=UTF-8''${encodeURIComponent(`${baseName}.zip`)}`,
    });
  }
}
