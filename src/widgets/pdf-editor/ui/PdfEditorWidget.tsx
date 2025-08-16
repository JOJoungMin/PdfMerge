'use client';

import { useState, useEffect, useRef } from 'react';
import * as pdfjs from 'pdfjs-dist/build/pdf.mjs';
//import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';
import { UploadCloud, File as FileIcon } from 'lucide-react';

if (typeof window !== 'undefined') {
  pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';
}


export function PdfEditorWidget() {
  const [file, setFile] = useState<File | null>(null);
  const [numPages, setNumPages] = useState<number>(0);
  const [pages, setPages] = useState<{id: string; pageNuber: number}[]>([]);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const canvasContainerRef = useRef<HTMLDivElement | null>(null);

  function onFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const { files } = event.target;
    if (files && files[0]) {
      setFile(files[0]);
      setPdfError(null);
      setNumPages(0);
    }
  }

  useEffect(() => {
    if (!file) {
      return;
    }

    const loadAndRenderPdf = async () => {
      setIsLoading(true);
      setPdfError(null);

      // Clear previous canvases
      if (canvasContainerRef.current) {
        canvasContainerRef.current.innerHTML = '';
      }

      try {
        const arrayBuffer = await file.arrayBuffer();
        const loadingTask = pdfjs.getDocument(arrayBuffer);
        const pdf = await loadingTask.promise;

        setNumPages(pdf.numPages);

        // Wait for the state to update and canvases to be created in the next render
        // This is a simplified approach; a more robust one might use a different effect
        setTimeout(async () => {
          for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const scale = 1.5;
            const viewport = page.getViewport({ scale });
            
            const canvas = document.createElement('canvas');
            canvas.className = 'mb-4 shadow-lg';
            const context = canvas.getContext('2d');
            canvas.height = viewport.height;
            canvas.width = viewport.width;

            if (context && canvasContainerRef.current) {
              canvasContainerRef.current.appendChild(canvas);
              const renderContext = {
                canvasContext: context,
                viewport: viewport,
              };
              await page.render(renderContext as any);
            }
          }
          setIsLoading(false);
        }, 100); // A small delay to allow React to render the container

      } catch (error: any) {
        console.error('Error loading or rendering PDF:', error);
        setPdfError(`PDF 파일을 불러오는 데 실패했습니다: ${error.message}`);
        setIsLoading(false);
      }
    };

    loadAndRenderPdf();

  }, [file]);

  return (
    <div className="w-full max-w-4xl rounded-lg bg-white p-8 shadow-md dark:bg-gray-800">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-white">PDF 뷰어</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          PDF 파일을 선택하면 페이지를 볼 수 있습니다.
        </p>
      </div>

      {!file && (
        <label htmlFor="file-upload" className="flex flex-col items-center justify-center w-full h-64 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 dark:hover:bg-bray-800 dark:bg-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:hover:border-gray-500 dark:hover:bg-gray-600">
          <div className="flex flex-col items-center justify-center pt-5 pb-6">
            <UploadCloud className="w-10 h-10 mb-3 text-gray-400" />
            <p className="mb-2 text-sm text-gray-500 dark:text-gray-400"><span className="font-semibold">클릭하여 업로드</span> 또는 드래그 앤 드롭</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">PDF 파일 (최대 50MB)</p>
          </div>
          <input id="file-upload" type="file" className="hidden" onChange={onFileChange} accept=".pdf" />
        </label>
      )}

      {pdfError && (
        <div className="mt-4 p-4 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 rounded-lg text-center">
          <p>{pdfError}</p>
        </div>
      )}

      {file && (
        <div>
          <div className="flex justify-between items-center mb-4 p-3 rounded-md bg-gray-100 dark:bg-gray-700">
            <div className="flex items-center">
              <FileIcon className="mr-2 h-5 w-5 flex-shrink-0 text-blue-500" />
              <span className="truncate text-sm font-medium text-gray-800 dark:text-gray-200">
                {file.name}
              </span>
            </div>
            <button
              onClick={() => setFile(null)}
              className="text-sm text-blue-600 hover:underline"
            >
              파일 변경
            </button>
          </div>
          {isLoading && <p className="text-center">PDF를 렌더링 중입니다...</p>}
          <div ref={canvasContainerRef} className="max-h-[70vh] overflow-y-auto bg-gray-200 dark:bg-gray-900 p-4 rounded-lg" />
          {!isLoading && numPages > 0 && (
            <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-4">
              총 {numPages} 페이지
            </p>
          )}
        </div>
      )}
    </div>
  );
}