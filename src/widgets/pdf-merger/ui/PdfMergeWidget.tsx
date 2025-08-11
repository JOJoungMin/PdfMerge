
"use client";

import { useState, useRef } from 'react';
import { Upload, File as FileIcon, X } from 'lucide-react';

export function PdfMergeWidget() {
  // 선택된 파일들을 File 객체 배열로 관리합니다.

  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isMerging, setIsMerging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 숨겨진 file input 엘리먼트에 접근하기 위한 ref입니다.
  const fileInputRef = useRef<HTMLInputElement>(null);



  const handleFileSelect = (files: FileList | null) => {
    console.log("확인")
    if(!files) return;
    setError(null);

    const newFiles = Array.from(files).filter(file => file.type === "application/pdf")

    setSelectedFiles(prev => [...prev, ...newFiles]);
    console.log(selectedFiles.length);
  }


  const handleRemoveFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  }

 
  const handleMergeClick = async() => {
    if(selectedFiles.length <2) return;

    setIsMerging(true);
    setError(null);

    const formData = new FormData();

    selectedFiles.forEach(file => formData.append('files', file));

    try{
        const response = await fetch('/api/pdf-merge', {
            method: 'POST',
            body: formData }        
            )
            
            if(!response.ok){
                const err = await response.json();
                throw new Error(err.error || '병합 실패');
            }
            
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'merged.pdf';

            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
            setSelectedFiles([]);


    }catch (e: any) {
        setError(e.message);
      } finally {
        setIsMerging(false);
      }

  
  }



  return (
    <div className="w-full max-w-2xl rounded-lg bg-white p-8 shadow-md dark:bg-gray-800">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-white">PDF 병합기</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">PDF 파일을 드래그하거나 클릭해서 업로드하세요.</p>
      </div>

      <div 
        className="mt-8 flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 p-12 text-center hover:border-blue-500 dark:border-gray-600 dark:hover:border-blue-400"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); handleFileSelect(e.dataTransfer.files); }}
        onClick={() => fileInputRef.current?.click()}
      >
        <Upload className="mb-2 h-10 w-10 text-gray-500" />
        <span className="font-semibold text-gray-600">파일 선택</span>
        <p className="text-sm text-gray-500">또는 파일을 여기로 드래그하세요</p>
        <input 
          type="file" 
          accept=".pdf" 
          multiple 
          ref={fileInputRef}
          className="hidden" 
          onChange={(e) => handleFileSelect(e.target.files)}
        />
      </div>

      {error && <p className="mt-4 text-center text-red-500">오류: {error}</p>}

      {selectedFiles.length > 0 && (
        <div className="mt-6">
          <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-300">선택된 파일 ({selectedFiles.length})</h2>
          <ul className="mt-2 space-y-2">
            {selectedFiles.map((file, index) => (
              <li key={index} className="flex items-center justify-between rounded-md bg-gray-100 p-3 dark:bg-gray-700">
                <div className="flex min-w-0 items-center">
                  <FileIcon className="mr-2 h-5 w-5 flex-shrink-0 text-blue-500" />
                  <span className="truncate text-sm font-medium text-gray-800 dark:text-gray-200">{file.name}</span>
                </div>
                <button onClick={() => handleRemoveFile(index)} className="ml-2 flex-shrink-0 text-gray-500 hover:text-red-500 dark:text-gray-400 dark:hover:text-red-400">
                  <X className="h-5 w-5" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-8 text-center">
        <button
          onClick={handleMergeClick}
          disabled={selectedFiles.length < 2 || isMerging}
          className="w-full rounded-lg bg-blue-600 px-8 py-3 text-lg font-semibold text-white shadow-md transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-gray-400 dark:focus:ring-offset-gray-800"
        >
          {isMerging ? '병합 중...' : `PDF 병합하기 (${selectedFiles.length}개)`}
        </button>
      </div>
    </div>
  );
}

