'use client';

import { useEffect, useState, useCallback, useRef, type CSSProperties } from 'react';
import { Upload, File as FileIcon, FileUp } from 'lucide-react';
import { usePageNumberStore } from '@/features/pdf-page-number/model/usePageNumberStore';
import type { PageNumberPosition, PageNumberMargin, PageNumberTextFormat, PageNumberPadding } from '@/features/pdf-page-number/model/usePageNumberStore';
import { useDownloadLimitStore } from '@/shared/model/useDownloadLimitStore';
import { useTransferSidebarStore } from '@/shared/model/useTransferSidebarStore';
import { formatSize } from '@/shared/lib/formatSize';
import { API_BASE_URL } from '@/shared/api/config';

const POSITIONS: { value: PageNumberPosition; label: string }[] = [
  { value: 'top-left', label: '상단 좌측' },
  { value: 'top-right', label: '상단 우측' },
  { value: 'bottom-left', label: '하단 좌측' },
  { value: 'bottom-center', label: '하단 중앙' },
  { value: 'bottom-right', label: '하단 우측' },
];
const MARGINS: { value: PageNumberMargin; label: string }[] = [
  { value: 'narrow', label: '좁게' },
  { value: 'medium', label: '보통' },
  { value: 'wide', label: '넓게' },
];
const TEXT_FORMATS: { value: PageNumberTextFormat; label: string }[] = [
  { value: 'number-only', label: '번호만' },
  { value: 'n-of-total', label: 'n / N' },
];
const PADDINGS: { value: PageNumberPadding; label: string }[] = [
  { value: 1, label: '1자리' },
  { value: 2, label: '2자리 (01)' },
  { value: 3, label: '3자리 (001)' },
];

const PLACEHOLDER =
  'data:image/svg+xml,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="320" height="400" viewBox="0 0 320 400"><rect fill="#e5e7eb" width="320" height="400"/><text x="160" y="200" text-anchor="middle" fill="#9ca3af" font-size="14">미리보기 준비 중</text></svg>'
  );

/** 좁게=구석에 딱 맞춤(0), 보통/넓게=백엔드 20pt/28pt에 맞춰 썸네일 비율로 */
const MARGIN_OFFSET: Record<PageNumberMargin, string> = {
  narrow: '0',
  medium: '3.5%',
  wide: '5%',
};

/** A4 비율(끝선) 기준으로 페이지 모서리/가장자리 + 여백 반영한 오버레이 위치 */
function getOverlayStyle(position: PageNumberPosition, margin: PageNumberMargin): CSSProperties {
  const edge = MARGIN_OFFSET[margin];
  const base: CSSProperties = {
    width: '10%',
    height: '10%',
  };

  switch (position) {
    case 'top-left':
      return { ...base, top: edge, left: edge };
    case 'top-right':
      return { ...base, top: edge, right: edge };
    case 'bottom-left':
      return { ...base, bottom: edge, left: edge };
    case 'bottom-center':
      return { ...base, bottom: edge, left: '50%', transform: 'translateX(-50%)', width: '28%' };
    case 'bottom-right':
      return { ...base, bottom: edge, right: edge };
    default:
      return { ...base, bottom: edge, right: edge };
  }
}

