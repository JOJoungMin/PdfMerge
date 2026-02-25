import { create } from 'zustand';
import { downloadBlob } from '@/shared/lib/pdf/downloadBlob';
import { useTransferSidebarStore } from '@/shared/model/useTransferSidebarStore';
import { API_BASE_URL } from '@/shared/api/config';

export interface EditedFile {
  id: string;
  file: File;
}

export interface PageRepresentation {
  id: string;
  fileId: string;
  fileName: string;
  pageIndex: number;
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

const initialState = {
  files: [] as EditedFile[],
  pages: [] as PageRepresentation[],
  isProcessing: false,
  error: null as string | null,
};

export const useEditorStore = create<EditorState>((set, get) => ({
  ...initialState,

  addFiles: async (newFiles) => {
    const currentFiles = get().files;
    const newFileEntries: EditedFile[] = [];
    const newPages: PageRepresentation[] = [];

    for (const file of newFiles) {
      if (currentFiles.some((ef) => ef.file.name === file.name)) continue;

      const newFileEntry: EditedFile = { id: `${file.name}-${Date.now()}-${Math.random()}`, file };
      newFileEntries.push(newFileEntry);

      const formData = new FormData();
      formData.append('file', file);
      try {
        const res = await fetch(`${API_BASE_URL}/api/pdf-preview`, { method: 'POST', body: formData });
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
      } catch {
        set({ error: '파일에서 페이지 정보를 읽어오는 데 실패했습니다.' });
        return;
      }
    }

    set((state) => ({
      files: [...state.files, ...newFileEntries],
      pages: [...state.pages, ...newPages],
      error: null,
    }));
  },

  removePage: (pageId) => set((state) => ({ pages: state.pages.filter((p) => p.id !== pageId) })),

  movePage: (dragIndex, hoverIndex) =>
    set((state) => {
      const newPages = [...state.pages];
      [newPages[dragIndex], newPages[hoverIndex]] = [newPages[hoverIndex], newPages[dragIndex]];
      return { pages: newPages };
    }),

  editAndDownload: async () => {
    const { files, pages } = get();
    if (pages.length === 0) return false;

    set({ isProcessing: true, error: null });

    try {
      const formData = new FormData();
      const requiredFileIds = new Set(pages.map((p) => p.fileId));
      const filesToUpload = files.filter((ef) => requiredFileIds.has(ef.id));
      const fileIdToIndex: { [id: string]: number } = {};
      filesToUpload.forEach((ef, idx) => {
        formData.append('files', ef.file);
        fileIdToIndex[ef.id] = idx;
      });

      const pagePayload = pages.map((p) => ({ fileIndex: fileIdToIndex[p.fileId], pageIndex: p.pageIndex }));
      formData.append('pages', JSON.stringify(pagePayload));
      formData.append('githubVersion', process.env.NEXT_PUBLIC_GIT_COMMIT_SHA || 'local');

      const response = await fetch(`${API_BASE_URL}/api/pdf-edit-combined`, { method: 'POST', body: formData });
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error((errData as { error?: string }).error || 'PDF 편집에 실패했습니다.');
      }

      const blob = await response.blob();
      await downloadBlob(blob, 'edited-document.pdf');

      const newFile = new File([blob], 'edited-document.pdf', { type: 'application/pdf' });
      useTransferSidebarStore.getState().showSidebar(newFile);

      set(initialState);
      return true;
    } catch (e: unknown) {
      set({ error: e instanceof Error ? e.message : '알 수 없는 오류가 발생했습니다.' });
      return false;
    } finally {
      set({ isProcessing: false });
    }
  },

  reset: () => set(initialState),
}));
