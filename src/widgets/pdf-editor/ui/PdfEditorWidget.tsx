'use client';

import { useState, useEffect, useRef } from 'react';
import * as pdfjs from 'pdfjs-dist/build/pdf.mjs';
import { UploadCloud, File as FileIcon, ArrowUp, ArrowDown, X } from 'lucide-react';

// pdf.js 워커 설정 (클라이언트 사이드에서만 필요)
if (typeof window !== 'undefined') {
  pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';
}

export function PdfEditorWidget() {
  const [file, setFile] = useState<File | null>(null);
  const [numPages, setNumPages] = useState<number>(0);
  // pages는 이제 원본 PDF의 페이지 인덱스 배열을 저장합니다.
  const [pages, setPages] = useState<number[]>([]);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // 파일 입력 참조 (UI에서 파일 선택을 트리거하기 위함)
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 페이지 제거
  const removePage = (indexToRemove: number) => {
    setPages(prev => prev.filter((_, idx) => idx !== indexToRemove));
  };

  // 페이지 위로 이동
  const movePageUp = (indexToMove: number) => {
    if (indexToMove === 0) return;
    setPages(prev => {
      const newPages = [...prev];
      [newPages[indexToMove - 1], newPages[indexToMove]] = [newPages[indexToMove], newPages[indexToMove - 1]];
      return newPages;
    });
  };

  // 페이지 아래로 이동
  const movePageDown = (indexToMove: number) => {
    setPages(prev => {
      if (indexToMove === prev.length - 1) return prev;
      const newPages = [...prev];
      [newPages[indexToMove], newPages[indexToMove + 1]] = [newPages[indexToMove + 1], newPages[indexToMove]];
      return newPages;
    });
  };

  // 파일 선택 핸들러
  const onFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const { files } = event.target;
    if (files && files[0]) {
      setFile(files[0]);
      setPdfError(null);
      setIsLoading(true);
      setNumPages(0);
      setPages([]);

      try {
        const arrayBuffer = await files[0].arrayBuffer();
        const loadingTask = pdfjs.getDocument(arrayBuffer);
        const pdf = await loadingTask.promise;

        const totalPages = pdf.numPages;
        setNumPages(totalPages);
        // 초기 페이지 순서는 0부터 totalPages-1까지의 배열
        setPages(Array.from({ length: totalPages }, (_, i) => i));

      } catch (error: unknown) {
        console.error('Error loading PDF for page count:', error);
        if (error instanceof Error) {
          setPdfError(`PDF 파일을 불러오는 데 실패했습니다: ${error.message}`);
        } else {
          setPdfError('알 수 없는 오류가 발생했습니다.');
        }
      } finally {
        setIsLoading(false);
      }
    }
  };

  // 편집된 PDF 다운로드 핸들러
  const handleEditAndDownload = async () => {
    if (!file || pages.length === 0) return;

    setIsLoading(true);
    setPdfError(null);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('pageInstructions', JSON.stringify(pages)); // 페이지 순서 정보를 JSON 문자열로 전송

    try {
      const response = await fetch('/api/pdf-edit', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'PDF 수정에 실패했습니다.');
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `edited-${file.name}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

    } catch (e: unknown) {
      if (e instanceof Error) {
        setPdfError('PDF를 수정하는 중 오류가 발생했습니다: ' + e.message);
      } else {
        setPdfError('알 수 없는 오류가 발생했습니다.');
      }
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-4xl rounded-lg bg-white p-8 shadow-md dark:bg-gray-800">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-white">PDF 편집</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          PDF 파일을 선택하고 페이지를 재정렬하거나 삭제하세요.
        </p>
      </div>

      {!file && (
        <label htmlFor="file-upload" className="flex flex-col items-center justify-center w-full h-64 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 dark:hover:bg-bray-800 dark:bg-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:hover:border-gray-500 dark:hover:bg-gray-600">
          <div className="flex flex-col items-center justify-center pt-5 pb-6">
            <UploadCloud className="w-10 h-10 mb-3 text-gray-400" />
            <p className="mb-2 text-sm text-gray-500 dark:text-gray-400"><span className="font-semibold">클릭하여 업로드</span> 또는 드래그 앤 드롭</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">PDF 파일 (최대 50MB)</p>
          </div>
          <input id="file-upload" type="file" className="hidden" onChange={onFileChange} accept=".pdf" ref={fileInputRef} />
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
            <div className="flex items-center min-w-0">
              <FileIcon className="mr-2 h-5 w-5 flex-shrink-0 text-blue-500" />
              <span className="truncate text-sm font-medium text-gray-800 dark:text-gray-200">
                {file.name}
              </span>
            </div>
            <button
              onClick={() => setFile(null)}
              className="text-sm text-blue-600 hover:underline flex-shrink-0 ml-2"
            >
              파일 변경
            </button>
          </div>

          {isLoading && <p className="text-center">PDF를 불러오는 중입니다...</p>}

          {!isLoading && pages.length > 0 && (
            <div className="mt-6">
              <h3 className="text-xl font-semibold mb-4 text-gray-800 dark:text-white">페이지 순서 편집 ({pages.length} 페이지)</h3>
              <div className="space-y-2 max-h-96 overflow-y-auto p-2 border rounded-md bg-gray-50 dark:bg-gray-700">
                {pages.map((originalIndex, index) => (
                  <div key={originalIndex} className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-md shadow-sm">
                    <span className="font-medium text-gray-700 dark:text-gray-200">페이지 {originalIndex + 1}</span>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => movePageUp(index)}
                        disabled={index === 0}
                        className="p-1 rounded-full bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-500 disabled:opacity-50"
                        title="위로 이동"
                      >
                        <ArrowUp className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => movePageDown(index)}
                        disabled={index === pages.length - 1}
                        className="p-1 rounded-full bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-500 disabled:opacity-50"
                        title="아래로 이동"
                      >
                        <ArrowDown className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => removePage(index)}
                        className="p-1 rounded-full bg-red-100 dark:bg-red-700 text-red-600 dark:text-red-200 hover:bg-red-200 dark:hover:bg-red-600"
                        title="페이지 삭제"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 text-center">
                <button
                  onClick={handleEditAndDownload}
                  disabled={isLoading || pages.length === 0}
                  className="w-full rounded-lg bg-blue-600 px-6 py-3 text-lg font-semibold text-white shadow-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? 'PDF 수정 중...' : 'PDF 수정 및 다운로드'}
                </button>
              </div>
            </div>
          )}

          {!isLoading && numPages > 0 && (
            <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-4">
              원본 PDF: 총 {numPages} 페이지
            </p>
          )}
        </div>
      )}
    </div>
  );
}
