'use client'

import { useRef, useEffect, useState, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { UploadCloud } from 'lucide-react';
import { DownloadBtn } from '@/shared/ui/DownloadBtn';
import { useEditorStore } from '@/features/pdf-edit/model/useEditorStore';
import type { PageRepresentation } from '@/features/pdf-edit/model/useEditorStore';
import { useSession } from 'next-auth/react';
import { useDownloadLimitStore } from '@/shared/model/useDownloadLimitStore';
import { tempFileStore } from '@/shared/lib/temp-file-store';
import { PdfEditorGrid } from './PdfEditorGrid';

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

export default function PdfEditorWidget() {
  const {
    files,
    pages,
    isProcessing,
    error,
    addFiles,
    removePage,
    movePage,
    editAndDownload,
  } = useEditorStore();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const consumed = useRef(false);
  const [previews, setPreviews] = useState<{ [pageId: string]: string }>({});
  const [isClient, setIsClient] = useState(false);

  const { data: session, update } = useSession();
  const { canDownload, remaining, syncWithUser, increment: incrementDownloadCount, isSyncedWithUser, limit } = useDownloadLimitStore();

  const pathname = usePathname();
  const batchTrackingRef = useRef<{
    startTime: number;
    pendingFiles: Set<string>; // Set of page IDs
    totalFiles: number;
    totalSize: number;
  } | null>(null);
  const prevPagesRef = useRef<PageRepresentation[]>([]);

  useEffect(() => { setIsClient(true); }, []);
  useEffect(() => { syncWithUser(session?.user ?? null); }, [session, syncWithUser]);

  const handlePreviewLoad = useCallback((pageId: string) => {
    const batch = batchTrackingRef.current;
    if (!batch || !batch.pendingFiles.has(pageId)) {
      return;
    }
    batch.pendingFiles.delete(pageId);

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

  useEffect(() => {
    if (consumed.current) return;
    const transferredFile = tempFileStore.getFile();
    if (transferredFile) {
      consumed.current = true;
      addFiles([transferredFile]);
    }
  }, [addFiles]);

  useEffect(() => {
    const newPages = pages.filter(p => !prevPagesRef.current.some(pp => pp.id === p.id));
    if (newPages.length === 0) {
      prevPagesRef.current = pages;
      return;
    }

    const newFileIds = new Set(newPages.map(p => p.fileId));
    const filesForNewPages = files.filter(f => newFileIds.has(f.id));

    const batchTotalSize = filesForNewPages.reduce((acc, f) => acc + f.file.size, 0);
    const batchPageIds = new Set(newPages.map(p => p.id));

    batchTrackingRef.current = {
      startTime: performance.now(),
      pendingFiles: batchPageIds,
      totalFiles: filesForNewPages.length,
      totalSize: batchTotalSize,
    };

    const fetchPreviewsForNewFiles = async () => {
      for (const file of filesForNewPages) {
        try {
          const formData = new FormData();
          formData.append('file', file.file);
          const res = await fetch('/api/pdf-preview', { method: 'POST', body: formData });
          if (!res.ok) throw new Error(`Preview fetch failed for ${file.file.name}`);
          
          const data = await res.json();

          if (data.previews) {
            const pagesOfThisFile = pages.filter(p => p.fileId === file.id);
            const newPreviews: { [pageId: string]: string } = {};
            pagesOfThisFile.forEach((page, index) => {
              if (data.previews[index]) {
                newPreviews[page.id] = data.previews[index];
              } else {
                handlePreviewLoad(page.id);
              }
            });
            setPreviews(prev => ({ ...prev, ...newPreviews }));
          } else {
             pages.filter(p => p.fileId === file.id).forEach(p => handlePreviewLoad(p.id));
          }
        } catch (e) {
          console.error('Preview fetch failed for file', file.file.name, e);
           pages.filter(p => p.fileId === file.id).forEach(p => handlePreviewLoad(p.id));
        }
      }
    };

    fetchPreviewsForNewFiles();
    prevPagesRef.current = pages;
  }, [pages, files, handlePreviewLoad]);

  const onFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newFiles = event.target.files;
    if (newFiles) {
      addFiles(Array.from(newFiles));
    }
    if(fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleEditClick = async () => {
    if (pages.length === 0 || !canDownload()) return;
    const success = await editAndDownload();
    if (success) {
      incrementDownloadCount();
      await update();
    }
  };

  const getButtonText = () => {
    if (isProcessing) return 'PDF 생성 중...';
    if (!isClient) return 'PDF 생성 및 다운로드';
    const remainingCount = remaining();
    return `PDF 생성 및 다운로드 (${isSyncedWithUser ? `${remainingCount}/${limit}` : remainingCount}회 남음)`;
  };

  return (
    <div className="w-full max-w-6xl rounded-lg bg-white p-8 shadow-md dark:bg-gray-800">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-white">PDF 편집기</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">여러 PDF를 올리고, 페이지를 재정렬하거나 삭제하여 새로운 PDF를 만드세요.</p>
      </div>

      {pages.length === 0 && (
        <label
          htmlFor="file-upload"
          className="flex flex-col items-center justify-center w-full h-64 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 dark:border-gray-600 dark:bg-gray-700 dark:hover:bg-gray-600"
        >
          <div className="flex flex-col items-center justify-center pt-5 pb-6">
            <UploadCloud className="w-10 h-10 mb-3 text-gray-400" />
            <p className="mb-2 text-sm text-gray-500 dark:text-gray-400"><span className="font-semibold">클릭하여 업로드</span> 또는 드래그 앤 드롭</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">PDF 파일 (여러 개 선택 가능)</p>
          </div>
        </label>
      )}
      <input
        id="file-upload"
        type="file"
        className="hidden"
        onChange={onFileChange}
        accept=".pdf"
        ref={fileInputRef}
        multiple
      />
      {error && <div className="mt-4 p-4 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 rounded-lg text-center"><p>{error}</p></div>}

      {pages.length > 0 && (
        <>
          <div className="mt-6 text-center">
            <DownloadBtn
              text={getButtonText()}
              isLoading={isProcessing}
              disabled={isProcessing || pages.length === 0 || !canDownload()}
              onClick={handleEditClick}
            />
          </div>
          <PdfEditorGrid
            pages={pages}
            previews={previews}
            removePage={removePage}
            movePage={movePage}
            onAddFileClick={() => fileInputRef.current?.click()}
            onPreviewLoad={handlePreviewLoad}
          />
        </>
      )}
    </div>
  );
}