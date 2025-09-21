import React from 'react';
import { X } from 'lucide-react';
import { Upload } from 'lucide-react';

interface PdfMergeGridProps {
  files: File[];
  previews: { [fileName: string]: string };
  pageCounts: { [fileName: string]: number };
  handleRemoveFile: (fileName: string) => void;
  onAddFileClick: () => void;
}

export const PdfMergeGrid: React.FC<PdfMergeGridProps> = ({ files, previews, pageCounts, handleRemoveFile, onAddFileClick }) => {
  return (
    <div className="mt-8">
      <div className="grid grid-cols-5 gap-3 justify-center">
        {files.map((file, index) => (
          <div key={file.name + index} className="flex items-start space-x-4">
            {/* Image + Text Group */}
            <div className="flex flex-col items-center">
              {/* 미리보기 썸네일 */}
              <div className="relative w-80 h-96 group">
             
                <img
                  src={previews[file.name]}
                  alt={`${file.name} preview`}
                  className="w-full h-full object-contain border rounded-md shadow-sm bg-gray-100 dark:bg-gray-700"
                />
                <button
                  onClick={() => handleRemoveFile(file.name)}
                  className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X size={64} />
                </button>
              </div>
              {/* 파일 이름 + 페이지 수 */}
              <div className="mt-2 text-center">
                <p
                  className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate w-80"
                  title={file.name}
                >
                  {file.name}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {pageCounts[file.name] ? `${pageCounts[file.name]}p` : '...'}
                </p>
              </div>
            </div>
          </div>
        ))}
        {/* 새 파일 추가 버튼을 map 밖으로 옮김 */}
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