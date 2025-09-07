import { create } from "zustand";
import { downloadBlob } from "@/shared/lib/pdf/downloadBlob";

interface MergeState {
  files: File[];
  pageCounts: { [fileName: string]: number };
  isMerging: boolean;
  error: string | null;
  addFiles: (files: File[]) => void;
  removeFile: (fileName: string) => void;
  setPageCount: (fileName: string, count: number) => void;
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
  addFiles: (newFiles) => set((state) => ({ files: [...state.files, ...newFiles] })),
  removeFile: (fileNameToRemove) => set((state) => {
    const newFiles = state.files.filter((file) => file.name !== fileNameToRemove);
    const newPageCounts = { ...state.pageCounts };
    delete newPageCounts[fileNameToRemove];
    return { files: newFiles, pageCounts: newPageCounts };
  }),
  setPageCount: (fileName, count) => set(state => ({
    pageCounts: { ...state.pageCounts, [fileName]: count }
  })),
  mergeAndDownload: async (mergeFileName) => {
    set({ isMerging: true, error: null });
    const { files } = get();
    try {
      const formData = new FormData();
      files.forEach((file) => {
        formData.append('files', file);
      });

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
