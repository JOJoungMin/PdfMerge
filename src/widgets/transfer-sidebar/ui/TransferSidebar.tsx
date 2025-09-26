'use client';

import { useEffect } from 'react';
import { useTransferSidebarStore } from '@/shared/model/useTransferSidebarStore';
import { useRouter } from 'next/navigation';
import { X, FileUp, Shrink, ArrowRightLeft, Edit } from 'lucide-react';

export default function TransferSidebar() {
  const { isVisible, hideSidebar } = useTransferSidebarStore();
  const router = useRouter();

  useEffect(() => {
    // 이 컴포넌트가 화면에서 사라질 때(unmount) 실행되는 cleanup 함수입니다.
    return () => {
      // 사이드바가 보이는 상태였다면, hideSidebar를 호출해 파일을 정리합니다.
      if (isVisible) {
        hideSidebar();
      }
    };
  }, [isVisible, hideSidebar]);

  if (!isVisible) return null;

  const handleTransfer = (path: string) => {
    router.push(path);
  };

  const handleClose = () => {
    hideSidebar();
  };

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-80 bg-white shadow-lg p-4 flex flex-col dark:bg-gray-800">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-gray-800 dark:text-white">다른 기능 사용하기</h2>
        <button onClick={handleClose} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
          <X size={24} />
        </button>
      </div>

      <div className="flex flex-col space-y-3">
        <button
          onClick={() => handleTransfer('/merge')}
          className="flex items-center justify-center p-3 rounded-md bg-blue-500 text-white hover:bg-blue-600 transition-colors"
        >
          <FileUp size={20} className="mr-2" />
          <span>PDF 병합</span>
        </button>
        <button
          onClick={() => handleTransfer('/compress')}
          className="flex items-center justify-center p-3 rounded-md bg-green-500 text-white hover:bg-green-600 transition-colors"
        >
          <Shrink size={20} className="mr-2" />
          <span>PDF 압축</span>
        </button>
        <button
          onClick={() => handleTransfer('/convert')}
          className="flex items-center justify-center p-3 rounded-md bg-purple-500 text-white hover:bg-purple-600 transition-colors"
        >
          <ArrowRightLeft size={20} className="mr-2" />
          <span>PDF 변환</span>
        </button>
        <button
          onClick={() => handleTransfer('/editor')}
          className="flex items-center justify-center p-3 rounded-md bg-yellow-500 text-white hover:bg-yellow-600 transition-colors"
        >
          <Edit size={20} className="mr-2" />
          <span>PDF 편집</span>
        </button>
      </div>
    </div>
  );
}
