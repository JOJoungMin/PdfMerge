'use client';

import { useRef, useEffect, useState } from 'react';
import { UploadCloud, File as FileIcon } from 'lucide-react';
import { DownloadBtn } from '@/shared/ui/DownloadBtn';
import { useEditorStore } from '@/features/pdf-edit/model/useEditorStore';
import { useSession } from 'next-auth/react';
import { useDownloadLimitStore } from '@/shared/model/useDownloadLimitStore';

export default function PdfEditorWidget() {
  const {
    file,
    numPages,
    pages,
    isLoading,
    isProcessing,
    error,
    setFile,
    removePage,
    movePageUp,
    movePageDown,
    editAndDownload,
    reset
  } = useEditorStore();

  const [previews, setPreviews] = useState<{ [fileName: string]: string[] }>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isClient, setIsClient] = useState(false);

  const { data: session, update } = useSession();
  const {
    canDownload,
    remaining,
    syncWithUser,
    increment: incrementDownloadCount,
    isSyncedWithUser,
    limit
  } = useDownloadLimitStore();

  // 클라이언트 감지
  useEffect(() => setIsClient(true), []);

  // 세션 동기화
  useEffect(() => {
    syncWithUser(session?.user ?? null);
  }, [session, syncWithUser]);

  useEffect(() => {
    if (!session) useDownloadLimitStore.getState().resetIfNeeded();
  }, [session]);

  // 언마운트 시 상태 초기화
  useEffect(() => () => reset(), [reset]);

  // 파일 업로드 시 처리
  const onFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files[0]) setFile(files[0], 0);
    else setFile(null, 0);
  };

  const handleFileChangeClick = () => setFile(null, 0);

  const handleEditClick = async () => {
    if (!file || isLoading || isProcessing || pages.length === 0 || !canDownload()) return;
    const success = await editAndDownload();
    if (success) {
      incrementDownloadCount();
      await update();
    }
  };

  // 전체 페이지 미리보기 fetch
  const fetchAllPreviews = async (file: File, numPages: number) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('firstPage', '1');
    formData.append('lastPage', numPages.toString());

    const res = await fetch('/api/pdf-preview', { method: 'POST', body: formData });
    if (!res.ok) {
      // TODO: Handle error appropriately
      console.error("Failed to fetch previews");
      return;
    }

    const data = await res.json();
    if (data.previews) {
      setPreviews(prev => ({ ...prev, [file.name]: data.previews }));
    }
  };

  // 파일 업로드 후 전체 페이지 미리보기 로드
  useEffect(() => {
    if (file && numPages > 0) {
      fetchAllPreviews(file, numPages);
    }
  }, [file, numPages]);

  const getButtonText = () => {
    if (isLoading) return 'PDF를 불러오는 중입니다...';
    if (isProcessing) return 'PDF 수정 중...';
    if (!isClient) return 'PDF 수정 및 다운로드';
    const remainingCount = remaining();
    return `PDF 수정 및 다운로드 (${isSyncedWithUser ? `${remainingCount}/${limit}` : remainingCount}회 남음)`;
  };

  return (
    <div className="w-full max-w-4xl rounded-lg bg-white p-8 shadow-md dark:bg-gray-800">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-white">PDF 편집</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          PDF 파일을 선택하고 페이지를 재정렬하거나 삭제하세요.
        </p>
      </div>

      {!file && (
        <label
          htmlFor="file-upload"
          className="flex flex-col items-center justify-center w-full h-64 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 dark:border-gray-600 dark:bg-gray-700 dark:hover:bg-gray-600"
        >
          <div className="flex flex-col items-center justify-center pt-5 pb-6">
            <UploadCloud className="w-10 h-10 mb-3 text-gray-400" />
            <p className="mb-2 text-sm text-gray-500 dark:text-gray-400">
              <span className="font-semibold">클릭하여 업로드</span> 또는 드래그 앤 드롭
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">PDF 파일 (최대 50MB)</p>
          </div>
          <input
            id="file-upload"
            type="file"
            className="hidden"
            onChange={onFileChange}
            accept=".pdf"
            ref={fileInputRef}
          />
        </label>
      )}

      {error && (
        <div className="mt-4 p-4 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 rounded-lg text-center">
          <p>{error}</p>
        </div>
      )}

      {file && (
        <>
          <div className="flex justify-between items-center mb-4 p-3 rounded-md bg-gray-100 dark:bg-gray-700">
            <div className="flex items-center min-w-0">
              <FileIcon className="mr-2 h-5 w-5 flex-shrink-0 text-blue-500" />
              <span className="truncate text-sm font-medium text-gray-800 dark:text-gray-200">{file.name}</span>
            </div>
            <button
              onClick={handleFileChangeClick}
              className="text-sm text-blue-600 hover:underline flex-shrink-0 ml-2"
            >
              파일 변경
            </button>
          </div>

          {previews[file.name] && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mt-4 max-h-[60vh] overflow-y-auto">
              {previews[file.name].map((preview, index) => (
                <div key={index} className="border rounded p-1">
                  <img src={preview} alt={`Page ${index + 1}`} className="w-full object-cover" />
                  <p className="text-center text-sm mt-1 text-gray-700 dark:text-gray-200">Page {index + 1}</p>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      <div className="mt-6 text-center">
        <DownloadBtn
          text={getButtonText()}
          isLoading={isProcessing || isLoading}
          disabled={!file || isLoading || isProcessing || pages.length === 0 || !canDownload()}
          onClick={handleEditClick}
        />
      </div>
    </div>
  );
}
