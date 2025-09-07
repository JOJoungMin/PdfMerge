// lib/pdfClient.ts
export async function loadPdfJs() {
    if (typeof window === 'undefined') return null; // 서버에서는 아무 것도 안 함
  
    try {
      // legacy 대신 ESM 빌드 사용
      const pdfjsModule = await import('pdfjs-dist/esm/pdf');
      // ESM 빌드에서는 default export 없을 수 있으므로 그대로 사용
      const pdfjsLib = pdfjsModule;
  
      // public 폴더에 있는 워커 파일 지정
      pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';
      return pdfjsLib;
    } catch (err) {
      console.error('PDF.js 로드 실패:', err);
      return null;
    }
  }
  