export default function PageNumberWidget() {
  const {
    file,
    isAdding,
    error,
    position,
    margin,
    startPage,
    endPage,
    startNumber,
    textFormat,
    padding,
    setFile,
    setPosition,
    setMargin,
    setStartPage,
    setEndPage,
    setStartNumber,
    setTextFormat,
    setPadding,
    addPageNumbersAndGetBlob,
    reset,
  } = usePageNumberStore();
  const [previews, setPreviews] = useState<string[]>([]);
  const [totalPages, setTotalPages] = useState(0);
  const [showReplacePopover, setShowReplacePopover] = useState(false);
  const { showSidebar } = useTransferSidebarStore();
  const { canDownload } = useDownloadLimitStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => useDownloadLimitStore.getState().resetIfNeeded(), []);

  useEffect(() => () => { reset(); }, [reset]);

  const fetchPreview = useCallback(async (f: File) => {
    const formData = new FormData();
    formData.append('file', f);
    try {
      const res = await fetch(`${API_BASE_URL}/api/pdf-preview`, { method: 'POST', body: formData });
      if (!res.ok) return;
      const data = await res.json();
      if (data.previews?.length) {
        setPreviews(data.previews);
        setTotalPages(data.previews.length);
        usePageNumberStore.getState().setEndPage(data.previews.length);
      }
    } catch {
      setPreviews([]);
      setTotalPages(0);
    }
  }, []);

  const applyFile = useCallback(
    (f: File | null) => {
      setFile(f);
      if (f) {
        fetchPreview(f);
      } else {
        setPreviews([]);
        setTotalPages(0);
      }
    },
    [setFile, fetchPreview]
  );

  const onFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const list = e.target.files;
      if (list?.length) {
        const pdf = Array.from(list).find((f) => f.type === 'application/pdf');
        if (pdf) applyFile(pdf);
      }
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
      if (!fileList?.length) return;
      const pdf = Array.from(fileList).find((f) => f.type === 'application/pdf');
      if (pdf) applyFile(pdf);
    },
    [applyFile]
  );

  useEffect(() => {
    const transferred = useTransferSidebarStore.getState().getAndClearTransferFile();
    if (transferred?.type === 'application/pdf') {
      applyFile(transferred);
    } else {
      const existing = usePageNumberStore.getState().file;
      if (existing) applyFile(existing);
      else {
        reset();
        setPreviews([]);
        setTotalPages(0);
      }
    }
  }, []);

  const handleAddClick = async () => {
    if (!file || !canDownload()) return;
    const result = await addPageNumbersAndGetBlob();
    if (result) {
      const resultFile = new File([result.blob], result.filename, { type: 'application/pdf' });
      showSidebar(resultFile, {
        title: '페이지 번호 추가 완료',
        lines: [`결과 ${formatSize(resultFile.size)}`, `범위: ${startPage}–${endPage}페이지`],
      });
      applyFile(null);
    }
  };

  const clearFile = () => {
    applyFile(null);
  };

  const hasFile = !!file;
  const isBuildingPreview = hasFile && previews.length === 0;
  const overlayStyle: CSSProperties | undefined = position ? getOverlayStyle(position, margin) : undefined;

  if (!hasFile) {
    return (
      <div className="w-full max-w-2xl mx-auto rounded-lg bg-white p-4 md:p-8 shadow-md dark:bg-gray-800">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-800 dark:text-white">페이지 번호 넣기</h1>
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

  return (
    <div className="flex w-full min-h-screen">
      <aside className="fixed top-16 left-0 bottom-0 w-80 z-40 flex flex-col border-r border-gray-200 bg-white dark:bg-gray-800 dark:border-gray-700 shadow-sm" aria-label="기능 컨트롤">
        <div className="p-4 border-b border-gray-100 dark:border-gray-700">
          <h1 className="text-lg font-bold text-gray-800 dark:text-white">페이지 번호 넣기</h1>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">위치·여백·범위 설정</p>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">파일</label>
            <div className="flex items-center gap-2 p-2 rounded-lg bg-gray-100 dark:bg-gray-700">
              <FileIcon className="h-4 w-4 flex-shrink-0 text-blue-500" />
              <span className="text-xs truncate text-gray-700 dark:text-gray-200" title={file?.name}>
                {file?.name}
              </span>
            </div>
            <button onClick={clearFile} className="mt-2 text-xs text-blue-600 dark:text-blue-400 hover:underline">
              파일 변경
            </button>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">위치</label>
            <div className="flex flex-wrap gap-1.5">
              {POSITIONS.map((p) => (
                <button
                  key={p.value}
                  onClick={() => setPosition(p.value)}
                  className={`px-2.5 py-1.5 rounded text-xs font-medium transition-colors ${
                    position === p.value ? 'bg-blue-500 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">여백</label>
            <div className="flex gap-1.5">
              {MARGINS.map((m) => (
                <button
                  key={m.value}
                  onClick={() => setMargin(m.value)}
                  className={`px-2.5 py-1.5 rounded text-xs font-medium transition-colors ${
                    margin === m.value ? 'bg-blue-500 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">시작 페이지</label>
              <input
                type="number"
                min={1}
                max={totalPages || 9999}
                value={startPage}
                onChange={(e) => setStartPage(parseInt(e.target.value, 10) || 1)}
                className="w-full px-2 py-1.5 rounded border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">끝 페이지</label>
              <input
                type="number"
                min={1}
                max={totalPages || 9999}
                value={endPage}
                onChange={(e) => setEndPage(parseInt(e.target.value, 10) || 1)}
                className="w-full px-2 py-1.5 rounded border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">시작 번호</label>
              <input
                type="number"
                min={1}
                value={startNumber}
                onChange={(e) => setStartNumber(parseInt(e.target.value, 10) || 1)}
                className="w-full px-2 py-1.5 rounded border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">텍스트 형식</label>
            <div className="flex gap-1.5">
              {TEXT_FORMATS.map((t) => (
                <button
                  key={t.value}
                  onClick={() => setTextFormat(t.value)}
                  className={`px-2.5 py-1.5 rounded text-xs font-medium transition-colors ${
                    textFormat === t.value ? 'bg-blue-500 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">번호 자릿수</label>
            <div className="flex gap-1.5">
              {PADDINGS.map((p) => (
                <button
                  key={p.value}
                  onClick={() => setPadding(p.value)}
                  className={`px-2.5 py-1.5 rounded text-xs font-medium transition-colors ${
                    padding === p.value ? 'bg-blue-500 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleAddClick}
            disabled={!file || isAdding || !canDownload()}
            className="w-full py-2.5 px-4 rounded-lg bg-blue-500 text-white font-semibold hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isAdding ? '처리 중...' : '페이지 번호 추가'}
          </button>
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
        <div className="flex flex-col items-center w-full max-w-5xl">
          <div className="flex flex-wrap gap-4 justify-center items-start min-h-[300px]">
            {previews.length ? (
              previews.map((src, idx) => (
                <div key={idx} className="relative inline-block">
                  {(() => {
                    const pageNumber = idx + 1;
                    if (pageNumber < startPage || pageNumber > endPage) {
                      return null;
                    }
                    const logicalIndex = pageNumber - startPage;
                    const n = startNumber + logicalIndex;
                    const totalInRange = endPage - startPage + 1;
                    const pad = (v: number) => {
                      const s = String(v);
                      if (padding === 2) return s.padStart(2, '0');
                      if (padding === 3) return s.padStart(3, '0');
                      return s;
                    };
                    const text =
                      textFormat === 'n-of-total'
                        ? `${pad(n)} / ${pad(totalInRange)}`
                        : pad(n);
                    return (
                      overlayStyle && (
                        <div
                          className="absolute rounded-sm border-2 border-blue-500 bg-blue-500/10 pointer-events-none flex items-center justify-center text-[9px] md:text-[10px] font-semibold text-black"
                          style={overlayStyle}
                        >
                          {text}
                        </div>
                      )
                    );
                  })()}
                  <img
                    src={src}
                    alt={`페이지 ${idx + 1}`}
                    className="object-contain border rounded-lg shadow-lg bg-white max-h-[72vh] min-h-[320px] w-64 md:w-80"
                  />
                </div>
              ))
            ) : (
              <img src={PLACEHOLDER} alt="미리보기" className="max-h-[70vh] rounded-lg border" />
            )}
          </div>
          {file && (
            <p className="mt-3 text-sm text-gray-500 dark:text-gray-400 truncate max-w-full" title={file.name}>
              {file.name} {totalPages > 0 && `(${totalPages}페이지)`}
            </p>
          )}
        </div>
        <input type="file" accept=".pdf" ref={fileInputRef} className="hidden" onChange={onFileChange} aria-hidden />
      </main>
    </div>
  );
}
