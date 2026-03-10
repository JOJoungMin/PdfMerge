'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { Upload, File as FileIcon, FileUp, ZoomIn, ZoomOut, Square, Hand } from 'lucide-react';
import { DownloadBtn } from '@/shared/ui/DownloadBtn';
import { useRedactStore } from '@/features/pdf-redact/model/useRedactStore';
import type { UserRedactArea, RedactAreaStyle } from '@/features/pdf-redact/model/useRedactStore';
import { useDownloadLimitStore } from '@/shared/model/useDownloadLimitStore';
import { useTransferSidebarStore } from '@/shared/model/useTransferSidebarStore';
import { formatSize } from '@/shared/lib/formatSize';
import { API_BASE_URL } from '@/shared/api/config';

const PLACEHOLDER = 'data:image/svg+xml,' + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="320" height="400" viewBox="0 0 320 400"><rect fill="#e5e7eb" width="320" height="400"/><text x="160" y="200" text-anchor="middle" fill="#9ca3af" font-size="14">미리보기 준비 중</text></svg>'
);

const STYLES: { value: RedactAreaStyle; label: string }[] = [
  { value: 'black', label: '검정' },
  { value: 'blur', label: '블러' },
  { value: 'background', label: '배경색' },
];

const ZOOM_STEPS = [50, 75, 100, 125, 150, 200, 250, 300, 400, 500, 750, 1000];
const ZOOM_MAX = 1000;
const ZOOM_MIN = 50;

type ToolMode = 'draw' | 'pan';

/** 영역 테두리(박스 뒤 배경) 픽셀만 샘플링해 배경색 반환. 텍스트가 아닌 주변 배경색을 얻기 위함 */
function getBackgroundColorFromImage(img: HTMLImageElement, x: number, y: number, w: number, h: number): string {
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '#e5e7eb';
  ctx.drawImage(img, 0, 0);
  const px = Math.floor(x * img.naturalWidth);
  const py = Math.floor(y * img.naturalHeight);
  const pw = Math.max(2, Math.floor(w * img.naturalWidth));
  const ph = Math.max(2, Math.floor(h * img.naturalHeight));
  const band = Math.max(1, Math.min(3, Math.floor(Math.min(pw, ph) * 0.3)));
  const data = ctx.getImageData(Math.max(0, px), Math.max(0, py), pw, ph).data;
  const stride = pw * 4;
  let r = 0, g = 0, b = 0, n = 0;
  for (let row = 0; row < ph; row++) {
    for (let col = 0; col < pw; col++) {
      const isEdge = row < band || row >= ph - band || col < band || col >= pw - band;
      if (!isEdge) continue;
      const i = row * stride + col * 4;
      r += data[i];
      g += data[i + 1];
      b += data[i + 2];
      n += 1;
    }
  }
  if (n === 0) return '#e5e7eb';
  return `rgb(${Math.round(r / n)}, ${Math.round(g / n)}, ${Math.round(b / n)})`;
}

