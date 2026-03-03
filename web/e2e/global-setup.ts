import { PDFDocument } from 'pdf-lib';
import * as fs from 'fs';
import * as path from 'path';

const MINIMAL_PNG_BASE64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

export default async function globalSetup() {
  const dir = path.join(__dirname, 'fixtures');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const samplePdfPath = path.join(dir, 'sample.pdf');
  if (!fs.existsSync(samplePdfPath)) {
    const doc = await PDFDocument.create();
    doc.addPage([612, 792]);
    const bytes = await doc.save();
    fs.writeFileSync(samplePdfPath, Buffer.from(bytes));
  }

  // sample.png: 커밋된 파일이 있으면 그대로 사용, 없으면 최소 1x1 PNG 생성 (CI 등)
  const samplePngPath = path.join(dir, 'sample.png');
  if (!fs.existsSync(samplePngPath)) {
    fs.writeFileSync(samplePngPath, Buffer.from(MINIMAL_PNG_BASE64, 'base64'));
  }
}
