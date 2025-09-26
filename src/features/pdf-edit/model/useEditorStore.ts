import { create } from 'zustand';
import { downloadBlob } from '@/shared/lib/pdf/downloadBlob';
import { tempFileStore } from '@/shared/lib/temp-file-store';
import { useTransferSidebarStore } from '@/shared/model/useTransferSidebarStore';

// 각 파일을 식별하기 위한 인터페이스
export interface EditedFile {
  id: string;
  file: File;
}

// 각 페이지를 식별하고 원본 정보를 추적하기 위한 인터페이스
export interface PageRepresentation {
  id: string; // 고유 페이지 ID (예: fileId-pageIndex)
  fileId: string; // 원본 파일의 고유 ID
  fileName: string; // 원본 파일의 이름 (표시용)
  pageIndex: number; // 원본 파일 내에서의 0-based 인덱스
}

interface EditorState {
  files: EditedFile[];
  pages: PageRepresentation[];
  isProcessing: boolean;
  error: string | null;
  addFiles: (newFiles: File[]) => Promise<void>;
  removePage: (pageId: string) => void;
  movePage: (dragIndex: number, hoverIndex: number) => void;
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
    const currentFiles = get().files;
    const newFileEntries: EditedFile[] = [];

    for (const file of newFiles) {
      // 이름 기반 중복 체크 대신, 실제 파일 내용을 기반으로 하거나 다른 전략이 필요할 수 있으나
      // 현재 구조에서는 이름으로만 간단히 체크합니다. 더 정교한 방법은 추후 논의.
      if (currentFiles.some(ef => ef.file.name === file.name)) continue;

      const newFileEntry: EditedFile = { id: crypto.randomUUID(), file };
      newFileEntries.push(newFileEntry);

      const formData = new FormData();
      formData.append('file', file);
      try {
        const res = await fetch('/api/pdf-preview', { method: 'POST', body: formData });
        if (!res.ok) throw new Error('페이지 정보를 가져오는데 실패했습니다.');
        const { totalPages } = await res.json();

        for (let i = 0; i < totalPages; i++) {
          newPages.push({
            id: `${newFileEntry.id}-${i}`,
            fileId: newFileEntry.id,
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
      files: [...state.files, ...newFileEntries],
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
      const requiredFileIds = new Set(pages.map(p => p.fileId));
      const filesToUpload = files.filter(ef => requiredFileIds.has(ef.id));
      
      // FormData에 파일을 추가할 때, 각 파일에 고유한 키를 부여해야 할 수 있습니다.
      // 여기서는 백엔드가 파일 이름으로 페이지를 매핑한다고 가정하고, 파일 이름도 함께 전송합니다.
      const fileMap: { [id: string]: File } = {};
      filesToUpload.forEach(ef => {
        formData.append('files', ef.file);
        fileMap[ef.id] = ef.file;
      });

      const pagePayload = pages.map(p => ({ 
        fileName: fileMap[p.fileId].name, // 백엔드에서 파일 이름이 필요하므로 매핑
        pageIndex: p.pageIndex 
      }));
      
      formData.append('pages', JSON.stringify(pagePayload));
      formData.append('githubVersion', process.env.NEXT_PUBLIC_GIT_COMMIT_SHA || 'local');

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

      const newFile = new File([blob], newFileName, { type: 'application/pdf' });
      tempFileStore.setFile(newFile);
      useTransferSidebarStore.getState().showSidebar();

      set(initialState);
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