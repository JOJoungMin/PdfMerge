'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { Upload, File as FileIcon, X } from 'lucide-react';
import { DownloadBtn } from '@/shared/ui/DownloadBtn';
import { useImageToPdfStore } from '@/features/image-to-pdf/model/useImageToPdfStore';
import { useDownloadLimitStore } from '@/shared/model/useDownloadLimitStore';
import { useTransferSidebarStore } from '@/shared/model/useTransferSidebarStore';
import { formatSize } from '@/shared/lib/formatSize';

const ACCEPT = 'image/jpeg,image/jpg,image/png';

export default function ImageToPdfWidget() {
  const { files, isConverting, error, addFiles, removeFile, reset, convertAndGetBlob } = useImageToPdfStore();
  const { showSidebar } = useTransferSidebarStore();
  const { canDownload } = useDownloadLimitStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);

  useEffect(() => useDownloadLimitStore.getState().resetIfNeeded(), []);

  useEffect(() => {
    const urls = files.map((f) => URL.createObjectURL(f));
    setPreviewUrls((prev) => {
      prev.forEach(URL.revokeObjectURL);
      return urls;
    });
    return () => urls.forEach(URL.revokeObjectURL);
  }, [files]);

  useEffect(() => {
    const transferred = useTransferSidebarStore.getState().getAndClearTransferFile();
    if (!transferred) {
      const current = useImageToPdfStore.getState().files;
      if (!current.length) reset();
    }
  }, []);

  const onFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const list = e.target.files;
      if (list?.length) addFiles(Array.from(list));
      if (fileInputRef.current) fileInputRef.current.value = '';
    },
    [addFiles]
  );

  const handleFileSelect = useCallback(
    (fileList: FileList | null) => {
      if (fileList?.length) addFiles(Array.from(fileList));
    },
    [addFiles]
  );

  const handleConvertClick = async () => {
    if (!files.length || !canDownload()) return;
    const result = await convertAndGetBlob();
    if (result) {
      const { blob, filename } = result;
      const type = blob.type || (filename.endsWith('.zip') ? 'application/zip' : 'application/pdf');
      const resultFile = new File([blob], filename, { type });
      const summary = {
        title: '이미지 PDF 변환 완료',
        lines: files.length === 1 ? [`이미지 1장 → PDF 1개`, `결과 ${formatSize(blob.size)}`] : [`이미지 ${files.length}장 → PDF ${files.length}개 (ZIP)`, `결과 ${formatSize(blob.size)}`],
      };
      showSidebar(resultFile, summary);
      reset();
    }
  };

  const clearAll = () => {
    reset();
  };

  const hasFiles = files.length > 0;

  if (!hasFiles) {
    return (
      <div className="w-full max-w-2xl mx-auto rounded-lg bg-white p-4 md:p-8 shadow-md dark:bg-gray-800">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-800 dark:text-white">이미지 PDF 변환</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">JPG, PNG 이미지를 드래그하거나 클릭해서 업로드하세요. (1장 = PDF 1개)</p>
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
          <span className="font-semibold text-gray-600 dark:text-gray-400">이미지 선택</span>
          <p className="text-sm text-gray-500">JPG, PNG (여러 장 선택 가능)</p>
        </div>
        <input
          id="file-upload"
          type="file"
          accept={ACCEPT}
          multiple
          ref={fileInputRef}
          className="hidden"
          onChange={onFileChange}
        />
        {error && <p className="mt-4 text-center text-red-500 dark:text-red-400">오류: {error}</p>}
      </div>
    );
  }

  return (
    <div className="flex w-full min-h-screen">
      <aside className="relative z-50 w-64 shrink-0 flex flex-col border-r border-gray-200 bg-white dark:bg-gray-800 dark:border-gray-700 shadow-sm">
        <div className="p-4 border-b border-gray-100 dark:border-gray-700">
          <h1 className="text-lg font-bold text-gray-800 dark:text-white">이미지 PDF 변환</h1>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">1장 = 1페이지 PDF, 여러 장은 ZIP으로</p>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg text-sm">{error}</div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">이미지 ({files.length}장)</label>
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {files.map((f, i) => (
                <div key={`${f.name}-${i}`} className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-700">
                  <FileIcon className="h-3.5 w-3.5 flex-shrink-0 text-blue-500" />
                  <span className="text-xs truncate text-gray-700 dark:text-gray-200 flex-1 min-w-0" title={f.name}>{f.name}</span>
                  <button type="button" onClick={() => removeFile(i)} className="p-0.5 text-red-500 hover:text-red-600 rounded" title="제거">×</button>
                </div>
              ))}
            </div>
            <button type="button" onClick={() => fileInputRef.current?.click()} className="mt-2 w-full px-3 py-2 rounded-lg text-sm font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600">
              이미지 추가
            </button>
            <button type="button" onClick={clearAll} className="mt-1 text-xs text-blue-600 dark:text-blue-400 hover:underline">전체 지우기</button>
          </div>

          <DownloadBtn
            text={isConverting ? '변환 중...' : 'PDF로 만들기'}
            isLoading={isConverting}
            disabled={!files.length || isConverting || !canDownload()}
            onClick={handleConvertClick}
            className="w-full"
          />
        </div>
      </aside>

      <main className="flex-1 flex flex-col items-center justify-center min-h-0 p-6 overflow-auto bg-gray-50 dark:bg-gray-900/50">
        <input id="file-upload" type="file" accept={ACCEPT} multiple ref={fileInputRef} className="hidden" onChange={onFileChange} />
        <div className="flex flex-wrap gap-4 justify-center">
          {previewUrls.map((url, i) => (
            <div key={i} className="relative group">
              <img src={url} alt={files[i]?.name} className="max-h-64 max-w-full object-contain rounded-lg border border-gray-200 dark:border-gray-600 bg-white shadow" />
              <p className="mt-1 text-xs text-center text-gray-600 dark:text-gray-400 truncate max-w-[200px]">{files[i]?.name}</p>
              <button type="button" onClick={() => removeFile(i)} className="absolute top-1 right-1 p-1 rounded bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity"><X size={14} /></button>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
