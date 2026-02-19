'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { Upload } from 'lucide-react';
import { PdfMergeGrid } from './PdfMergeGrid';
import { DownloadBtn } from '@/shared/ui/DownloadBtn';
import { useMergeStore } from '@/features/pdf-merge/model/useMergeStore';
import type { MergedFile } from '@/features/pdf-merge/model/useMergeStore';
import { useDownloadLimitStore } from '@/shared/model/useDownloadLimitStore';
import { tempFileStore } from '@/shared/lib/temp-file-store';
import { API_BASE_URL } from '@/shared/api/config';

const PLACEHOLDER_PREVIEW = 'data:image/svg+xml,' + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="320" height="400" viewBox="0 0 320 400"><rect fill="#e5e7eb" width="320" height="400"/><text x="160" y="200" text-anchor="middle" fill="#9ca3af" font-size="14">미리보기 준비 중</text></svg>'
);

export default function PdfMergeWidget() {
  const { files, pageCounts, setPageCount, addFiles, removeFile, mergeAndDownload, reset, isMerging, error } = useMergeStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previews, setPreviews] = useState<{ [id: string]: string }>({});
  const consumed = useRef(false);
  const prevFilesRef = useRef<MergedFile[]>([]);

  const { canDownload, remaining, increment: incrementDownloadCount } = useDownloadLimitStore();

  const handlePreviewLoad = useCallback((_id: string) => {
    // UI 모드: 로깅 비활성화
  }, []);

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

  useEffect(() => () => reset(), [reset]);

  useEffect(() => {
    if (consumed.current) return;
    const transferredFile = tempFileStore.getFile();
    if (transferredFile) {
      consumed.current = true;
      const dt = new DataTransfer();
      dt.items.add(transferredFile);
      handleFileSelect(dt.files);
    }
  }, [handleFileSelect]);

  const handleMergeClick = async () => {
    if (files.length < 2 || !canDownload()) return;
    const success = await mergeAndDownload(
      files.length > 0 ? `merged-${files[0].file.name.replace('.pdf', '')}.pdf` : 'merged.pdf'
    );
    if (success) incrementDownloadCount();
  };

  const remainingCount = remaining();

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
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              handleFileSelect(e.dataTransfer.files);
            }}
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
          onChange={(e) => handleFileSelect(e.target.files)}
        />
        {error && <p className="mt-4 text-center text-red-500">오류: {error}</p>}
        <div className="mt-4 text-center">
          <DownloadBtn
            text={isMerging ? '병합 중...' : `PDF 병합하기 (${remainingCount}회 남음)`}
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
