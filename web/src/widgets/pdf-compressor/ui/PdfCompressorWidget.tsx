'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { Upload, File as FileIcon, FileUp } from 'lucide-react';
import { DownloadBtn } from '@/shared/ui/DownloadBtn';
import { useCompressStore } from '@/features/pdf-compress/model/useCompressStore';
import { useDownloadLimitStore } from '@/shared/model/useDownloadLimitStore';
import { useTransferSidebarStore } from '@/shared/model/useTransferSidebarStore';
import { formatSize } from '@/shared/lib/formatSize';
import { API_BASE_URL } from '@/shared/api/config';

const PLACEHOLDER = 'data:image/svg+xml,' + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="320" height="400" viewBox="0 0 320 400"><rect fill="#e5e7eb" width="320" height="400"/><text x="160" y="200" text-anchor="middle" fill="#9ca3af" font-size="14">미리보기 준비 중</text></svg>'
);

export default function PdfCompressorWidget() {
  const { file, isCompressing, error, quality, compressionResult, setFile, setQuality, compressAndGetBlob, reset } = useCompressStore();
  const [previews, setPreviews] = useState<{ [fileName: string]: string[] }>({});
  const [showReplacePopover, setShowReplacePopover] = useState(false);
  const { showSidebar } = useTransferSidebarStore();
  const { canDownload } = useDownloadLimitStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => useDownloadLimitStore.getState().resetIfNeeded(), []);

  useEffect(() => () => { reset(); }, [reset]);

  const fetchPreview = useCallback(async (fileToPreview: File) => {
    const formData = new FormData();
    formData.append('file', fileToPreview);
    try {
      const res = await fetch(`${API_BASE_URL}/api/pdf-preview`, { method: 'POST', body: formData });
      if (!res.ok) return;
      const data = await res.json();
      if (data.previews?.length) setPreviews((prev) => ({ ...prev, [fileToPreview.name]: data.previews }));
    } catch {}
  }, []);

  const applyFile = useCallback(
    (f: File | null) => {
      if (f) {
        setFile(f);
        fetchPreview(f);
      } else {
        setFile(null);
      }
    },
    [setFile, fetchPreview]
  );

  const onFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const f = e.target.files?.[0];
      if (f?.type === 'application/pdf') applyFile(f);
      e.target.value = '';
    },
    [applyFile]
  );

  const openReplaceFilePicker = () => {
    setShowReplacePopover(false);
    fileInputRef.current?.click();
  };

  const handleFileSelect = useCallback(
    (fileList: FileList | null) => {
      const f = fileList?.[0];
      if (f?.type === 'application/pdf') applyFile(f);
    },
    [applyFile]
  );

  useEffect(() => {
    const transferred = useTransferSidebarStore.getState().getAndClearTransferFile();
    if (transferred?.type === 'application/pdf') {
      applyFile(transferred);
    } else {
      const existingFile = useCompressStore.getState().file;
      if (existingFile) {
        applyFile(existingFile);
      } else {
        reset();
      }
    }
  }, []);

  const handleCompressClick = async () => {
    if (!file || !canDownload()) return;
    const blob = await compressAndGetBlob();
    if (blob) {
      const result = useCompressStore.getState().compressionResult;
      const summary = result
        ? {
            title: '압축 완료',
            lines: [
              `원본 ${formatSize(result.originalSize)}`,
              `압축 후 ${formatSize(result.compressedSize)}`,
              `약 ${result.reduction}% 감소`,
            ],
          }
        : undefined;
      showSidebar(
        new File([blob], `compressed-${file.name}`, { type: 'application/pdf' }),
        summary
      );
      setFile(null);
    }
  };

  const clearFile = () => setFile(null);
  const hasFile = !!file;
  const pagePreviews = file ? (previews[file.name] ?? []) : [];
  const isBuildingPreview = hasFile && pagePreviews.length === 0;

  /* 최초 화면: 병합기 스타일 업로드 UI */
  if (!hasFile) {
    return (
      <div className="w-full max-w-2xl mx-auto rounded-lg bg-white p-4 md:p-8 shadow-md dark:bg-gray-800">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-800 dark:text-white">PDF 압축</h1>
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
          ref={fileInputRef}
          className="hidden"
          onChange={onFileChange}
        />
        {error && <p className="mt-4 text-center text-red-500 dark:text-red-400">오류: {error}</p>}
      </div>
    );
  }

  /* 파일 업로드 후: 사이드바(nav 아래 고정) + 중앙 미리보기 */
  return (
    <div className="flex w-full min-h-screen">
      <aside className="fixed top-16 left-0 bottom-0 w-80 z-40 flex flex-col border-r border-gray-200 bg-white dark:bg-gray-800 dark:border-gray-700 shadow-sm" aria-label="기능 컨트롤">
        <div className="p-4 border-b border-gray-100 dark:border-gray-700">
          <h1 className="text-lg font-bold text-gray-800 dark:text-white">PDF 압축</h1>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">이미지 품질 조절로 용량 축소</p>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg text-sm">{error}</div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">파일</label>
            <div className="flex items-center gap-2 p-2 rounded-lg bg-gray-100 dark:bg-gray-700">
              <FileIcon className="h-4 w-4 flex-shrink-0 text-blue-500" />
              <span className="text-xs truncate text-gray-700 dark:text-gray-200" title={file.name}>{file.name}</span>
            </div>
            <button onClick={clearFile} className="mt-2 text-xs text-blue-600 dark:text-blue-400 hover:underline">파일 변경</button>
          </div>

          <div>
            <label htmlFor="quality" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">압축 품질</label>
            <input
              id="quality"
              type="range"
              min="0.1"
              max="1"
              step="0.1"
              value={quality}
              onChange={(e) => setQuality(parseFloat(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">낮음 ← → 높음 (원본 품질)</p>
          </div>

          {compressionResult && (
            <div className="text-sm space-y-1 text-gray-700 dark:text-gray-300">
              <p>원본: <span className="font-mono">{(compressionResult.originalSize / 1024 / 1024).toFixed(2)} MB</span></p>
              <p>압축: <span className="font-mono">{(compressionResult.compressedSize / 1024 / 1024).toFixed(2)} MB</span></p>
              <p className="font-semibold text-green-600 dark:text-green-400">감소: {compressionResult.reduction}%</p>
            </div>
          )}

          <DownloadBtn
            text={isCompressing ? '압축 중...' : '압축하기'}
            isLoading={isCompressing}
            disabled={!file || isCompressing || !canDownload()}
            onClick={handleCompressClick}
            className="w-full"
          />
        </div>
      </aside>

      <main className="flex-1 flex flex-col items-center justify-center min-h-0 p-6 overflow-auto bg-gray-50 dark:bg-gray-900/50 ml-80 relative">
        {isBuildingPreview && (
          <>
            <div className="absolute inset-0 z-10 backdrop-blur-sm bg-black/20 dark:bg-black/30" aria-hidden />
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center pointer-events-none">
              <div className="flex flex-col items-center gap-4">
                <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">PDF 빌드중</p>
              </div>
            </div>
          </>
        )}
        <div className="absolute top-4 left-4 z-10" onMouseEnter={() => setShowReplacePopover(true)} onMouseLeave={() => setShowReplacePopover(false)}>
          <div className="w-12 h-12 rounded-lg bg-white/90 dark:bg-gray-800/90 border border-gray-200 dark:border-gray-600 shadow flex items-center justify-center cursor-pointer hover:bg-white dark:hover:bg-gray-700">
            <FileUp className="w-5 h-5 text-gray-600 dark:text-gray-300" />
          </div>
          {showReplacePopover && (
            <div className="absolute top-full left-0 mt-1 p-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 shadow-lg whitespace-nowrap">
              <button type="button" onClick={openReplaceFilePicker} className="block w-full text-left px-3 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded">
                파일 교체하기
              </button>
            </div>
          )}
        </div>
        <div className="flex flex-col items-center w-full max-w-4xl">
          <div className="flex items-center justify-center min-h-[300px] w-full">
            <div className="flex flex-wrap gap-3 justify-center">
              {pagePreviews.length ? (
                pagePreviews.map((src, idx) => (
                  <img
                    key={idx}
                    src={src}
                    alt={`페이지 ${idx + 1}`}
                    className="max-h-[70vh] w-auto object-contain border rounded-lg shadow-lg bg-white"
                  />
                ))
              ) : (
                <img src={PLACEHOLDER} alt="미리보기" className="max-h-[70vh] rounded-lg border" />
              )}
            </div>
          </div>
          <p className="mt-3 text-sm text-gray-500 dark:text-gray-400 truncate max-w-full" title={file.name}>
            {file.name}
          </p>
        </div>
        <input type="file" accept=".pdf" ref={fileInputRef} className="hidden" onChange={onFileChange} aria-hidden />
      </main>
    </div>
  );
}
