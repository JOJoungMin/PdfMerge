'use client';

import { useRef, useEffect, useState } from 'react';
import { Upload } from 'lucide-react';
import { PdfMergeGrid } from './PdfMergeGrid';
import { DownloadBtn } from '@/shared/ui/DownloadBtn';
import { useMergeStore } from '@/features/pdf-merge/model/useMergeStore';
import { useSession } from 'next-auth/react';
import { useDownloadLimitStore } from '@/shared/model/useDownloadLimitStore';

export default function PdfMergeWidget() {
  const { files, pageCounts, setPageCount, addFiles, removeFile, mergeAndDownload, reset, isMerging, error } = useMergeStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previews, setPreviews] = useState<{ [fileName: string]: string }>({});

  const { data: session, update } = useSession();
  const { canDownload, remaining, syncWithUser, increment: incrementDownloadCount, isSyncedWithUser, limit } = useDownloadLimitStore();

  // 파일 업로드 시
  const handleFileSelect = (fileList: FileList | null) => {
    if (!fileList) return;
    const newFiles = Array.from(fileList).filter(f => f.type === 'application/pdf');
    addFiles(newFiles);

    newFiles.forEach(fetchPreviewAndPageCount);
  };

  // 미리보기 및 페이지 수 가져오기
  const fetchPreviewAndPageCount = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('firstPage', '1');
    formData.append('lastPage', '1'); // 첫 페이지만 추출

    const res = await fetch('/api/pdf-preview', { method: 'POST', body: formData });
    if (!res.ok) return;

    const data = await res.json();
    if (data.previews && data.previews.length > 0) {
      setPreviews(prev => ({ ...prev, [file.name]: data.previews[0] }));
    }
    if (data.totalPages) {
      setPageCount(file.name, data.totalPages);
    }
  };

  useEffect(() => {
    syncWithUser(session?.user ?? null);
  }, [session, syncWithUser]);

  useEffect(() => {
    return () => reset();
  }, [reset]);

  const handleMergeClick = async () => {
    if (files.length < 2 || !canDownload()) return;
    const success = await mergeAndDownload(`merged-${files[0].name.replace('.pdf', '')}.pdf`);
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

  return(

  <div className="w-full rounded-lg bg-white p-4 md:p-8 shadow-md dark:bg-gray-800 flex flex-col h-[90vh]">

  {/* 상단 고정 영역 */}
  <div>
    <div className="text-center">
      <h1 className="text-3xl font-bold text-gray-800 dark:text-white">PDF 병합기</h1>
      <p className="mt-2 text-gray-600 dark:text-gray-400">
        PDF 파일을 드래그하거나 클릭해서 업로드하세요.
      </p>
    </div>

    {/* 업로드 박스 */}
    {files.length === 0 && (
      <div
        className="mt-8 flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 p-12 text-center hover:border-blue-500 dark:border-gray-600 dark:hover:border-blue-400"
        onDragOver={e => e.preventDefault()}
        onDrop={e => {
          e.preventDefault();
          handleFileSelect(e.dataTransfer.files);
        }}
        onClick={() => fileInputRef.current?.click()}
      >
        <Upload className="mb-2 h-10 w-10 text-gray-500" />
        <span className="font-semibold text-gray-600">파일 선택</span>
        <p className="text-sm text-gray-500">또는 파일을 여기로 드래그하세요</p>
        <input
          type="file"
          accept=".pdf"
          multiple
          ref={fileInputRef}
          className="hidden"
          onChange={e => handleFileSelect(e.target.files)}
        />
      </div>
    )}

    {error && (
      <p className="mt-4 text-center text-red-500">오류: {error}</p>
    )}

    {/* 병합 버튼 상단 배치 */}
    <div className="mt-4 text-center">
      <DownloadBtn
        text={getButtonText()}
        isLoading={isMerging}
        disabled={files.length < 2 || isMerging || !canDownload()}
        onClick={handleMergeClick}
      />
    </div>
  </div>

  {/* 미리보기 영역: flex-1 + overflow-y-auto */}
  <div className="flex-1 mt-6 overflow-y-auto">
    {files.length > 0 && (
      <PdfMergeGrid
        files={files}
        previews={previews}
        pageCounts={pageCounts}
        handleRemoveFile={removeFile}
        onAddFileClick={() => fileInputRef.current?.click()}
      />
    )}
  </div>
</div>
  )

}
