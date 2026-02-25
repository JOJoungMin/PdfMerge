'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { UploadCloud } from 'lucide-react';
import { DownloadBtn } from '@/shared/ui/DownloadBtn';
import { useEditorStore } from '@/features/pdf-edit/model/useEditorStore';
import type { PageRepresentation } from '@/features/pdf-edit/model/useEditorStore';
import { useDownloadLimitStore } from '@/shared/model/useDownloadLimitStore';
import { useTransferSidebarStore } from '@/shared/model/useTransferSidebarStore';
import { PdfEditorGrid } from './PdfEditorGrid';
import { API_BASE_URL } from '@/shared/api/config';

export default function PdfEditorWidget() {
  const { files, pages, isProcessing, error, addFiles, removePage, movePage, editAndDownload, reset } = useEditorStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previews, setPreviews] = useState<{ [pageId: string]: string }>({});
  const prevPagesRef = useRef<PageRepresentation[]>([]);
  const { canDownload, remaining, increment } = useDownloadLimitStore();

  useEffect(() => useDownloadLimitStore.getState().resetIfNeeded(), []);

  const handlePreviewLoad = useCallback((_pageId: string) => {}, []);

  useEffect(() => {
    const transferred = useTransferSidebarStore.getState().getAndClearTransferFile();
    const { files: storeFiles, pages: storePages } = useEditorStore.getState();
    if (transferred?.type === 'application/pdf') {
      addFiles([transferred]);
    } else if (storeFiles.length === 0 && storePages.length === 0) {
      reset();
    }
  }, []);

  useEffect(() => {
    const newPages = pages.filter((p) => !prevPagesRef.current.some((pp) => pp.id === p.id));
    if (newPages.length === 0) {
      prevPagesRef.current = pages;
      return;
    }

    const newFileIds = new Set(newPages.map((p) => p.fileId));
    const filesForNewPages = files.filter((f) => newFileIds.has(f.id));

    const fetchPreviews = async () => {
      for (const file of filesForNewPages) {
        try {
          const formData = new FormData();
          formData.append('file', file.file);
          const res = await fetch(`${API_BASE_URL}/api/pdf-preview`, { method: 'POST', body: formData });
          if (!res.ok) return;

          const data = await res.json();
          if (data.previews) {
            const pagesOfFile = pages.filter((p) => p.fileId === file.id);
            const newPreviews: { [pageId: string]: string } = {};
            pagesOfFile.forEach((page, idx) => {
              if (data.previews[idx]) newPreviews[page.id] = data.previews[idx];
            });
            setPreviews((prev) => ({ ...prev, ...newPreviews }));
          }
        } catch {}
      }
    };

    fetchPreviews();
    prevPagesRef.current = pages;
  }, [pages, files]);

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newFiles = e.target.files;
    if (newFiles) addFiles(Array.from(newFiles));
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleEditClick = async () => {
    if (pages.length === 0 || !canDownload()) return;
    const success = await editAndDownload();
    if (success) increment();
  };

  const remainingCount = remaining();

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

      <input id="file-upload" type="file" className="hidden" onChange={onFileChange} accept=".pdf" ref={fileInputRef} multiple />

      {error && (
        <div className="mt-4 p-4 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 rounded-lg text-center"><p>{error}</p></div>
      )}

      {pages.length > 0 && (
        <>
          <div className="mt-6 text-center">
            <DownloadBtn
              text={isProcessing ? 'PDF 생성 중...' : `PDF 생성 및 다운로드 (${remainingCount}회 남음)`}
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
