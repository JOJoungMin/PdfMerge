'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { UploadCloud, File as FileIcon } from 'lucide-react';
import { DownloadBtn } from '@/shared/ui/DownloadBtn';
import { useCompressStore } from '@/features/pdf-compress/model/useCompressStore';
import { useDownloadLimitStore } from '@/shared/model/useDownloadLimitStore';
import { useTransferSidebarStore } from '@/shared/model/useTransferSidebarStore';
import { downloadBlob } from '@/shared/lib/pdf/downloadBlob';
import { tempFileStore } from '@/shared/lib/temp-file-store';
import { API_BASE_URL } from '@/shared/api/config';

const PLACEHOLDER = 'data:image/svg+xml,' + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="128" height="176" viewBox="0 0 128 176"><rect fill="#e5e7eb" width="128" height="176"/></svg>'
);

export default function PdfCompressorWidget() {
  const { file, isCompressing, error, quality, compressionResult, setFile, setQuality, compressAndGetBlob, reset } = useCompressStore();
  const [previews, setPreviews] = useState<{ [fileName: string]: string[] }>({});
  const consumed = useRef(false);
  const { showSidebar } = useTransferSidebarStore();
  const { canDownload, remaining, increment } = useDownloadLimitStore();

  useEffect(() => useDownloadLimitStore.getState().resetIfNeeded(), []);

  const fetchPreview = useCallback(async (fileToPreview: File) => {
    const formData = new FormData();
    formData.append('file', fileToPreview);
    try {
      const res = await fetch(`${API_BASE_URL}/api/pdf-preview`, { method: 'POST', body: formData });
      if (!res.ok) return;
      const data = await res.json();
      if (data.previews?.length) setPreviews((prev) => ({ ...prev, [fileToPreview.name]: data.previews }));
    } catch {}
  }, []);

  useEffect(() => () => reset(), [reset]);

  const onFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const f = e.target.files?.[0];
      if (f) {
        setFile(f);
        fetchPreview(f);
      }
    },
    [setFile, fetchPreview]
  );

  useEffect(() => {
    if (consumed.current) return;
    const transferred = tempFileStore.getFile();
    if (transferred) {
      consumed.current = true;
      setFile(transferred);
      fetchPreview(transferred);
    }
  }, [setFile, fetchPreview]);

  const handleCompressClick = async () => {
    if (!file || !canDownload()) return;
    const blob = await compressAndGetBlob();
    if (blob) {
      await downloadBlob(blob, `compressed-${file.name}`);
      tempFileStore.setFile(new File([blob], `compressed-${file.name}`, { type: 'application/pdf' }));
      showSidebar();
      increment();
      setFile(null);
    }
  };

  const remainingCount = remaining();

  return (
    <div className="w-full max-w-4xl rounded-lg bg-white p-8 shadow-md dark:bg-gray-800">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-white">PDF 압축</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">PDF 파일의 이미지 품질을 낮춰 파일 크기를 줄입니다.</p>
      </div>

      {!file && (
        <label
          htmlFor="file-upload"
          className="flex flex-col items-center justify-center w-full h-64 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:hover:border-gray-500 dark:hover:bg-gray-600"
        >
          <div className="flex flex-col items-center justify-center pt-5 pb-6">
            <UploadCloud className="w-10 h-10 mb-3 text-gray-400" />
            <p className="mb-2 text-sm text-gray-500 dark:text-gray-400"><span className="font-semibold">클릭하여 업로드</span> 또는 드래그 앤 드롭</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">PDF 파일</p>
          </div>
          <input id="file-upload" type="file" className="hidden" onChange={onFileChange} accept=".pdf" />
        </label>
      )}

      {error && (
        <div className="mt-4 p-4 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 rounded-lg text-center"><p>{error}</p></div>
      )}

      {file && (
        <div className="text-center">
          <div className="flex justify-between items-center mb-4 p-3 rounded-md bg-gray-100 dark:bg-gray-700">
            <div className="flex items-center min-w-0">
              <FileIcon className="mr-2 h-5 w-5 flex-shrink-0 text-blue-500" />
              <span className="truncate text-sm font-medium text-gray-800 dark:text-gray-200">{file.name}</span>
            </div>
            <button onClick={() => setFile(null)} className="text-sm text-blue-600 hover:underline flex-shrink-0 ml-2">파일 변경</button>
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

          {compressionResult && (
            <div className="mt-6 text-lg space-y-2">
              <p>원본 크기: <span className="font-mono">{(compressionResult.originalSize / 1024 / 1024).toFixed(2)} MB</span></p>
              <p>압축된 크기: <span className="font-mono">{(compressionResult.compressedSize / 1024 / 1024).toFixed(2)} MB</span></p>
              <p className="font-bold text-green-600">감소량: {compressionResult.reduction}%</p>
            </div>
          )}
        </div>
      )}

      <div className="mt-8 text-center">
        <DownloadBtn text={`압축 및 다운로드 (${remainingCount}회 남음)`} isLoading={isCompressing} disabled={!file || isCompressing || !canDownload()} onClick={handleCompressClick} />
      </div>

      {file && (previews[file.name]?.length ? (
        <div className="mt-4 flex flex-wrap gap-2 justify-center">
          {previews[file.name].map((src, idx) => (
            <img key={idx} src={src} alt={`Page ${idx + 1}`} className="w-32 h-44 object-cover border rounded" />
          ))}
        </div>
      ) : (
        <div className="mt-4 flex justify-center">
          <img src={PLACEHOLDER} alt="미리보기" className="w-32 h-44 object-cover border rounded" />
        </div>
      ))}
    </div>
  );
}
