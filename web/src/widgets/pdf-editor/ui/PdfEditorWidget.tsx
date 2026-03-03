'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { Upload, UploadCloud } from 'lucide-react';
import { DownloadBtn } from '@/shared/ui/DownloadBtn';
import { useEditorStore } from '@/features/pdf-edit/model/useEditorStore';
import type { PageRepresentation } from '@/features/pdf-edit/model/useEditorStore';
import { useDownloadLimitStore } from '@/shared/model/useDownloadLimitStore';
import { useTransferSidebarStore } from '@/shared/model/useTransferSidebarStore';
import { formatSize } from '@/shared/lib/formatSize';
import { PdfEditorGrid } from './PdfEditorGrid';
import { API_BASE_URL } from '@/shared/api/config';

export default function PdfEditorWidget() {
  const { files, pages, isProcessing, error, addFiles, removePage, movePage, editAndDownload, reset } = useEditorStore();
  const { showSidebar } = useTransferSidebarStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previews, setPreviews] = useState<{ [pageId: string]: string }>({});
  const prevPagesRef = useRef<PageRepresentation[]>([]);
  const { canDownload } = useDownloadLimitStore();

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

  const handleFileSelect = (fileList: FileList | null) => {
    if (fileList?.length) addFiles(Array.from(fileList).filter((f) => f.type === 'application/pdf'));
  };

  const handleEditClick = async () => {
    if (pages.length === 0 || !canDownload()) return;
    const pageCount = pages.length;
    const resultFile = await editAndDownload();
    if (resultFile) {
      showSidebar(resultFile, {
        title: 'PDF 생성 완료',
        lines: [`결과 ${formatSize(resultFile.size)}`, `${pageCount}페이지`],
      });
    }
  };

  const hasPages = pages.length > 0;

  /* 최초 화면: 병합기 스타일 업로드 UI */
  if (!hasPages) {
    return (
      <div className="w-full max-w-2xl mx-auto rounded-lg bg-white p-4 md:p-8 shadow-md dark:bg-gray-800">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-800 dark:text-white">PDF 분리</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">PDF 파일을 드래그하거나 클릭해서 업로드하세요.</p>
        </div>
        <div
          className="mt-8 flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 p-12 text-center hover:border-blue-500 dark:border-gray-600 dark:hover:border-blue-400 transition-colors"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            handleFileSelect(e.dataTransfer.files);
          }}
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="mb-2 h-10 w-10 text-gray-500" />
          <span className="font-semibold text-gray-600 dark:text-gray-400">파일 선택</span>
          <p className="text-sm text-gray-500">또는 파일을 여기로 드래그하세요</p>
        </div>
        <input id="file-upload" type="file" className="hidden" onChange={onFileChange} accept=".pdf" ref={fileInputRef} multiple />
        {error && <p className="mt-4 text-center text-red-500 dark:text-red-400">오류: {error}</p>}
      </div>
    );
  }

  /* 파일 업로드 후: 사이드바 + 중앙 그리드 */
  return (
    <div className="flex w-full min-h-screen">
      <aside className="relative z-50 w-64 shrink-0 flex flex-col border-r border-gray-200 bg-white dark:bg-gray-800 dark:border-gray-700 shadow-sm">
        <div className="p-4 border-b border-gray-100 dark:border-gray-700">
          <h1 className="text-lg font-bold text-gray-800 dark:text-white">PDF 분리</h1>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">페이지 추출·재정렬·삭제</p>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg text-sm">{error}</div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">파일 / 페이지</label>
            <p className="text-xs text-gray-700 dark:text-gray-300">{files.length}개 파일, {pages.length}페이지</p>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="mt-2 flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              <UploadCloud className="h-4 w-4" />
              파일 추가
            </button>
          </div>

          <DownloadBtn
            text={isProcessing ? 'PDF 생성 중...' : 'PDF 생성하기'}
            isLoading={isProcessing}
            disabled={isProcessing || pages.length === 0 || !canDownload()}
            onClick={handleEditClick}
            className="w-full"
          />
        </div>
      </aside>

      <main className="flex-1 min-h-0 p-6 overflow-auto bg-gray-50 dark:bg-gray-900/50">
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">페이지를 드래그하여 순서를 바꾸거나, × 버튼으로 삭제할 수 있습니다.</p>
        <PdfEditorGrid
          pages={pages}
          previews={previews}
          removePage={removePage}
          movePage={movePage}
          onAddFileClick={() => fileInputRef.current?.click()}
          onPreviewLoad={handlePreviewLoad}
        />
      </main>
    </div>
  );
}
