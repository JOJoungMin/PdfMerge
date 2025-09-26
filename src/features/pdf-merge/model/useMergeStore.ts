import { create } from "zustand";
import { downloadBlob } from "@/shared/lib/pdf/downloadBlob";
import { tempFileStore } from "@/shared/lib/temp-file-store";
import { useTransferSidebarStore } from "@/shared/model/useTransferSidebarStore";

export interface MergedFile {
  id: string;
  file: File;
}

interface MergeState {
  files: MergedFile[];
  pageCounts: { [id: string]: number };
  isMerging: boolean;
  error: string | null;
  addFiles: (files: File[]) => void;
  removeFile: (id: string) => void;
  setPageCount: (id: string, count: number) => void;
  mergeAndDownload: (mergeFileName: string) => Promise<boolean>;
  reset: () => void;
}

const initialState: Omit<MergeState, 'addFiles' | 'removeFile' | 'setPageCount' | 'mergeAndDownload' | 'reset'> = {
    files: [],
    pageCounts: {},
    isMerging: false,
    error: null,
}

export const useMergeStore = create<MergeState>((set, get) => ({
  ...initialState,
  addFiles: (newFiles) => set((state) => {
    const newMergedFiles: MergedFile[] = newFiles.map(file => ({
      id: crypto.randomUUID(),
      file: file,
    }));
    return { files: [...state.files, ...newMergedFiles] };
  }),
  removeFile: (idToRemove) => set((state) => {
    const newFiles = state.files.filter((mf) => mf.id !== idToRemove);
    const newPageCounts = { ...state.pageCounts };
    delete newPageCounts[idToRemove];
    return { files: newFiles, pageCounts: newPageCounts };
  }),
  setPageCount: (id, count) => set(state => ({
    pageCounts: { ...state.pageCounts, [id]: count }
  })),
  mergeAndDownload: async (mergeFileName) => {
    set({ isMerging: true, error: null });
    const { files } = get();
    try {
      const formData = new FormData();
      files.forEach((mf) => {
        formData.append('files', mf.file);
      });
      formData.append('githubVersion', process.env.NEXT_PUBLIC_GIT_COMMIT_SHA || 'local');

      const response = await fetch('/api/pdf-merge', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || '병합 실패');
      }

      const mergePdfBlob = await response.blob();
      await downloadBlob(mergePdfBlob, mergeFileName);

      const newFile = new File([mergePdfBlob], mergeFileName, { type: 'application/pdf' });
      tempFileStore.setFile(newFile);
      useTransferSidebarStore.getState().showSidebar();

      set({ files: [], pageCounts: {} }); // Reset after successful merge
      return true;
    } catch (e: unknown) {
        if (e instanceof Error) {
            set({ error: e.message });
        } else {
            set({ error: '알 수 없는 오류가 발생했습니다.' });
        }
        return false;
    } finally {
      set({ isMerging: false });
    }
  },
  reset: () => set(initialState),
}));