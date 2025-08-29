'use client';

import { useState } from 'react';
import { UploadCloud, File as FileIcon, Download } from 'lucide-react';

export function PdfCompressorWidget() {
  const [file, setFile] = useState<File | null>(null);
  const [isCompressing, setIsCompressing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [quality, setQuality] = useState<number>(0.7); // Default quality

  const [compressionResult, setCompressionResult] = useState<{ originalSize: number, compressedSize: number, reduction: string } | null>(null);

  function onFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const { files } = event.target;
    if (files && files[0]) {
      setFile(files[0]);
      setError(null);
      setCompressionResult(null);
    }
  }

  async function handleCompress() {
    if (!file) return;

    setIsCompressing(true);
    setError(null);
    setCompressionResult(null);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('quality', quality.toString());

    try {
      const response = await fetch('/api/pdf-compress', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'PDF 압축에 실패했습니다.');
      }

      const blob = await response.blob();
      const originalSize = file.size;
      const compressedSize = blob.size;
      const reduction = (((originalSize - compressedSize) / originalSize) * 100).toFixed(2);

      setCompressionResult({ originalSize, compressedSize, reduction });

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `compressed-${file.name}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

    } catch (e: unknown) {
      if (e instanceof Error) {
        setError('PDF를 압축하는 중 오류가 발생했습니다: ' + e.message);
      } else {
        setError('알 수 없는 오류가 발생했습니다.');
      }
      console.error(e);
    } finally {
      setIsCompressing(false);
    }
  }

  return (
    <div className="w-full max-w-4xl rounded-lg bg-white p-8 shadow-md dark:bg-gray-800">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-white">PDF 압축</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          PDF 파일의 이미지 품질을 낮춰 파일 크기를 줄입니다.
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
            <label htmlFor="quality" className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">압축 품질</label>
            <input
              id="quality"
              type="range"
              min="0.1"
              max="1"
              step="0.1"
              value={quality}
              onChange={(e) => setQuality(parseFloat(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
            />
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">낮음 (파일 크기 작음) &lt;--&gt; 높음 (원본 품질)</div>
          </div>

          <button
            onClick={handleCompress}
            disabled={isCompressing}
            className="w-full inline-flex justify-center items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-yellow-600 hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 disabled:bg-gray-400"
          >
            {isCompressing ? '압축 중...' : '압축 및 다운로드'}
            <Download className="ml-3 -mr-1 h-5 w-5" />
          </button>

          {compressionResult && (
            <div className="mt-6 text-lg space-y-2">
              <p>원본 크기: <span className="font-mono">{(compressionResult.originalSize / 1024 / 1024).toFixed(2)} MB</span></p>
              <p>압축된 크기: <span className="font-mono">{(compressionResult.compressedSize / 1024 / 1024).toFixed(2)} MB</span></p>
              <p className="font-bold text-green-600">
                감소량: {compressionResult.reduction}%
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
