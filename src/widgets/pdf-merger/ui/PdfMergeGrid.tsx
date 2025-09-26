import React from 'react';
import { X, Upload } from 'lucide-react';
import type { MergedFile } from '@/features/pdf-merge/model/useMergeStore';

interface PdfMergeGridProps {
  files: MergedFile[];
  previews: { [id: string]: string };
  pageCounts: { [id: string]: number };
  handleRemoveFile: (id: string) => void;
  onAddFileClick: () => void;
  onPreviewLoad: (id: string) => void;
}

export const PdfMergeGrid: React.FC<PdfMergeGridProps> = ({ files, previews, pageCounts, handleRemoveFile, onAddFileClick, onPreviewLoad }) => {
  return (
    <div className="mt-8">
      <div className="grid grid-cols-5 gap-3 justify-center">
        {files.map((mf) => (
          <div key={mf.id} className="flex items-start space-x-4">
            <div className="flex flex-col items-center">
              <div className="relative w-80 h-96 group">
                <img
                  src={previews[mf.id]}
                  alt={`${mf.file.name} preview`}
                  className="w-full h-full object-contain border rounded-md shadow-sm bg-gray-100 dark:bg-gray-700"
                  onLoad={() => onPreviewLoad(mf.id)}
                />
                <button
                  onClick={() => handleRemoveFile(mf.id)}
                  className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X size={64} />
                </button>
              </div>
              <div className="mt-2 text-center">
                <p
                  className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate w-80"
                  title={mf.file.name}
                >
                  {mf.file.name}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {pageCounts[mf.id] ? `${pageCounts[mf.id]}p` : '...'}
                </p>
              </div>
            </div>
          </div>
        ))}
        <div className="flex items-start space-x-4">
          <button 
            onClick={onAddFileClick}
            className="w-80 h-96 bg-gray-100 dark:bg-gray-700 rounded-md flex flex-col items-center justify-center border-2 border-dashed border-gray-300 hover:border-blue-500 dark:border-gray-600 dark:hover:border-blue-400"
          >
            <Upload className="mb-2 h-12 w-12 text-gray-500" />
            <span className="font-semibold text-gray-600">파일 추가</span>
            <p className="text-sm text-gray-500">또는 파일을 여기로 드래그하세요</p>
          </button>
        </div>
      </div>
    </div>
  );
};
