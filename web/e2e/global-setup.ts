import { PDFDocument } from 'pdf-lib';
import * as fs from 'fs';
import * as path from 'path';

export default async function globalSetup() {
  const samplePath = path.join(__dirname, 'fixtures', 'sample.pdf');
  if (fs.existsSync(samplePath)) return;

  const doc = await PDFDocument.create();
  doc.addPage([612, 792]);
  const bytes = await doc.save();
  const dir = path.join(__dirname, 'fixtures');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(samplePath, Buffer.from(bytes));
}
