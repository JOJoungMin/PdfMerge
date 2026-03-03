'use client';

import { useEffect, useCallback } from 'react';
import { useTransferSidebarStore } from '@/shared/model/useTransferSidebarStore';
import { useDownloadLimitStore } from '@/shared/model/useDownloadLimitStore';
import { useRouter } from 'next/navigation';
import { X, FileUp, Shrink, ArrowRightLeft, Edit, RotateCw, Download } from 'lucide-react';
import { downloadBlob } from '@/shared/lib/pdf/downloadBlob';

export default function TransferSidebar() {
  const { isVisible, transferFile, transferSummary, closeInstantly, hideSidebar } = useTransferSidebarStore();
  const { canDownload, increment } = useDownloadLimitStore();
  const router = useRouter();

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
          {transferSummary && (
            <div className="mb-3 p-3 rounded-lg bg-white/80 dark:bg-gray-800/80 border border-blue-100 dark:border-blue-900/50">
              <p className="text-sm font-semibold text-gray-800 dark:text-white mb-1.5">{transferSummary.title}</p>
              <ul className="text-xs text-gray-600 dark:text-gray-300 space-y-0.5">
                {transferSummary.lines.map((line, i) => (
                  <li key={i}>{line}</li>
                ))}
              </ul>
            </div>
          )}
          <p className="mb-2 text-sm font-medium text-gray-800 dark:text-gray-200 truncate" title={transferFile.name}>
            {transferFile.name}
          </p>
          <button
            onClick={handleDownload}
            disabled={!canDownload()}
            className="w-full py-2.5 px-4 rounded-lg bg-blue-500 text-white font-semibold hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            <Download size={18} />
            다운로드
          </button>
        </div>
      )}

      <div className="flex flex-col space-y-3">
        <button onClick={() => handleTransfer('/merge')} className="flex items-center justify-center p-3 rounded-md bg-blue-500 text-white hover:bg-blue-600 transition-colors">
          <FileUp size={20} className="mr-2" />
          <span>PDF 병합</span>
        </button>
        <button onClick={() => handleTransfer('/compress')} className="flex items-center justify-center p-3 rounded-md bg-green-500 text-white hover:bg-green-600 transition-colors">
          <Shrink size={20} className="mr-2" />
          <span>PDF 압축</span>
        </button>
        <button onClick={() => handleTransfer('/convert')} className="flex items-center justify-center p-3 rounded-md bg-purple-500 text-white hover:bg-purple-600 transition-colors">
          <ArrowRightLeft size={20} className="mr-2" />
          <span>PDF 변환</span>
        </button>
        <button onClick={() => handleTransfer('/editor')} className="flex items-center justify-center p-3 rounded-md bg-yellow-500 text-white hover:bg-yellow-600 transition-colors">
          <Edit size={20} className="mr-2" />
          <span>PDF 편집</span>
        </button>
        <button onClick={() => handleTransfer('/rotate')} className="flex items-center justify-center p-3 rounded-md bg-indigo-500 text-white hover:bg-indigo-600 transition-colors">
          <RotateCw size={20} className="mr-2" />
          <span>PDF 회전</span>
        </button>
      </div>
    </div>
  );
}