export default function PdfRedactWidget() {
  const { file, isRedacting, error, setFile, redactAndGetBlob, reset } = useRedactStore();
  const [previews, setPreviews] = useState<{ [fileName: string]: string[] }>({});
  const [showReplacePopover, setShowReplacePopover] = useState(false);
  const [redactAreas, setRedactAreas] = useState<UserRedactArea[]>([]);
  const [areaStyle, setAreaStyle] = useState<RedactAreaStyle>('black');
  const [selectedAreaIndex, setSelectedAreaIndex] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [zoom, setZoom] = useState(100);
  const [toolMode, setToolMode] = useState<ToolMode>('draw');
  const [panStart, setPanStart] = useState<{ x: number; y: number; scrollLeft: number; scrollTop: number } | null>(null);
  const [backgroundColors, setBackgroundColors] = useState<{ key: string; color: string }[]>([]);
  const [drawing, setDrawing] = useState<{ startX: number; startY: number; currentX: number; currentY: number } | null>(null);
  const previewWrapRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const areaStyleRef = useRef(areaStyle);
  areaStyleRef.current = areaStyle;
  const { showSidebar, hideSidebar } = useTransferSidebarStore();
  const { canDownload } = useDownloadLimitStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => useDownloadLimitStore.getState().resetIfNeeded(), []);

  useEffect(() => () => { reset(); }, [reset]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (selectedAreaIndex === null) return;
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        const idx = selectedAreaIndex;
        setRedactAreas((prev) => prev.filter((_, i) => i !== idx));
        setSelectedAreaIndex(null);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selectedAreaIndex]);

  useEffect(() => {
    if (file) {
      setRedactAreas([]);
      setCurrentPage(0);
      setBackgroundColors([]);
      setSelectedAreaIndex(null);
    }
  }, [file?.name]);

  const handleStyleButtonClick = useCallback(
    (style: RedactAreaStyle) => {
      if (selectedAreaIndex !== null) {
        setRedactAreas((prev) =>
          prev.map((area, i) => (i === selectedAreaIndex ? { ...area, style } : area))
        );
        setAreaStyle(style);
      } else {
        setAreaStyle(style);
      }
    },
    [selectedAreaIndex]
  );

  const currentPreviewSrc = file ? (previews[file.name] ?? [])[currentPage] ?? (previews[file?.name ?? ''] ?? [])[0] : null;

  useEffect(() => {
    if (!currentPreviewSrc || !imgRef.current?.complete || imgRef.current.naturalWidth === 0) return;
    const img = imgRef.current;
    const areasOnPage = redactAreas.filter((a) => a.pageIndex === currentPage && a.style === 'background');
    const next: { key: string; color: string }[] = [];
    areasOnPage.forEach((a, i) => {
      const key = `${currentPage}-${i}-${a.x}-${a.y}-${a.width}-${a.height}`;
      try {
        next.push({ key, color: getBackgroundColorFromImage(img, a.x, a.y, a.width, a.height) });
      } catch {
        next.push({ key, color: '#e5e7eb' });
      }
    });
    setBackgroundColors(next);
  }, [currentPreviewSrc, currentPage, redactAreas]);

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
      const existingFile = useRedactStore.getState().file;
      if (existingFile) {
        applyFile(existingFile);
      } else {
        reset();
      }
    }
  }, []);

  const handleRedactClick = async () => {
    if (!file || !canDownload() || redactAreas.length === 0) return;
    const blob = await redactAndGetBlob(redactAreas);
    if (blob) {
      const resultFile = new File([blob], `redacted-${file.name}`, { type: 'application/pdf' });
      showSidebar(resultFile, {
        title: '블라인드 완료',
        lines: [`결과 ${formatSize(resultFile.size)}`, `선택한 ${redactAreas.length}개 영역을 가렸습니다.`],
        retry: { label: '다시 편집하기', onRetry: () => hideSidebar() },
      });
    }
  };

  const getPreviewRect = useCallback(() => {
    const img = imgRef.current;
    if (!img) return null;
    const r = img.getBoundingClientRect();
    return { left: r.left, top: r.top, width: r.width, height: r.height };
  }, []);

  const handlePreviewMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (toolMode === 'pan') {
        const el = previewWrapRef.current;
        if (el) setPanStart({ x: e.clientX, y: e.clientY, scrollLeft: el.scrollLeft, scrollTop: el.scrollTop });
        return;
      }
      if (!imgRef.current || toolMode !== 'draw') return;
      e.preventDefault();
      const rect = getPreviewRect();
      if (!rect) return;
      const x = (e.clientX - rect.left) / rect.width;
      const y = (e.clientY - rect.top) / rect.height;
      setDrawing({ startX: x, startY: y, currentX: x, currentY: y });
    },
    [getPreviewRect, toolMode]
  );

  const handlePreviewMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (panStart) {
        const el = previewWrapRef.current;
        if (el) {
          el.scrollLeft = panStart.scrollLeft + (panStart.x - e.clientX);
          el.scrollTop = panStart.scrollTop + (panStart.y - e.clientY);
        }
        return;
      }
      if (!drawing) return;
      const rect = getPreviewRect();
      if (!rect) return;
      const currentX = (e.clientX - rect.left) / rect.width;
      const currentY = (e.clientY - rect.top) / rect.height;
      setDrawing((d) => (d ? { ...d, currentX, currentY } : null));
    },
    [drawing, getPreviewRect, panStart]
  );

  const handlePreviewMouseUp = useCallback(() => {
    if (panStart) {
      setPanStart(null);
      return;
    }
    if (!drawing) return;
    const { startX, startY, currentX, currentY } = drawing;
    const x = Math.max(0, Math.min(1, Math.min(startX, currentX)));
    const y = Math.max(0, Math.min(1, Math.min(startY, currentY)));
    const w = Math.max(0.02, Math.min(1 - x, Math.abs(currentX - startX)));
    const h = Math.max(0.02, Math.min(1 - y, Math.abs(currentY - startY)));
    const style = areaStyleRef.current;
    setRedactAreas((prev) => [...prev, { pageIndex: currentPage, x, y, width: w, height: h, style }]);
    setDrawing(null);
  }, [drawing, currentPage, panStart]);

  const removeAreaByIndex = useCallback((globalIndex: number) => {
    setRedactAreas((prev) => prev.filter((_, i) => i !== globalIndex));
    setSelectedAreaIndex((s) => (s === globalIndex ? null : s !== null && s > globalIndex ? s - 1 : s));
  }, []);

  const removeLastAreaOnCurrentPage = useCallback(() => {
    setRedactAreas((prev) => {
      const idx = prev.map((a, i) => (a.pageIndex === currentPage ? i : -1)).filter((i) => i >= 0).pop();
      if (idx === undefined) return prev;
      return prev.filter((_, i) => i !== idx);
    });
    setSelectedAreaIndex(null);
  }, [currentPage]);

  const zoomIn = () => setZoom((z) => Math.min(ZOOM_MAX, ZOOM_STEPS.find((s) => s > z) ?? z + 25));
  const zoomOut = () => setZoom((z) => Math.max(ZOOM_MIN, ZOOM_STEPS.slice().reverse().find((s) => s < z) ?? z - 25));
  useEffect(() => {
    const el = previewWrapRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      setZoom((z: number) => (e.deltaY < 0 ? Math.min(ZOOM_MAX, z + 10) : Math.max(ZOOM_MIN, z - 10)));
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [file]);

  const clearFile = () => {
    setFile(null);
    reset();
  };

  const hasFile = !!file;
  const pagePreviews = file ? (previews[file.name] ?? []) : [];
  const isBuildingPreview = hasFile && pagePreviews.length === 0;
  const currentPageAreas = redactAreas.filter((a) => a.pageIndex === currentPage);
  const currentPageAreaEntries = redactAreas
    .map((a, globalIndex) => (a.pageIndex === currentPage ? { globalIndex, a } : null))
    .filter((x): x is { globalIndex: number; a: UserRedactArea } => x !== null);

  if (!hasFile) {
    return (
      <div className="w-full max-w-2xl mx-auto rounded-lg bg-white p-4 md:p-8 shadow-md dark:bg-gray-800">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-800 dark:text-white">PDF 블라인드</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">가릴 영역을 그린 뒤 검정·블러·배경색으로 가립니다. PDF를 업로드하세요.</p>
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
          <h1 className="text-lg font-bold text-gray-800 dark:text-white">PDF 블라인드</h1>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">영역을 그려 검정·블러(흐려서 읽기 불가)·배경색으로 가립니다.</p>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg text-sm">{error}</div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">파일</label>
            <div className="flex items-center gap-2 p-2 rounded-lg bg-gray-100 dark:bg-gray-700">
              <FileIcon className="h-4 w-4 flex-shrink-0 text-blue-500" />
              <span className="text-xs truncate text-gray-700 dark:text-gray-200" title={file?.name}>{file?.name}</span>
            </div>
            <button type="button" onClick={clearFile} className="mt-2 text-xs text-blue-600 dark:text-blue-400 hover:underline">파일 변경</button>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">가리기 스타일</label>
            <div className="flex gap-2 flex-wrap">
              {STYLES.map((s) => (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => handleStyleButtonClick(s.value)}
                  className={`px-3 py-1.5 rounded-lg text-sm border ${(selectedAreaIndex !== null ? redactAreas[selectedAreaIndex]?.style === s.value : areaStyle === s.value) ? 'bg-blue-600 border-blue-600 text-white' : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300'}`}
                >
                  {s.label}
                </button>
              ))}
            </div>
            {selectedAreaIndex !== null && (
              <p className="mt-1.5 text-xs text-blue-600 dark:text-blue-400">선택된 영역 스타일을 위 버튼으로 변경할 수 있습니다.</p>
            )}
          </div>
          {redactAreas.length > 0 && (
            <div className="text-xs text-gray-500 dark:text-gray-400 space-y-0.5">
              <div>{redactAreas.length}개 영역 · 박스 클릭 후 스타일 변경 · 선택된 박스는 Delete 키로 삭제</div>
              <div>옅은 검은색 테두리는 미리보기용 표시이며, 실제 다운로드된 PDF에서는 보이지 않습니다.</div>
            </div>
          )}

          <DownloadBtn
            text={isRedacting ? '처리 중...' : '블라인드 적용'}
            isLoading={isRedacting}
            disabled={!file || isRedacting || !canDownload() || redactAreas.length === 0}
            onClick={handleRedactClick}
            className="w-full"
          />
        </div>
      </aside>

      <main
        ref={scrollRef}
        className="flex-1 flex flex-col items-center min-h-0 p-6 overflow-auto bg-gray-50 dark:bg-gray-900/50 ml-80 relative"
        onMouseDown={() => setSelectedAreaIndex(null)}
      >
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

        <div className="flex items-center gap-3 mb-2 flex-wrap">
          <div className="flex items-center gap-1">
            <span className="text-sm text-gray-600 dark:text-gray-400">도구</span>
            <button
              type="button"
              onClick={() => setToolMode('draw')}
              className={`p-2 rounded border ${toolMode === 'draw' ? 'bg-blue-600 border-blue-600 text-white' : 'border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
              title="드래그로 가릴 영역 그리기"
              aria-label="영역 그리기"
            >
              <Square className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setToolMode('pan')}
              className={`p-2 rounded border ${toolMode === 'pan' ? 'bg-blue-600 border-blue-600 text-white' : 'border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
              title="이미지 드래그로 이동"
              aria-label="이동(팬)"
            >
              <Hand className="w-4 h-4" />
            </button>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">확대</span>
            <button type="button" onClick={zoomOut} className="p-2 rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700" aria-label="축소">
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="min-w-[3rem] text-sm font-medium text-gray-800 dark:text-gray-200">{zoom}%</span>
            <button type="button" onClick={zoomIn} className="p-2 rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700" aria-label="확대">
              <ZoomIn className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex flex-col items-center w-full flex-1 min-h-0">
          {pagePreviews.length > 1 && (
            <div className="flex gap-1 mb-2 flex-wrap justify-center">
              {pagePreviews.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => { setCurrentPage(i); setSelectedAreaIndex(null); }}
                  className={`w-8 h-8 rounded text-sm ${currentPage === i ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'}`}
                >
                  {i + 1}
                </button>
              ))}
            </div>
          )}
          <div
            ref={previewWrapRef}
            className="relative flex items-center justify-center min-h-[300px] w-full overflow-auto"
            onMouseDown={handlePreviewMouseDown}
            onMouseMove={handlePreviewMouseMove}
            onMouseUp={handlePreviewMouseUp}
            onMouseLeave={() => { setDrawing(null); setPanStart(null); }}
            onDoubleClick={toolMode === 'draw' ? removeLastAreaOnCurrentPage : undefined}
            style={{ cursor: toolMode === 'draw' ? 'crosshair' : 'default' }}
          >
            {pagePreviews.length > 0 ? (
              <div
                className="relative inline-block flex-shrink-0"
                style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'top center' }}
              >
                <img
                  ref={imgRef}
                  src={pagePreviews[currentPage] ?? pagePreviews[0]}
                  alt={`미리보기 ${currentPage + 1}페이지`}
                  className="block max-h-[70vh] max-w-full w-auto select-none pointer-events-none border rounded-lg shadow-lg bg-white relative z-0"
                  draggable={false}
                  crossOrigin="anonymous"
                />
                <div className="absolute inset-0 rounded-lg overflow-hidden z-20 pointer-events-none">
                  {currentPageAreaEntries.map(({ globalIndex, a }) => {
                    const isSelected = selectedAreaIndex === globalIndex;
                    const commonStyle = {
                      left: `${a.x * 100}%`,
                      top: `${a.y * 100}%`,
                      width: `${a.width * 100}%`,
                      height: `${a.height * 100}%`,
                    };
                    const borderClass = isSelected ? 'ring-2 ring-blue-500 ring-inset' : 'border border-black/30';
                    const areaProps = {
                      role: 'button' as const,
                      tabIndex: 0,
                      'aria-label': `영역 ${globalIndex + 1} 스타일: ${a.style}. 클릭 후 Delete 키로 삭제.`,
                      className: `absolute box-border pointer-events-auto ${borderClass}`,
                      style: commonStyle,
                      onClick: (e: React.MouseEvent) => {
                        e.stopPropagation();
                        setSelectedAreaIndex(globalIndex);
                      },
                      onMouseDown: (e: React.MouseEvent) => e.stopPropagation(),
                    };
                    if (a.style === 'black') {
                      return <div key={globalIndex} {...areaProps} className={`${areaProps.className} bg-black cursor-pointer`} style={{ ...commonStyle, backgroundColor: '#000' }} />;
                    }
                    if (a.style === 'blur' && currentPreviewSrc) {
                      return (
                        <div key={globalIndex} {...areaProps} className={`${areaProps.className} overflow-hidden cursor-pointer bg-gray-200`} style={{ ...commonStyle, backgroundColor: '#e5e7eb' }}>
                          <img
                            src={currentPreviewSrc}
                            alt=""
                            className="absolute select-none pointer-events-none inset-0 w-full h-full object-cover object-left-top"
                            style={{
                              width: `${(100 / a.width) * 100}%`,
                              height: `${(100 / a.height) * 100}%`,
                              left: `${(-a.x / a.width) * 100}%`,
                              top: `${(-a.y / a.height) * 100}%`,
                              filter: 'blur(24px)',
                            }}
                            draggable={false}
                          />
                        </div>
                      );
                    }
                    const bgIdx = a.style === 'background' ? currentPageAreaEntries.slice(0, currentPageAreaEntries.findIndex((e) => e.globalIndex === globalIndex)).filter((e) => e.a.style === 'background').length : 0;
                    const bgColor = a.style === 'background' ? backgroundColors[bgIdx] : undefined;
                    return (
                      <div key={globalIndex} {...areaProps} className={`${areaProps.className} cursor-pointer`} style={{ ...commonStyle, backgroundColor: bgColor?.color ?? '#e5e5e5', opacity: 1 }} />
                    );
                  })}
                  {drawing && (
                    <div
                      className="absolute border-2 border-dashed border-blue-600 bg-blue-500/30"
                      style={{
                        left: `${Math.min(drawing.startX, drawing.currentX) * 100}%`,
                        top: `${Math.min(drawing.startY, drawing.currentY) * 100}%`,
                        width: `${Math.abs(drawing.currentX - drawing.startX) * 100}%`,
                        height: `${Math.abs(drawing.currentY - drawing.startY) * 100}%`,
                      }}
                    />
                  )}
                </div>
              </div>
            ) : (
              <img src={PLACEHOLDER} alt="미리보기" className="max-h-[70vh] rounded-lg border" />
            )}
          </div>
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            {toolMode === 'draw' ? '드래그해 가릴 영역을 그리세요. 박스 클릭 후 Delete 키로 삭제.' : '손 모드: 드래그해 이미지를 이동하세요.'} 미리보기 위에서 Ctrl+휠로 확대/축소(최대 1000%).
          </p>
          {file && (
            <p className="mt-3 text-sm text-gray-500 dark:text-gray-400 truncate max-w-full" title={file.name}>{file.name}</p>
          )}
        </div>
        <input type="file" accept=".pdf" ref={fileInputRef} className="hidden" onChange={onFileChange} aria-hidden />
      </main>
    </div>
  );
}
