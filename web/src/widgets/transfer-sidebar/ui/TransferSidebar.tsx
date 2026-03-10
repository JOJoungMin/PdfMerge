'use client';

import { useEffect, useCallback, useState } from 'react';
import { useTransferSidebarStore } from '@/shared/model/useTransferSidebarStore';
import { useDownloadLimitStore } from '@/shared/model/useDownloadLimitStore';
import { useRouter, usePathname } from 'next/navigation';
import { X, FileUp, Shrink, ArrowRightLeft, Edit, RotateCw, Download, ImageIcon, Hash, Square, CheckCircle, ChevronDown } from 'lucide-react';
import { downloadBlob } from '@/shared/lib/pdf/downloadBlob';
import { formatSize } from '@/shared/lib/formatSize';

const TRANSFER_ACTIONS: { path: string; label: string; icon: React.ReactNode; className: string }[] = [
  { path: '/merge', label: 'PDF 병합', icon: <FileUp size={20} className="mr-2" />, className: 'bg-blue-500 hover:bg-blue-600' },
  { path: '/compress', label: 'PDF 압축', icon: <Shrink size={20} className="mr-2" />, className: 'bg-green-500 hover:bg-green-600' },
  { path: '/convert', label: 'PDF 변환', icon: <ArrowRightLeft size={20} className="mr-2" />, className: 'bg-purple-500 hover:bg-purple-600' },
  { path: '/editor', label: 'PDF 편집', icon: <Edit size={20} className="mr-2" />, className: 'bg-yellow-500 hover:bg-yellow-600' },
  { path: '/rotate', label: 'PDF 회전', icon: <RotateCw size={20} className="mr-2" />, className: 'bg-indigo-500 hover:bg-indigo-600' },
  { path: '/image-to-pdf', label: '이미지 PDF 변환', icon: <ImageIcon size={20} className="mr-2" />, className: 'bg-teal-500 hover:bg-teal-600' },
  { path: '/page-number', label: '페이지 번호 넣기', icon: <Hash size={20} className="mr-2" />, className: 'bg-slate-500 hover:bg-slate-600' },
  { path: '/redact', label: 'PDF 블라인드', icon: <Square size={20} className="mr-2" />, className: 'bg-amber-600 hover:bg-amber-700' },
];

const DEFAULT_VISIBLE_PATHS = ['/merge', '/compress', '/convert'];

export default function TransferSidebar() {
  const { isVisible, transferFile, transferSummary, closeInstantly, hideSidebar } = useTransferSidebarStore();
  const { canDownload, increment } = useDownloadLimitStore();
  const router = useRouter();
  const pathname = usePathname();
  const [showMoreActions, setShowMoreActions] = useState(false);

  const defaultVisibleActions = TRANSFER_ACTIONS.filter(
    (a) => DEFAULT_VISIBLE_PATHS.includes(a.path) && a.path !== pathname
  );
  const moreActions = TRANSFER_ACTIONS.filter((a) => !DEFAULT_VISIBLE_PATHS.includes(a.path));

  const handleDownload = useCallback(async () => {
    if (!transferFile || !canDownload()) return;
    await downloadBlob(transferFile, transferFile.name);
    increment();
  }, [transferFile, canDownload, increment]);

  useEffect(() => {
    return () => {
      if (isVisible) hideSidebar();
    };
  }, [isVisible, hideSidebar]);

  const handleTransfer = (path: string) => {
    hideSidebar();
    router.push(path);
  };

  return (
    <div
      className="fixed left-0 z-50 w-96 bg-blue-50 shadow-xl border-r border-blue-100 p-4 flex flex-col dark:bg-blue-950/40 dark:border-blue-900/60"
      style={{
        top: '4rem',
        bottom: 0,
        transform: isVisible ? 'translateX(0)' : 'translateX(-100%)',
        transition: closeInstantly ? 'none' : 'transform 0.3s ease-in-out',
        pointerEvents: isVisible ? 'auto' : 'none',
      }}
    >
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-gray-800 dark:text-white">다른 기능 사용하기</h2>
        <button onClick={hideSidebar} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
          <X size={24} />
        </button>
      </div>

      {transferFile && (
        <div className="mb-4">
          <div className="mb-4 p-4 rounded-xl bg-white dark:bg-gray-800/90 border border-blue-100 dark:border-blue-900/50 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle className="w-8 h-8 text-green-500 shrink-0" aria-hidden />
              <span className="text-lg font-bold text-gray-800 dark:text-white">완료</span>
            </div>
            <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate mb-0.5" title={transferFile.name}>
              {transferFile.name}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
              {formatSize(transferFile.size)}
              {transferSummary?.lines?.[1] && ` · ${transferSummary.lines[1]}`}
            </p>
            <button
              onClick={handleDownload}
              disabled={!canDownload()}
              className="w-full py-2.5 px-4 rounded-lg bg-blue-500 text-white font-semibold hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              <Download size={18} />
              다운로드
            </button>
            {transferSummary?.retry && (
              <button
                type="button"
                onClick={() => transferSummary.retry!.onRetry()}
                className="mt-2 w-full py-2 px-4 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm font-medium hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                {transferSummary.retry.label}
              </button>
            )}
          </div>
        </div>
      )}

      <div className="flex flex-col space-y-2 flex-1 min-h-0 overflow-y-auto">
        {defaultVisibleActions.length > 0 && (
          <div className="flex flex-col space-y-2">
            {defaultVisibleActions.map(({ path, label, icon, className }) => (
              <button
                key={path}
                onClick={() => handleTransfer(path)}
                className={`flex items-center justify-center p-3 rounded-md text-white transition-colors ${className}`}
              >
                {icon}
                <span>{label}</span>
              </button>
            ))}
          </div>
        )}
        {showMoreActions && (
          <div className="flex flex-col space-y-2">
            {moreActions.map(({ path, label, icon, className }) => (
              <button
                key={path}
                onClick={() => handleTransfer(path)}
                className={`flex items-center justify-center p-3 rounded-md text-white transition-colors ${className}`}
              >
                {icon}
                <span>{label}</span>
              </button>
            ))}
          </div>
        )}
        <button
          type="button"
          onClick={() => setShowMoreActions((v) => !v)}
          className="flex items-center justify-center gap-2 py-3 rounded-lg border border-blue-200 dark:border-blue-800 bg-white/60 dark:bg-gray-800/60 text-gray-700 dark:text-gray-300 font-medium hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors mt-2"
        >
          <span>{showMoreActions ? '접기' : '더 살펴보기'}</span>
          <ChevronDown size={18} className={`transition-transform ${showMoreActions ? 'rotate-180' : ''}`} />
        </button>
      </div>
    </div>
  );
}
