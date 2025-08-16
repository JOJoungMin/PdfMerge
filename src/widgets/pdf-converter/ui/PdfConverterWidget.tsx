'use client';

import { useState } from 'react';
import { UploadCloud, File as FileIcon, Download, Image as ImageIcon, FileArchive } from 'lucide-react';
import * as pdfjs from 'pdfjs-dist/build/pdf.mjs';
//import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';
import JSZip from 'jszip';

if (typeof window !== 'undefined') {
  pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';
}

type ConvertedImage = {
  fileName: string;
  dataUrl: string;
};

export function PdfConverterWidget() {
  const [file, setFile] = useState<File | null>(null);
  const [isConverting, setIsConverting] = useState<boolean>(false);
  const [isZipping, setIsZipping] = useState<boolean>(false);
  const [convertedImages, setConvertedImages] = useState<ConvertedImage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [targetFormat, setTargetFormat] = useState<'png' | 'jpeg'>('png');

  function onFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const { files } = event.target;
    if (files && files[0]) {
      setFile(files[0]);
      setConvertedImages([]);
      setError(null);
    }
  }

  async function handleConvert() {
    if (!file) return;

    setIsConverting(true);
    setError(null);
    setConvertedImages([]);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjs.getDocument(arrayBuffer).promise;
      const images: ConvertedImage[] = [];

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 2.0 }); // Higher scale for better quality

        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const context = canvas.getContext('2d');
        if (!context) throw new Error('Canvas 2D context not available.');

        await page.render({ canvasContext: context, viewport }).promise;

        const dataUrl = canvas.toDataURL(`image/${targetFormat}`);
        images.push({
          fileName: `${file.name.replace(/\.pdf$/i, '')}_page_${i}.${targetFormat}`,
          dataUrl: dataUrl,
        });
      }

      setConvertedImages(images);

    } catch (e: any) {
      setError('PDF를 변환하는 중 오류가 발생했습니다: ' + e.message);
      console.error(e);
    } finally {
      setIsConverting(false);
    }
  }

  async function handleDownloadZip() {
    if (convertedImages.length === 0) return;

    setIsZipping(true);
    try {
      const zip = new JSZip();
      for (const image of convertedImages) {
        // data:image/png;base64,iVBORw0KGgoAAAANSUhEUg... -> iVBORw0KGgoAAAANSUhEUg...
        const base64Data = image.dataUrl.split(',')[1];
        zip.file(image.fileName, base64Data, { base64: true });
      }

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const zipFileName = `${file?.name.replace(/\.pdf$/i, '')}_images.zip`;

      const link = document.createElement('a');
      link.href = URL.createObjectURL(zipBlob);
      link.download = zipFileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);

    } catch (e: any) {
      setError('ZIP 파일 생성 중 오류가 발생했습니다: ' + e.message);
      console.error(e);
    } finally {
      setIsZipping(false);
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
            <div className="flex items-center">
              <FileIcon className="mr-2 h-5 w-5 flex-shrink-0 text-blue-500" />
              <span className="truncate text-sm font-medium text-gray-800 dark:text-gray-200">
                {file.name}
              </span>
            </div>
            <button onClick={() => setFile(null)} className="text-sm text-blue-600 hover:underline">
              파일 변경
            </button>
          </div>

          <div className="my-6">
            <label className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">변환할 포맷 선택</label>
            <div className="flex justify-center space-x-4">
              <button onClick={() => setTargetFormat('png')} 
              className={`px-4 py-2 rounded-lg ${
                targetFormat === 'png'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 dark:bg-gray-600 text-gray-900 dark:text-white'
              }`}>PNG로 변환</button>
              <button onClick={() => setTargetFormat('jpeg')} 
              className={`px-4 py-2 rounded-lg ${
                targetFormat === 'jpeg'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 dark:bg-gray-600 text-gray-900 dark:text-white'
              }`}>JPG로 변환</button>
              <button className="px-4 py-2 rounded-lg bg-yellow-300 text-black">
  어딨어
</button>
            </div>
          </div>

          <button
            onClick={handleConvert}
            disabled={isConverting || isZipping}
            className="w-full inline-flex justify-center items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:bg-gray-400"
          >
            {isConverting
              ? '변환 중...'
              : `${targetFormat.toUpperCase()}로 변환하기`}
            <ImageIcon className="ml-3 -mr-1 h-5 w-5" />
          </button>

          {convertedImages.length > 0 && (
            <div className="mt-8">
              <h3 className="text-xl font-semibold mb-4">변환 결과</h3>
              <button
                onClick={handleDownloadZip}
                disabled={isZipping || isConverting}
                className="w-full mb-4 inline-flex justify-center items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:bg-gray-400"
              >
                {isZipping ? 'ZIP 파일 생성 중...' : '모두 ZIP으로 다운로드'}
                <FileArchive className="ml-3 -mr-1 h-5 w-5" />
              </button>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-h-96 overflow-y-auto p-4 bg-gray-100 dark:bg-gray-900 rounded-lg">
                {convertedImages.map((image, index) => (
                  <a key={index} href={image.dataUrl} download={image.fileName} className="block p-2 bg-white dark:bg-gray-700 rounded-lg shadow hover:shadow-lg transition-shadow">
                    <img src={image.dataUrl} alt={image.fileName} className="w-full h-auto rounded" />
                    <p className="text-xs mt-2 truncate">{image.fileName}</p>
                    <Download className="w-4 h-4 mx-auto mt-1" />
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
