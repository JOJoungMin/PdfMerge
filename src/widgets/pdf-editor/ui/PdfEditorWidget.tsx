'use client';

import { useState, useEffect, useRef } from 'react';
import * as pdfjs from 'pdfjs-dist/build/pdf.mjs';
//import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';
import { UploadCloud, File as FileIcon } from 'lucide-react';
import { downloadPdf } from '@/shared/lib/pdf/downloadPdf';
import type { PdfPage } from '@/entities/pdf-file/model/types';

if (typeof window !== 'undefined') {
  pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';
}





export function PdfEditorWidget() {
  const [file, setFile] = useState<File | null>(null);
  const [numPages, setNumPages] = useState<number>(0);
  const [pages, setPages] = useState<PdfPage[]>([]);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const canvasContainerRef = useRef<HTMLDivElement | null>(null);


  function removePage(index: number) {
    setPages(prev => prev.filter((_, i) => i !== index));
  }
  
  function movePageUp(index: number) {
    if (index === 0) return; // 첫 페이지면 위로 못 이동
    setPages(prev => {
      const newPages = [...prev];
      [newPages[index - 1], newPages[index]] = [newPages[index], newPages[index - 1]];
      return newPages;
    });
  }
  
  function movePageDown(index: number) {
    setPages(prev => {
      if (index === prev.length - 1) return prev; // 마지막 페이지면 아래로 못 이동
      const newPages = [...prev];
      [newPages[index], newPages[index + 1]] = [newPages[index + 1], newPages[index]];
      return newPages;
    });
  }
  

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

        const pageList: PdfPage[] = [];

        for(let i = 1; i<=pdf.numPages; i++){
          const page = await pdf.getPage(i);
          const scale = 1.5;
          const viewport = page.getViewport({scale})

          const canvas = document.createElement('canvas');
          canvas.height = viewport.height;
          canvas.width = viewport.width;
          const context = canvas.getContext('2d');

          if(context){
            await page.render({canvasContext: context, viewport}).promise;
          }

          canvasContainerRef.current?.appendChild(canvas);

          pageList.push({
            id: `page-${i}`,
            pageNumber: i,
            canvas,
            imageUrl: canvas.toDataURL(),
          });

        }
        setPages(pageList);
        setIsLoading(false);
       
      } catch (error: any) {
        console.error('Error loading or rendering PDF:', error);
        setPdfError(`PDF 파일을 불러오는 데 실패했습니다: ${error.message}`);
        setIsLoading(false);
      }
      finally {
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

          <div className='pdf-pages'>

            {pages.map((page, index) => (
              <div key = {page.id} className='pdf-page'>
                <img src= {page.imageUrl} alt={`Page ${page.pageNumber}`}></img>
                <button onClick={() => removePage(index)}>삭제</button>
                <button onClick={() => movePageUp(index)}>위로</button>
                <button onClick={() => movePageDown(index)}>아래로</button>
              </div>
            ))}


          </div>
          
          {!isLoading && pages.length > 0 && (
            <div className="mt-6 text-center">
              <button
                onClick={() => downloadPdf(pages, file?.name)}
                className="w-full rounded-lg bg-green-600 px-6 py-3 text-lg font-semibold text-white shadow-md hover:bg-green-700 transition-colors"
              >
                PDF 다운로드
              </button>
            </div>
          )}


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