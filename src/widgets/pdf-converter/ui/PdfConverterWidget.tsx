'use client';

import { useState } from 'react';
import { UploadCloud, File as FileIcon, Download, Image as ImageIcon } from 'lucide-react';

export function PdfConverterWidget() {
  const [file, setFile] = useState<File | null>(null);
  const [isConverting, setIsConverting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [targetFormat, setTargetFormat] = useState<'png' | 'jpeg'>('png');

  function onFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const { files } = event.target;
    if (files && files[0]) {
      setFile(files[0]);
      setError(null);
    }
  }

  async function handleConvert() {
    if (!file) return;

    setIsConverting(true);
    setError(null);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('targetFormat', targetFormat);

    try {
      const response = await fetch('/api/pdf-convert', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'PDF 변환에 실패했습니다.');
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `converted-${file.name.replace('.pdf', '')}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

    } catch (e: unknown) {
      if (e instanceof Error) {
        setError('PDF를 변환하는 중 오류가 발생했습니다: ' + e.message);
      } else {
        setError('알 수 없는 오류가 발생했습니다.');
      }
      console.error(e);
    } finally {
      setIsConverting(false);
    }
  }

  return (
    <div className="w-full max-w-4xl rounded-lg bg-white p-8 shadow-md dark:bg-gray-800">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-white">PDF 변환</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          PDF 파일의 각 페이지를 이미지(PNG, JPG) 파일로 변환합니다.
        </p>
      </div>

      {!file && (
        <label htmlFor="file-upload" className="flex flex-col items-center justify-center w-full h-64 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 dark:hover:bg-bray-800 dark:bg-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:hover:border-gray-500 dark:hover:bg-gray-600">
          <div className="flex flex-col items-center justify-center pt-5 pb-6">
            <UploadCloud className="w-10 h-10 mb-3 text-gray-400" />
            <p className="mb-2 text-sm text-gray-500 dark:text-gray-400"><span className="font-semibold">클릭하여 업로드</span> 또는 드래그 앤 드롭</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">PDF 파일</p>
          </div>
          <input id="file-upload" type="file" className="hidden" onChange={onFileChange} accept=".pdf" />
        </label>
      )}

      {error && (
        <div className="mt-4 p-4 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 rounded-lg text-center">
          <p>{error}</p>
        </div>
      )}

      {file && (
        <div className="text-center">
          <div className="flex justify-between items-center mb-4 p-3 rounded-md bg-gray-100 dark:bg-gray-700">
            <div className="flex items-center min-w-0">
              <FileIcon className="mr-2 h-5 w-5 flex-shrink-0 text-blue-500" />
              <span className="truncate text-sm font-medium text-gray-800 dark:text-gray-200">
                {file.name}
              </span>
            </div>
            <button onClick={() => setFile(null)} className="text-sm text-blue-600 hover:underline flex-shrink-0 ml-2">
              파일 변경
            </button>
          </div>

          <div className="my-6">
            <label className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">변환할 포맷 선택</label>
            <div className="flex justify-center space-x-4">
              <button onClick={() => setTargetFormat('png')}
              className={`px-4 py-2 rounded-lg ${targetFormat === 'png' ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-600 text-gray-900 dark:text-white'}`}>
                PNG로 변환
              </button>
              <button onClick={() => setTargetFormat('jpeg')}
              className={`px-4 py-2 rounded-lg ${targetFormat === 'jpeg' ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-600 text-gray-900 dark:text-white'}`}>
                JPG로 변환
              </button>
            </div>
          </div>

          <button
            onClick={handleConvert}
            disabled={isConverting}
            className="w-full inline-flex justify-center items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:bg-gray-400"
          >
            {isConverting ? '변환 중...' : `${targetFormat.toUpperCase()}로 변환 및 다운로드`}
            <ImageIcon className="ml-3 -mr-1 h-5 w-5" />
          </button>
        </div>
      )}
    </div>
  );
}
