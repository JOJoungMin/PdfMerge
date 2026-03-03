'use client';

import { useMergeStore } from '@/features/pdf-merge/model/useMergeStore';
import { useCompressStore } from '@/features/pdf-compress/model/useCompressStore';
import { useConvertStore } from '@/features/pdf-convert/model/useConvertStore';
import { useRotateStore } from '@/features/pdf-rotate/model/useRotateStore';
import { useEditorStore } from '@/features/pdf-edit/model/useEditorStore';

export default function DownloadLoadingOverlay() {
  const isMerging = useMergeStore((s) => s.isMerging);
  const isCompressing = useCompressStore((s) => s.isCompressing);
  const isConverting = useConvertStore((s) => s.isConverting);
  const isRotating = useRotateStore((s) => s.isRotating);
  const isProcessing = useEditorStore((s) => s.isProcessing);

  const isLoading = isMerging || isCompressing || isConverting || isRotating || isProcessing;
  if (!isLoading) return null;

  return (
    <>
      {/* 네비바(4rem) 아래, 좌측 사이드바(16rem) 오른쪽 영역만 덮음 - nav와 aside는 제외 */}
      <div
        className="fixed z-40 backdrop-blur-sm bg-black/20 dark:bg-black/30"
        style={{
          top: '4rem',
          left: '16rem',
          right: 0,
          bottom: 0,
        }}
        aria-hidden="true"
      />
      {/* 로딩 스피너 - 화면 중앙 (덮는 영역 기준) */}
      <div
        className="fixed z-50 flex items-center justify-center"
        style={{
          top: '4rem',
          left: '16rem',
          right: 0,
          bottom: 0,
          pointerEvents: 'none',
        }}
      >
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">처리 중...</p>
        </div>
      </div>
    </>
  );
}
