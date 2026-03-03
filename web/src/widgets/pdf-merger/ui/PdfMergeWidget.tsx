'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { Upload, UploadCloud, File as FileIcon } from 'lucide-react';
import { PdfMergeGrid } from './PdfMergeGrid';
import { DownloadBtn } from '@/shared/ui/DownloadBtn';
import { useMergeStore } from '@/features/pdf-merge/model/useMergeStore';
import type { MergedFile } from '@/features/pdf-merge/model/useMergeStore';
import { useDownloadLimitStore } from '@/shared/model/useDownloadLimitStore';
import { useTransferSidebarStore } from '@/shared/model/useTransferSidebarStore';
import { formatSize } from '@/shared/lib/formatSize';
import { API_BASE_URL } from '@/shared/api/config';

const PLACEHOLDER_PREVIEW = 'data:image/svg+xml,' + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="320" height="400" viewBox="0 0 320 400"><rect fill="#e5e7eb" width="320" height="400"/><text x="160" y="200" text-anchor="middle" fill="#9ca3af" font-size="14">미리보기 준비 중</text></svg>'
);

export default function PdfMergeWidget() {
  const { files, pageCounts, setPageCount, addFiles, removeFile, mergeAndDownload, reset, isMerging, error } = useMergeStore();
  const { showSidebar } = useTransferSidebarStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previews, setPreviews] = useState<{ [id: string]: string }>({});
  const prevFilesRef = useRef<MergedFile[]>([]);

  const { canDownload } = useDownloadLimitStore();

  const handlePreviewLoad = useCallback((_id: string) => {}, []);

  const fetchPreviewAndPageCount = useCallback(
    async (mf: MergedFile) => {
      const formData = new FormData();
      formData.append('file', mf.file);
      formData.append('firstPage', '1');
      formData.append('lastPage', '1');

      try {
        const res = await fetch(`${API_BASE_URL}/api/pdf-preview`, { method: 'POST', body: formData });
        if (!res.ok) {
          setPreviews((prev) => ({ ...prev, [mf.id]: PLACEHOLDER_PREVIEW }));
          setPageCount(mf.id, 1);
          return;
        }
        const data = await res.json();
        if (data.previews?.[0]) {
          setPreviews((prev) => ({ ...prev, [mf.id]: data.previews[0] }));
        } else {
          setPreviews((prev) => ({ ...prev, [mf.id]: PLACEHOLDER_PREVIEW }));
        }
        setPageCount(mf.id, data.totalPages ?? 1);
      } catch {
        setPreviews((prev) => ({ ...prev, [mf.id]: PLACEHOLDER_PREVIEW }));
        setPageCount(mf.id, 1);
      }
    },
    [setPageCount]
  );

  useEffect(() => {
    const newMergedFiles = files.filter((mf) => !prevFilesRef.current.some((pf) => pf.id === mf.id));
    newMergedFiles.forEach(fetchPreviewAndPageCount);
    prevFilesRef.current = files;
  }, [files, fetchPreviewAndPageCount]);

  const handleFileSelect = useCallback(
    (fileList: FileList | null) => {
      if (!fileList) return;
      const newFiles = Array.from(fileList).filter((f) => f.type === 'application/pdf');
      if (newFiles.length > 0) addFiles(newFiles);
    },
    [addFiles]
  );

  useEffect(() => {
    useDownloadLimitStore.getState().resetIfNeeded();
  }, []);

  useEffect(() => {
    const transferredFile = useTransferSidebarStore.getState().getAndClearTransferFile();
    if (transferredFile?.type === 'application/pdf') {
      const dt = new DataTransfer();
      dt.items.add(transferredFile);
      handleFileSelect(dt.files);
    } else if (useMergeStore.getState().files.length === 0) {
      reset();
    }
  }, []);

  const handleMergeClick = async () => {
    if (files.length < 2 || !canDownload()) return;
    const fileCount = files.length;
    const resultFile = await mergeAndDownload(
      files.length > 0 ? `merged-${files[0].file.name.replace(/\.pdf$/i, '')}.pdf` : 'merged.pdf'
    );
    if (resultFile) {
      showSidebar(resultFile, {
        title: '병합 완료',
        lines: [`결과 ${formatSize(resultFile.size)}`, `${fileCount}개 파일 병합`],
      });
    }
  };

  const hasFiles = files.length > 0;

  /* 최초 화면: 병합기 스타일 업로드 UI */
  if (!hasFiles) {
    return (
      <div className="w-full max-w-2xl mx-auto rounded-lg bg-white p-4 md:p-8 shadow-md dark:bg-gray-800">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-800 dark:text-white">PDF 병합기</h1>
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
        <input
          id="file-upload"
          type="file"
          accept=".pdf"
          multiple
          ref={fileInputRef}
          className="hidden"
          onChange={(e) => handleFileSelect(e.target.files)}
        />
        {error && <p className="mt-4 text-center text-red-500 dark:text-red-400">오류: {error}</p>}
      </div>
    );
  }

  /* 파일 업로드 후: 사이드바 + 중앙 그리드 */
  return (
    <div className="flex w-full min-h-screen">
      <aside className="relative z-50 w-64 shrink-0 flex flex-col border-r border-gray-200 bg-white dark:bg-gray-800 dark:border-gray-700 shadow-sm">
        <div className="p-4 border-b border-gray-100 dark:border-gray-700">
          <h1 className="text-lg font-bold text-gray-800 dark:text-white">PDF 병합기</h1>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">여러 PDF를 하나로</p>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg text-sm">{error}</div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">파일 ({files.length}개)</label>
            <div className="space-y-1.5 max-h-32 overflow-y-auto">
              {files.map((mf) => (
                <div
                  key={mf.id}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-700"
                >
                  <FileIcon className="h-3.5 w-3.5 flex-shrink-0 text-blue-500" />
                  <span className="text-xs truncate text-gray-700 dark:text-gray-200" title={mf.file.name}>{mf.file.name}</span>
                  <button
                    onClick={() => removeFile(mf.id)}
                    className="ml-auto p-0.5 text-red-500 hover:text-red-600 rounded"
                    title="제거"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="mt-2 flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              <UploadCloud className="h-4 w-4" />
              파일 추가
            </button>
          </div>

          <DownloadBtn
            text={isMerging ? '병합 중...' : 'PDF 병합하기'}
            isLoading={isMerging}
            disabled={files.length < 2 || isMerging || !canDownload()}
            onClick={handleMergeClick}
            className="w-full"
          />
          {files.length === 1 && (
            <p className="text-xs text-amber-600 dark:text-amber-400">2개 이상의 파일이 필요합니다.</p>
          )}
        </div>
      </aside>

      <main className="flex-1 min-h-0 p-6 overflow-auto bg-gray-50 dark:bg-gray-900/50">
        <input
          id="file-upload"
          type="file"
          accept=".pdf"
          multiple
          ref={fileInputRef}
          className="hidden"
          onChange={(e) => handleFileSelect(e.target.files)}
        />
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">업로드된 PDF 미리보기. × 버튼으로 제거할 수 있습니다.</p>
        <PdfMergeGrid
          files={files}
          previews={previews}
          pageCounts={pageCounts}
          handleRemoveFile={removeFile}
          onAddFileClick={() => fileInputRef.current?.click()}
          onPreviewLoad={handlePreviewLoad}
        />
      </main>
    </div>
  );
}
