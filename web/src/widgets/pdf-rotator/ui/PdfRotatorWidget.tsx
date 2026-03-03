'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { Upload, File as FileIcon } from 'lucide-react';
import { DownloadBtn } from '@/shared/ui/DownloadBtn';
import { useRotateStore } from '@/features/pdf-rotate/model/useRotateStore';
import { useDownloadLimitStore } from '@/shared/model/useDownloadLimitStore';
import { useTransferSidebarStore } from '@/shared/model/useTransferSidebarStore';
import { formatSize } from '@/shared/lib/formatSize';
import { API_BASE_URL } from '@/shared/api/config';

const PLACEHOLDER = 'data:image/svg+xml,' + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="128" height="176" viewBox="0 0 128 176"><rect fill="#e5e7eb" width="128" height="176"/></svg>'
);

export default function PdfRotatorWidget() {
  const { file, isRotating, error, angle, setFile, setAngle, rotateAndGetBlob, reset } = useRotateStore();
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [previews, setPreviews] = useState<{ [fileName: string]: string[] }>({});
  const { showSidebar } = useTransferSidebarStore();
  const { canDownload } = useDownloadLimitStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedFile = uploadedFiles.length ? uploadedFiles[selectedIdx] ?? uploadedFiles[0] : null;

  useEffect(() => useDownloadLimitStore.getState().resetIfNeeded(), []);

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

  const applyFiles = useCallback(
    (files: File[]) => {
      setUploadedFiles(files);
      setSelectedIdx(0);
      if (files.length) {
        setFile(files[0]);
        setAngle(null);
        files.forEach((f) => fetchPreview(f));
      } else {
        setFile(null);
      }
    },
    [setFile, setAngle, fetchPreview]
  );

  const onFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const list = e.target.files;
      if (list?.length) {
        const arr = Array.from(list).filter((f) => f.type === 'application/pdf');
        if (arr.length) applyFiles(arr);
      }
    },
    [applyFiles]
  );

  const handleFileSelect = useCallback(
    (fileList: FileList | null) => {
      if (!fileList?.length) return;
      const arr = Array.from(fileList).filter((f) => f.type === 'application/pdf');
      if (arr.length) applyFiles(arr);
    },
    [applyFiles]
  );

  const onSelectFile = useCallback(
    (idx: number) => {
      setSelectedIdx(idx);
      const f = uploadedFiles[idx];
      if (f) setFile(f);
    },
    [uploadedFiles, setFile]
  );

  useEffect(() => {
    const transferred = useTransferSidebarStore.getState().getAndClearTransferFile();
    if (transferred?.type === 'application/pdf') {
      applyFiles([transferred]);
    } else {
      const existingFile = useRotateStore.getState().file;
      if (existingFile) {
        applyFiles([existingFile]);
      } else {
        reset();
        setUploadedFiles([]);
      }
    }
  }, []);

  const handleRotateClick = async () => {
    if (!file || !canDownload()) return;
    const blob = await rotateAndGetBlob();
    if (blob) {
      const resultFile = new File([blob], `rotated-${file.name}`, { type: 'application/pdf' });
      showSidebar(resultFile, {
        title: '회전 완료',
        lines: [`결과 ${formatSize(resultFile.size)}`],
      });
      applyFiles([]);
    }
  };

  const clearFiles = () => {
    applyFiles([]);
    setUploadedFiles([]);
    setFile(null);
  };

  const isSingle = uploadedFiles.length === 1;
  const pagePreviews = selectedFile && (previews[selectedFile.name] ?? []);
  const hasFiles = uploadedFiles.length > 0;

  /* 최초 화면: 병합기 스타일 업로드 UI */
  if (!hasFiles) {
    return (
      <div className="w-full max-w-2xl mx-auto rounded-lg bg-white p-4 md:p-8 shadow-md dark:bg-gray-800">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-800 dark:text-white">PDF 회전</h1>
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
          onChange={onFileChange}
        />
        {error && <p className="mt-4 text-center text-red-500 dark:text-red-400">오류: {error}</p>}
      </div>
    );
  }

  /* 파일 업로드 후: 사이드바 + 중앙 미리보기 */
  return (
    <div className="flex w-full min-h-screen">
      <aside className="relative z-50 w-64 shrink-0 flex flex-col border-r border-gray-200 bg-white dark:bg-gray-800 dark:border-gray-700 shadow-sm">
        <div className="p-4 border-b border-gray-100 dark:border-gray-700">
          <h1 className="text-lg font-bold text-gray-800 dark:text-white">PDF 회전</h1>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">90°, 180°, 270°로 회전</p>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg text-sm">{error}</div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">파일</label>
            {isSingle ? (
              <>
                <div className="flex items-center gap-2 p-2 rounded-lg bg-gray-100 dark:bg-gray-700">
                  <FileIcon className="h-4 w-4 flex-shrink-0 text-blue-500" />
                  <span className="text-xs truncate text-gray-700 dark:text-gray-200" title={selectedFile?.name}>{selectedFile?.name}</span>
                </div>
                <button onClick={clearFiles} className="mt-2 text-xs text-blue-600 dark:text-blue-400 hover:underline">파일 변경</button>
              </>
            ) : (
              <>
                <div className="space-y-1.5">
                  {uploadedFiles.map((f, idx) => (
                    <button
                      key={`${f.name}-${idx}`}
                      onClick={() => onSelectFile(idx)}
                      className={`block w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-colors truncate ${selectedIdx === idx ? 'bg-blue-500 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'}`}
                      title={f.name}
                    >
                      {f.name}
                    </button>
                  ))}
                </div>
                <button onClick={clearFiles} className="mt-2 text-xs text-blue-600 dark:text-blue-400 hover:underline">파일 변경</button>
              </>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">회전 각도</label>
            <div className="flex flex-col gap-1.5">
              <button
                onClick={() => setAngle(null)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors text-left ${angle === null ? 'bg-blue-500 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'}`}
              >
                미선택 (원본)
              </button>
              {([90, 180, 270, 360] as const).map((a) => (
                <button
                  key={a}
                  onClick={() => setAngle(a)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors text-left ${angle === a ? 'bg-blue-500 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'}`}
                >
                  {a}°
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={() => setAngle(null)}
            className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
          >
            모두 재설정
          </button>

          <DownloadBtn
            text={isRotating ? '회전 중...' : '회전하기'}
            isLoading={isRotating}
            disabled={!file || isRotating || !canDownload()}
            onClick={handleRotateClick}
            className="w-full"
          />
        </div>
      </aside>

      <main className="flex-1 flex flex-col items-center justify-center min-h-0 p-6 overflow-auto bg-gray-50 dark:bg-gray-900/50">
        <div className="flex flex-col items-center w-full max-w-4xl">
          <div className="flex items-center justify-center min-h-[300px] w-full">
            <div
              className="flex flex-wrap gap-3 justify-center transition-transform duration-200"
              style={{ transform: `rotate(${angle === null || angle === 360 ? 0 : angle}deg)` }}
            >
              {(pagePreviews ?? []).length ? (
                (pagePreviews ?? []).map((src, idx) => (
                  <img
                    key={idx}
                    src={src}
                    alt={`페이지 ${idx + 1}`}
                    className={`object-contain border rounded-lg shadow-lg bg-white ${isSingle ? 'max-h-[70vh] max-w-full w-auto' : 'max-h-[50vh] w-40'}`}
                  />
                ))
              ) : (
                <img src={PLACEHOLDER} alt="미리보기" className="max-h-[70vh] rounded-lg border" />
              )}
            </div>
          </div>
          {selectedFile && (
            <p className="mt-3 text-sm text-gray-500 dark:text-gray-400 truncate max-w-full" title={selectedFile.name}>
              {selectedFile.name}
            </p>
          )}
        </div>
      </main>
    </div>
  );
}
