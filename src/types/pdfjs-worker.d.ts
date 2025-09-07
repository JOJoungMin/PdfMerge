declare module 'pdfjs-dist/legacy/build/pdf';
declare module 'pdfjs-dist/build/pdf';
declare module 'pdfjs-dist/build/pdf.mjs';
declare module 'pdfjs-dist/build/pdf.worker.mjs';
declare module 'pdfjs-dist/build/pdf.worker.min.mjs';
declare module 'pdfjs-dist/legacy/build/pdf.mjs';
declare module 'pdfjs-dist/legacy/build/pdf.worker.min.js';
declare module 'pdfjs-dist/esm/pdf';
declare module '*.mjs?url' {
    const value: string;
    export default value;
  }

declare module 'pdfjs-dist/webpack' {
    const worker: string;
    export default worker;
}
  
declare module 'pdfjs-dist/legacy/build/pdf' {
  import type { PDFDocumentProxy } from 'pdfjs-dist/types/src/display/api';
  export const getDocument: (src: ArrayBuffer) => { promise: Promise<PDFDocumentProxy> };
  export const GlobalWorkerOptions: { workerSrc: string };
}
