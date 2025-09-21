'use client';

import { useEffect, useState, useRef } from 'react';
import { UploadCloud, File as FileIcon } from 'lucide-react';
import { DownloadBtn } from '@/shared/ui/DownloadBtn';
import { useConvertStore } from '@/features/pdf-convert/model/useConvertStore';
import { useSession } from 'next-auth/react';
import { useDownloadLimitStore } from '@/shared/model/useDownloadLimitStore';
import { useTransferSidebarStore } from '@/shared/model/useTransferSidebarStore';
import { downloadBlob } from '@/shared/lib/pdf/downloadBlob';
import { tempFileStore } from '@/shared/lib/temp-file-store';

export default function PdfConverterWidget() {
  const {
    file,
    isConverting,
    error,
    targetFormat,
    setFile,
    setTargetFormat,
    convertAndGetBlob,
    reset,
  } = useConvertStore();

  
  const [previews, setPreviews] = useState<{ [fileName: string]: string }>({});
  const consumed = useRef(false);

  const fetchPreview = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('lastPage', '1'); // 첫 페이지만 추출

    const res = await fetch('/api/pdf-preview', {
      method: 'POST',
      body: formData,
    })

    if(!res.ok){
      console.error('PDF 미리보기 생성 실패');
      return;
    }
    const data = await res.json();

    setPreviews(prev => ({...prev, [file.name]: data.previews[0]}));
  }

  const { showSidebar } = useTransferSidebarStore();

  const { data: session, update } = useSession();
  const {
    canDownload,
    remaining,
    syncWithUser,
    increment: incrementDownloadCount,
    isSyncedWithUser,
    limit
  } = useDownloadLimitStore();

  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // 페이지 로드 시 임시 저장소에서 파일을 가져오는 로직
  useEffect(() => {
    if (consumed.current) return;
    const transferredFile = tempFileStore.getFile();
    if (transferredFile) {
      consumed.current = true;
      setFile(transferredFile);
      if (transferredFile.type === 'application/pdf') {
        fetchPreview(transferredFile);
      }
    }
  }, []); // 페이지가 처음 로드될 때 한 번만 실행

  useEffect(() => {
    syncWithUser(session?.user ?? null);
  }, [session, syncWithUser]);

  useEffect(() => {
    if (!session) {
      useDownloadLimitStore.getState().resetIfNeeded();
    }
  }, [session]);

  

  function onFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const { files } = event.target;
    if (files && files[0]) {
      setFile(files[0]);
      fetchPreview(files[0]); 
    }
  }

  const handleConvertClick = async () => {
    if (!file || !canDownload()) return;
    const blob = await convertAndGetBlob();
    if (blob) {
      const convertedFileName = `converted-${file.name.replace('.pdf', '')}.zip`;
      await downloadBlob(blob, convertedFileName);

      // 원본 파일(file)을 사이드바로 전달
      tempFileStore.setFile(file);
      showSidebar();

      incrementDownloadCount();
      await update();

      setFile(null);
    }
  };

  const getButtonText = () => {
    if (isConverting) return '변환 중...';
    
    const baseText = `${targetFormat.toUpperCase()}로 변환 및 다운로드`;
    if (!isClient) return baseText;

    const remainingCount = remaining();
    return `${baseText} (${isSyncedWithUser ? `${remainingCount}/${limit}` : remainingCount}회 남음)`;
  }

  return (
    <div className="w-full max-w-4xl rounded-lg bg-white p-8 shadow-md dark:bg-gray-800">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-white">PDF 변환</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          PDF 파일의 각 페이지를 이미지(PNG, JPG) 파일로 변환합니다.
        </p>
      </div>

      {!file && (
        <label
          htmlFor="file-upload"
          className="flex flex-col items-center justify-center w-full h-64 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 dark:hover:bg-bray-800 dark:bg-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:hover:border-gray-500 dark:hover:bg-gray-600"
        >
          <div className="flex flex-col items-center justify-center pt-5 pb-6">
            <UploadCloud className="w-10 h-10 mb-3 text-gray-400" />
            <p className="mb-2 text-sm text-gray-500 dark:text-gray-400">
              <span className="font-semibold">클릭하여 업로드</span> 또는 드래그 앤 드롭
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">PDF 파일</p>
          </div>
          <input id="file-upload" type="file" className="hidden" onChange={onFileChange} accept=".pdf" />
        </label>
      )}

      {error && (
        <div className="mt-4 p-4 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 rounded-lg text-center">
          <p>{error}</p>
        </div>
      )}

      {file && (
        <div className="text-center">
          <div className="flex justify-between items-center mb-4 p-3 rounded-md bg-gray-100 dark:bg-gray-700">
            <div className="flex items-center min-w-0">
              <FileIcon className="mr-2 h-5 w-5 flex-shrink-0 text-blue-500" />
              <span className="truncate text-sm font-medium text-gray-800 dark:text-gray-200">
                {file.name}
              </span>
            </div>
            <button onClick={() => setFile(null)} className="text-sm text-blue-600 hover:underline flex-shrink-0 ml-2">
              파일 변경
            </button>
          </div>

          <div className="my-6">
            <label className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
              변환할 포맷 선택
            </label>
            <div className="flex justify-center space-x-4">
              <button
                onClick={() => setTargetFormat('png')}
                className={`px-4 py-2 rounded-lg ${
                  targetFormat === 'png' ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-600 text-gray-900 dark:text-white'
                }`}
              >
                PNG로 변환
              </button>
              <button
                onClick={() => setTargetFormat('jpeg')}
                className={`px-4 py-2 rounded-lg ${
                  targetFormat === 'jpeg' ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-600 text-gray-900 dark:text-white'
                }`}
              >
                JPG로 변환
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="mt-8 text-center">
        <DownloadBtn
          text={getButtonText()}
          isLoading={isConverting}
          disabled={!file || isConverting || !canDownload()}
          onClick={handleConvertClick}
        />
      </div>
      {file && previews[file.name] && (
  <div className="mt-4 text-center">
    <img
      src={previews[file.name]}
      alt="Preview"
      className="w-32 h-44 object-cover border rounded"
    />
  </div>
)}
    </div>
  );
}
