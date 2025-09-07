import React from 'react';
import { File as FileIcon } from 'lucide-react';

interface PdfFileDisplayProps {
  file: File;
  previewUrl: string;
  onFileChangeClick: () => void;
  children?: React.ReactNode; // For action buttons like "Merge", "Compress"
}

export const PdfFileDisplay: React.FC<PdfFileDisplayProps> = ({
  file,
  previewUrl,
  onFileChangeClick,
  children,
}) => {
  return (
    <div className="w-full max-w-4xl rounded-lg bg-white p-8 shadow-md dark:bg-gray-800">
      {/* File Info Header */}
      <div className="flex justify-between items-center mb-4 p-3 rounded-md bg-gray-100 dark:bg-gray-700">
        <div className="flex items-center min-w-0">
          <FileIcon className="mr-2 h-5 w-5 flex-shrink-0 text-blue-500" />
          <span className="truncate text-sm font-medium text-gray-800 dark:text-gray-200">
            {file.name}
          </span>
        </div>
        <button
          onClick={onFileChangeClick}
          className="text-sm text-blue-600 hover:underline flex-shrink-0 ml-2"
        >
          파일 변경
        </button>
      </div>

      {/* Preview Image */}
      <div className="flex flex-col items-center justify-center mt-8">
        <p className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-4">
          파일 미리보기
        </p>
        <img
          src={previewUrl}
          alt={`${file.name} preview`}
          className="max-w-full h-auto max-h-96 border-2 border-gray-200 dark:border-gray-600 rounded-md shadow-sm object-contain"
        />
      </div>

      {/* Action Buttons */}
      <div className="mt-8 text-center">
        {children}
      </div>
    </div>
  );
};
