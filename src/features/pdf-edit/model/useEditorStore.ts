
import { create } from 'zustand';
import { downloadBlob } from '@/shared/lib/pdf/downloadBlob';
import { tempFileStore } from '@/shared/lib/temp-file-store';
import { useTransferSidebarStore } from '@/shared/model/useTransferSidebarStore';

// 각 페이지를 식별하고 원본 정보를 추적하기 위한 인터페이스
export interface PageRepresentation {
  id: string; // 고유 ID (예: fileId-pageIndex)
  fileId: string; // 원본 파일의 고유 ID
  fileName: string; // 원본 파일의 이름
  pageIndex: number; // 원본 파일 내에서의 0-based 인덱스
}

interface EditorState {
  files: File[]; // 여러 PDF 파일을 저장
  pages: PageRepresentation[]; // 모든 파일의 모든 페이지 목록
  isProcessing: boolean;
  error: string | null;

  addFiles: (newFiles: File[]) => Promise<void>;
  removePage: (pageId: string) => void;
  movePage: (dragIndex: number, hoverIndex: number) => void; // 드래그앤드롭으로 페이지 순서 변경
  editAndDownload: () => Promise<boolean>;
  reset: () => void;
}

const initialState: Omit<EditorState, 'addFiles' | 'removePage' | 'movePage' | 'editAndDownload' | 'reset'> = {
  files: [],
  pages: [],
  isProcessing: false,
  error: null,
};

export const useEditorStore = create<EditorState>((set, get) => ({
  ...initialState,

  addFiles: async (newFiles) => {
    const newPages: PageRepresentation[] = [];
    const newFileEntries: File[] = [...get().files];

    for (const file of newFiles) {
      const fileId = `${file.name}-${Date.now()}`;
      // 중복 파일 추가 방지
      if (get().files.some(f => f.name === file.name)) continue;

      newFileEntries.push(file);

      const formData = new FormData();
      formData.append('file', file);
      try {
        const res = await fetch('/api/pdf-preview', { method: 'POST', body: formData });
        if (!res.ok) throw new Error('페이지 정보를 가져오는데 실패했습니다.');
        const { totalPages } = await res.json();

        for (let i = 0; i < totalPages; i++) {
          newPages.push({
            id: `${fileId}-${i}`,
            fileId: fileId,
            fileName: file.name,
            pageIndex: i,
          });
        }
      } catch (e) {
        console.error(e);
        set({ error: '파일에서 페이지 정보를 읽어오는 데 실패했습니다.' });
        return;
      }
    }

    set(state => ({
      files: newFileEntries,
      pages: [...state.pages, ...newPages],
      error: null,
    }));
  },

  removePage: (pageId) => {
    set(state => ({
      pages: state.pages.filter(p => p.id !== pageId),
    }));
  },

  movePage: (dragIndex, hoverIndex) => {
    set(state => {
      const newPages = [...state.pages];
      // Swap logic
      [newPages[dragIndex], newPages[hoverIndex]] = [newPages[hoverIndex], newPages[dragIndex]];
      return { pages: newPages };
    });
  },

  editAndDownload: async () => {
    const { files, pages } = get();
    if (pages.length === 0) return false;

    set({ isProcessing: true, error: null });

    try {
      const formData = new FormData();
      const requiredFileNames = new Set(pages.map(p => p.fileName));
      const filesToUpload = files.filter(f => requiredFileNames.has(f.name));
      filesToUpload.forEach(file => formData.append('files', file));

      const pagePayload = pages.map(p => ({ fileName: p.fileName, pageIndex: p.pageIndex }));
      formData.append('pages', JSON.stringify(pagePayload));

      const response = await fetch('/api/pdf-edit-combined', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'PDF 편집에 실패했습니다.');
      }

      const blob = await response.blob();
      const newFileName = 'edited-document.pdf';
      await downloadBlob(blob, newFileName);

      // 사이드바 열기 및 파일 전달 로직 추가
      const newFile = new File([blob], newFileName, { type: 'application/pdf' });
      tempFileStore.setFile(newFile);
      useTransferSidebarStore.getState().showSidebar();

      set(initialState); // 성공 후 상태 초기화
      return true;

    } catch (e: unknown) {
      const error = e instanceof Error ? e.message : '알 수 없는 오류가 발생했습니다.';
      set({ error });
      return false;
    } finally {
      set({ isProcessing: false });
    }
  },

  reset: () => set(initialState),
}));
