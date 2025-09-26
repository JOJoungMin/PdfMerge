'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { UploadCloud, File as FileIcon } from 'lucide-react';
import { DownloadBtn } from '@/shared/ui/DownloadBtn';
import { useCompressStore } from '@/features/pdf-compress/model/useCompressStore';
import { useSession } from 'next-auth/react';
import { useDownloadLimitStore } from '@/shared/model/useDownloadLimitStore';
import { useTransferSidebarStore } from '@/shared/model/useTransferSidebarStore';
import { downloadBlob } from '@/shared/lib/pdf/downloadBlob';
import { tempFileStore } from '@/shared/lib/temp-file-store';

const sendUserExperienceLog = (data: object) => {
  const url = '/api/log/user-experience';
  const body = JSON.stringify(data);
  if (navigator.sendBeacon) {
    navigator.sendBeacon(url, body);
  } else {
    fetch(url, {
      method: 'POST',
      body: body,
      headers: { 'Content-Type': 'application/json' },
      keepalive: true,
    });
  }
};

export default function PdfCompressorWidget() {
  const {
    file,
    isCompressing,
    error,
    quality,
    compressionResult,
    setFile,
    setQuality,
    compressAndGetBlob,
    reset,
  } = useCompressStore();

  const [previews, setPreviews] = useState<{ [fileName: string]: string[] }>({});
  const consumed = useRef(false);
  const pathname = usePathname();
  const batchTrackingRef = useRef<{
    startTime: number;
    pendingFiles: Set<number>; // Set of page indices
    totalFiles: number;
    totalSize: number;
  } | null>(null);

  const handlePreviewLoad = useCallback((pageIndex: number) => {
    const batch = batchTrackingRef.current;
    if (!batch || !batch.pendingFiles.has(pageIndex)) {
      return;
    }

    batch.pendingFiles.delete(pageIndex);

    if (batch.pendingFiles.size === 0) {
      const endTime = performance.now();
      const durationInMs = Math.round(endTime - batch.startTime);

      sendUserExperienceLog({
        metricName: 'preview_batch_generation',
        durationInMs,
        path: pathname,
        fileCount: batch.totalFiles,
        totalFileSizeInBytes: batch.totalSize,
        githubVersion: process.env.NEXT_PUBLIC_GIT_COMMIT_SHA,
      });

      batchTrackingRef.current = null;
    }
  }, [pathname]);

  const fetchPreview = useCallback(async (fileToPreview: File) => {
    batchTrackingRef.current = {
      startTime: performance.now(),
      pendingFiles: new Set(),
      totalFiles: 1,
      totalSize: fileToPreview.size,
    };

    const formData = new FormData();
    formData.append('file', fileToPreview);

    const res = await fetch('/api/pdf-preview', { method: 'POST', body: formData });

    if (!res.ok) {
      console.error('PDF 미리보기 생성 실패');
      batchTrackingRef.current = null; // Reset on error
      return;
    }
    const data = await res.json();

    if (data.previews && data.previews.length > 0) {
      const pageIndices = new Set<number>(data.previews.map((_: any, idx: number) => idx)); 
      if (batchTrackingRef.current) {
        batchTrackingRef.current.pendingFiles = pageIndices;
      }
      setPreviews(prev => ({ ...prev, [fileToPreview.name]: data.previews }));
    } else {
      batchTrackingRef.current = null; // No previews, no tracking
    }
  }, []);

  const { showSidebar } = useTransferSidebarStore();
  const { data: session, update } = useSession();
  const { canDownload, remaining, syncWithUser, increment: incrementDownloadCount, isSyncedWithUser, limit } = useDownloadLimitStore();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => { setIsClient(true); }, []);
  useEffect(() => { syncWithUser(session?.user ?? null); }, [session, syncWithUser]);
  useEffect(() => { if (!session) { useDownloadLimitStore.getState().resetIfNeeded(); } }, [session]);

  useEffect(() => {
    // 컴포넌트가 언마운트될 때 스토어를 리셋합니다.
    return () => {
      reset();
    }
  }, [reset]);

  const onFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const { files } = event.target;
    if (files && files[0]) {
      setFile(files[0]);
      fetchPreview(files[0]);
    }
  }, [setFile, fetchPreview]);

  useEffect(() => {
    if (consumed.current) return;
    const transferredFile = tempFileStore.getFile();
    if (transferredFile) {
      consumed.current = true;
      setFile(transferredFile);
      fetchPreview(transferredFile);
    }
  }, [setFile, fetchPreview]);

  const handleCompressClick = async () => {
    if (!file || !canDownload()) return;
    const blob = await compressAndGetBlob();
    if (blob) {
      const compressedFileName = `compressed-${file.name}`;
      await downloadBlob(blob, compressedFileName);
      const compressedFile = new File([blob], compressedFileName, { type: 'application/pdf' });
      tempFileStore.setFile(compressedFile);
      showSidebar();
      incrementDownloadCount();
      await update();
      setFile(null);
    }
  };

  const getButtonText = () => {
    if (isCompressing) return '압축 중...';
    const baseText = '압축 및 다운로드';
    if (!isClient) return baseText;
    const remainingCount = remaining();
    return `${baseText} (${isSyncedWithUser ? `${remainingCount}/${limit}` : remainingCount}회 남음)`;
  };

  return (
    <div className="w-full max-w-4xl rounded-lg bg-white p-8 shadow-md dark:bg-gray-800">
       <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-white">PDF 압축</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">PDF 파일의 이미지 품질을 낮춰 파일 크기를 줄입니다.</p>
      </div>

      {!file && (
        <label
          htmlFor="file-upload"
          className="flex flex-col items-center justify-center w-full h-64 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 dark:hover:bg-bray-800 dark:bg-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:hover:border-gray-500 dark:hover:bg-gray-600"
        >
          <div className="flex flex-col items-center justify-center pt-5 pb-6">
            <UploadCloud className="w-10 h-10 mb-3 text-gray-400" />
            <p className="mb-2 text-sm text-gray-500 dark:text-gray-400"><span className="font-semibold">클릭하여 업로드</span> 또는 드래그 앤 드롭</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">PDF 파일</p>
          </div>
          <input id="file-upload" type="file" className="hidden" onChange={onFileChange} accept=".pdf" />
        </label>
      )}

      {error && <div className="mt-4 p-4 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 rounded-lg text-center"><p>{error}</p></div>}

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
        <DownloadBtn text={getButtonText()} isLoading={isCompressing} disabled={!file || isCompressing || !canDownload()} onClick={handleCompressClick} />
      </div>

      {file && previews[file.name] && (
        <div className="mt-4 flex flex-wrap gap-2 justify-center">
          {previews[file.name].map((src, idx) => (
            <img
              key={idx}
              src={src}
              alt={`Page ${idx + 1}`}
              className="w-32 h-44 object-cover border rounded"
              onLoad={() => handlePreviewLoad(idx)}
            />
          ))}
        </div>
      )}
    </div>
  );
}