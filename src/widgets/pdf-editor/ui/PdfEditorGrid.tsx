
'use client';

import React, { useRef } from 'react';
import { X, UploadCloud } from 'lucide-react';
import type { PageRepresentation } from '@/features/pdf-edit/model/useEditorStore';

interface PdfEditorGridProps {
  pages: PageRepresentation[];
  previews: { [pageId: string]: string };
  removePage: (pageId: string) => void;
  movePage: (dragIndex: number, hoverIndex: number) => void;
  onAddFileClick: () => void;
  onPreviewLoad: (pageId: string) => void;
}

export const PdfEditorGrid: React.FC<PdfEditorGridProps> = ({ pages, previews, removePage, movePage, onAddFileClick, onPreviewLoad }) => {
  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    dragItem.current = index;
    e.currentTarget.style.opacity = '0.4';
  };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    dragOverItem.current = index;
  };

  const handleDragEnd = (e: React.DragEvent<HTMLDivElement>) => {
    if (dragItem.current !== null && dragOverItem.current !== null && dragItem.current !== dragOverItem.current) {
      movePage(dragItem.current, dragOverItem.current);
    }
    dragItem.current = null;
    dragOverItem.current = null;
    e.currentTarget.style.opacity = '1';
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mt-4 p-2 max-h-[70vh] overflow-y-auto">
      {/* 파일 추가 버튼 */}
      <div
        onClick={onAddFileClick}
        className="flex flex-col items-center justify-center w-full h-full min-h-[250px] border-2 border-dashed border-gray-300 rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 dark:border-gray-600 dark:bg-gray-700 dark:hover:bg-gray-600"
      >
        <UploadCloud className="w-10 h-10 mb-3 text-gray-400" />
        <p className="text-sm text-gray-500 dark:text-gray-400">
          <span className="font-semibold">파일 추가하기</span>
        </p>
      </div>

      {pages.map((page, index) => (
        <div
          key={page.id}
          className="relative border rounded-md p-1 group cursor-grab"
          draggable
          onDragStart={(e) => handleDragStart(e, index)}
          onDragEnter={(e) => handleDragEnter(e, index)}
          onDragEnd={handleDragEnd}
          onDragOver={handleDragOver}
        >
          {previews[page.id] ? (
            <img
              src={previews[page.id]}
              alt={`Page ${page.pageIndex + 1} of ${page.fileName}`}
              className="w-full h-auto object-contain rounded-md bg-gray-100 dark:bg-gray-700 aspect-[2/3]" 
              onLoad={() => onPreviewLoad(page.id)}
            />
          ) : (
            <div className="w-full h-auto bg-gray-200 dark:bg-gray-800 aspect-[2/3] flex items-center justify-center">
              <p className="text-sm text-gray-500">Loading...</p>
            </div>
          )}

          <button
            onClick={() => removePage(page.id)}
            className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10"
          >
            <X size={16} />
          </button>

          <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs text-center p-1 truncate">
            <span title={page.fileName}>{page.fileName}</span> - {page.pageIndex + 1}
          </div>
        </div>
      ))}
    </div>
  );
};
