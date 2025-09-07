'use client';
import { create } from 'zustand';
// import { PDFDocumentProxy } from 'pdfjs-dist';
// import { PDFPageProxy } from 'pdfjs-dist/types/src/display/api';
// import { PDFPageViewport } from 'pdfjs-dist/types/src/display/display_utils';
import { downloadBlob } from '@/shared/lib/pdf/downloadBlob';

interface Page {
  originalIndex: number;
}

interface EditorState {
  file: File | null;
  numPages: number;
  pages: Page[];
  isLoading: boolean;
  isProcessing: boolean;
  error: string | null;
  setFile: (file: File | null, numPages: number) => void;
  removePage: (indexToRemove: number) => void;
  movePageUp: (indexToMove: number) => void;
  movePageDown: (indexToMove: number) => void;
  editAndDownload: () => Promise<boolean>;
  reset: () => void;
}

const initialState: Omit<EditorState, 'setFile' | 'removePage' | 'movePageUp' | 'movePageDown' | 'editAndDownload' | 'reset'> = {
  file: null,
  
  numPages: 0,
  pages: [],
  isLoading: false,
  isProcessing: false,
  error: null,
};

export const useEditorStore = create<EditorState>((set, get) => ({
  ...initialState,
  setFile: (file, numPages) => set({ file, numPages }),

  removePage: (indexToRemove) => {
    set((state) => ({
      pages: state.pages.filter((_, idx) => idx !== indexToRemove),
    }));
  },

  movePageUp: (indexToMove) => {
    if (indexToMove === 0) return;
    set((state) => {
      const newPages = [...state.pages];
      [newPages[indexToMove - 1], newPages[indexToMove]] = [newPages[indexToMove], newPages[indexToMove - 1]];
      return { pages: newPages };
    });
  },

  movePageDown: (indexToMove) => {
    set((state) => {
      if (indexToMove === state.pages.length - 1) return state;
      const newPages = [...state.pages];
      [newPages[indexToMove], newPages[indexToMove + 1]] = [newPages[indexToMove + 1], newPages[indexToMove]];
      return { pages: newPages };
    });
  },

  editAndDownload: async () => {
    const { file, pages } = get();
    if (!file || pages.length === 0) return false;

    set({ isProcessing: true, error: null });

    const formData = new FormData();
    formData.append('file', file);
    const pageInstructions = pages.map(p => p.originalIndex);
    formData.append('pageInstructions', JSON.stringify(pageInstructions));

    try {
      const response = await fetch('/api/pdf-edit', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'PDF 수정에 실패했습니다.');
      }

      const blob = await response.blob();
      await downloadBlob(blob, `edited-${file.name}`);
      
      // Reset state after download
      get().reset();
      return true;

    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? `PDF를 수정하는 중 오류가 발생했습니다: ${e.message}` : '알 수 없는 오류가 발생했습니다.';
      set({ error: errorMessage });
      return false;
    } finally {
      set({ isProcessing: false });
    }
  },

  reset: () => {
    
    set(initialState);
  },
}));