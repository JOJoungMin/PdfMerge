'use client';

import { useEffect, useState, useCallback } from 'react';
import { useTransferSidebarStore } from '@/shared/model/useTransferSidebarStore';
import { File as FileIcon } from 'lucide-react';
import { API_BASE_URL } from '@/shared/api/config';

export default function ResultCenterPreview() {
  const { isVisible, transferFile } = useTransferSidebarStore();
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const fetchPreview = useCallback(async (file: File) => {
    if (file.type !== 'application/pdf') return;
    const formData = new FormData();
    formData.append('file', file);
    formData.append('firstPage', '1');
    formData.append('lastPage', '1');
    try {
      const res = await fetch(`${API_BASE_URL}/api/pdf-preview`, { method: 'POST', body: formData });
      if (!res.ok) return;
      const data = await res.json();
      if (data.previews?.[0]) setPreviewUrl(data.previews[0]);
    } catch {}
  }, []);

  useEffect(() => {
    if (transferFile?.type === 'application/pdf') {
      setPreviewUrl(null);
      fetchPreview(transferFile);
    } else {
      setPreviewUrl(null);
    }
  }, [transferFile, fetchPreview]);

  if (!isVisible || !transferFile) return null;

  return (
    <div
      className="fixed z-40 flex items-center justify-center bg-gray-200/95 dark:bg-gray-950/95 backdrop-blur-sm border-l border-gray-300 dark:border-gray-600"
      style={{
        left: '24rem',
        top: '4rem',
        right: 0,
        bottom: 0,
      }}
    >
      <div className="flex flex-col items-center gap-4 max-w-4xl w-full px-8">
        {transferFile.type === 'application/pdf' && previewUrl ? (
          <img
            src={previewUrl}
            alt="미리보기"
            className="max-h-[80vh] max-w-full object-contain rounded-lg shadow-2xl bg-white border border-gray-200 dark:border-gray-600"
          />
        ) : transferFile.type === 'application/pdf' ? (
          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-gray-500 dark:text-gray-400">미리보기 준비 중...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-4 p-12 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400">
            <FileIcon className="w-24 h-24" />
            <span className="text-lg font-medium">ZIP 파일</span>
          </div>
        )}
        <p className="text-base font-medium text-gray-700 dark:text-gray-300 truncate max-w-full" title={transferFile.name}>
          {transferFile.name}
        </p>
      </div>
    </div>
  );
}
