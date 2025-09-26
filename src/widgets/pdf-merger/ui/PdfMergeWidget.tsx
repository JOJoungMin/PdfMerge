'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { Upload } from 'lucide-react';
import { PdfMergeGrid } from './PdfMergeGrid';
import { DownloadBtn } from '@/shared/ui/DownloadBtn';
import { useMergeStore } from '@/features/pdf-merge/model/useMergeStore';
import type { MergedFile } from '@/features/pdf-merge/model/useMergeStore';
import { useSession } from 'next-auth/react';
import { useDownloadLimitStore } from '@/shared/model/useDownloadLimitStore';
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

export default function PdfMergeWidget() {
  const { files, pageCounts, setPageCount, addFiles, removeFile, mergeAndDownload, reset, isMerging, error } = useMergeStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previews, setPreviews] = useState<{ [id: string]: string }>({});
  const consumed = useRef(false);
  const prevFilesRef = useRef<MergedFile[]>([]);

  const { data: session, update } = useSession();
  const { canDownload, remaining, syncWithUser, increment: incrementDownloadCount, isSyncedWithUser, limit } = useDownloadLimitStore();

  const pathname = usePathname();
  const batchTrackingRef = useRef<{
    startTime: number;
    pendingFiles: Set<string>;
    totalFiles: number;
    totalSize: number;
  } | null>(null);

  const handlePreviewLoad = useCallback((id: string) => {
    const batch = batchTrackingRef.current;
    if (!batch || !batch.pendingFiles.has(id)) {
      return;
    }

    batch.pendingFiles.delete(id);

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

  const fetchPreviewAndPageCount = useCallback(async (mf: MergedFile) => {
    const formData = new FormData();
    formData.append('file', mf.file);
    formData.append('firstPage', '1');
    formData.append('lastPage', '1');

    const res = await fetch('/api/pdf-preview', { method: 'POST', body: formData });
    if (!res.ok) {
      handlePreviewLoad(mf.id);
      return;
    }

    const data = await res.json();
    if (data.previews && data.previews.length > 0) {
      setPreviews(prev => ({ ...prev, [mf.id]: data.previews[0] }));
    }
    if (data.totalPages) {
      setPageCount(mf.id, data.totalPages);
    }
  }, [setPageCount, handlePreviewLoad]);

  useEffect(() => {
    const newMergedFiles = files.filter(mf => !prevFilesRef.current.some(pf => pf.id === mf.id));

    if (newMergedFiles.length > 0) {
      const newFileIds = new Set(newMergedFiles.map(mf => mf.id));
      const newFilesTotalSize = newMergedFiles.reduce((acc, mf) => acc + mf.file.size, 0);

      if (batchTrackingRef.current) {
        newFileIds.forEach(id => batchTrackingRef.current?.pendingFiles.add(id));
        batchTrackingRef.current.totalFiles += newMergedFiles.length;
        batchTrackingRef.current.totalSize += newFilesTotalSize;
      } else {
        batchTrackingRef.current = {
          startTime: performance.now(),
          pendingFiles: newFileIds,
          totalFiles: newMergedFiles.length,
          totalSize: newFilesTotalSize,
        };
      }

      newMergedFiles.forEach(fetchPreviewAndPageCount);
    }

    prevFilesRef.current = files;
  }, [files, fetchPreviewAndPageCount]);

  const handleFileSelect = useCallback((fileList: FileList | null) => {
    if (!fileList) return;
    const newFiles = Array.from(fileList).filter(f => f.type === 'application/pdf');
    if (newFiles.length === 0) return;
    addFiles(newFiles);
  }, [addFiles]);

  useEffect(() => {
    syncWithUser(session?.user ?? null);
  }, [session, syncWithUser]);

  useEffect(() => {
    // 컴포넌트가 언마운트될 때 스토어를 리셋합니다.
    return () => {
      reset();
    }
  }, [reset]);

  useEffect(() => {
    if (consumed.current) return;
    const transferredFile = tempFileStore.getFile();
    if (transferredFile) {
      consumed.current = true;
      handleFileSelect(new DataTransfer().files);
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(transferredFile);
      handleFileSelect(dataTransfer.files);
    }
  }, [handleFileSelect]);

  const handleMergeClick = async () => {
    if (files.length < 2 || !canDownload()) return;
    const success = await mergeAndDownload(files.length > 0 ? `merged-${files[0].file.name.replace('.pdf', '')}.pdf` : 'merged.pdf');
    if (success) {
      incrementDownloadCount();
      await update();
    }
  };

  const getButtonText = () => {
    if (isMerging) return '병합 중...';
    const remainingCount = remaining();
    return `PDF 병합하기 (${isSyncedWithUser ? `${remainingCount}/${limit}` : remainingCount}회 남음)`;
  };

  return (
    <div className="w-full rounded-lg bg-white p-4 md:p-8 shadow-md dark:bg-gray-800 flex flex-col h-[90vh]">
      <div>
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-800 dark:text-white">PDF 병합기</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">PDF 파일을 드래그하거나 클릭해서 업로드하세요.</p>
        </div>
        {files.length === 0 && (
          <div
            className="mt-8 flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 p-12 text-center hover:border-blue-500 dark:border-gray-600 dark:hover:border-blue-400"
            onDragOver={e => e.preventDefault()}
            onDrop={e => { e.preventDefault(); handleFileSelect(e.dataTransfer.files); }}
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="mb-2 h-10 w-10 text-gray-500" />
            <span className="font-semibold text-gray-600">파일 선택</span>
            <p className="text-sm text-gray-500">또는 파일을 여기로 드래그하세요</p>
          </div>
        )}
        <input
          type="file"
          accept=".pdf"
          multiple
          ref={fileInputRef}
          className="hidden"
          onChange={e => handleFileSelect(e.target.files)}
        />
        {error && <p className="mt-4 text-center text-red-500">오류: {error}</p>}
        <div className="mt-4 text-center">
          <DownloadBtn
            text={getButtonText()}
            isLoading={isMerging}
            disabled={files.length < 2 || isMerging || !canDownload()}
            onClick={handleMergeClick}
          />
        </div>
      </div>
      <div className="flex-1 mt-6 overflow-y-auto">
        {files.length > 0 && (
          <PdfMergeGrid
            files={files}
            previews={previews}
            pageCounts={pageCounts}
            handleRemoveFile={removeFile}
            onAddFileClick={() => fileInputRef.current?.click()}
            onPreviewLoad={handlePreviewLoad}
          />
        )}
      </div>
    </div>
  );
}
