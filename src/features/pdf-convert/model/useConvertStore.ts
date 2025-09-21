import { create } from "zustand";
import { downloadBlob } from "@/shared/lib/pdf/downloadBlob";

type TargetFormat = 'png' | 'jpeg';

interface ConvertState {
  file: File | null;
  isConverting: boolean;
  error: string | null;
  targetFormat: TargetFormat;
  
  setFile: (file: File | null) => void;
  setTargetFormat: (format: TargetFormat) => void;
  convertAndDownload: () => Promise<boolean>;
  convertAndGetBlob: () => Promise<Blob | null>;
  reset: () => void;
}

const initialState: Omit<ConvertState, 'setFile' | 'setTargetFormat' | 'convertAndDownload' | 'reset' | 'convertAndGetBlob'> = {
  file: null,
  isConverting: false,
  error: null,
  targetFormat: 'png',
};

export const useConvertStore = create<ConvertState>((set, get) => ({
  ...initialState,
  
  setFile: (file) => set({ file, error: null }),
  
  setTargetFormat: (format) => set({ targetFormat: format }),

  convertAndDownload: async () => {
    const { file, targetFormat } = get();
    if (!file) return false;

    set({ isConverting: true, error: null });

    const formData = new FormData();
    formData.append('file', file);
    formData.append('targetFormat', targetFormat);

    try {
      const response = await fetch('/api/pdf-convert', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'PDF 변환에 실패했습니다.');
      }

      const blob = await response.blob();
      await downloadBlob(blob, `converted-${file.name.replace('.pdf', '')}.zip`);
      set({ file: null }); // Reset file after successful download
      return true;

    } catch (e: unknown) {
      const error = e instanceof Error ? e.message : '알 수 없는 오류가 발생했습니다.';
      set({ error });
      return false;
    } finally {
      set({ isConverting: false });
    }
  },

  convertAndGetBlob: async () => {
    const { file, targetFormat } = get();
    if (!file) return null;

    set({ isConverting: true, error: null });

    const formData = new FormData();
    formData.append('file', file);
    formData.append('targetFormat', targetFormat);

    try {
      const response = await fetch('/api/pdf-convert', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'PDF 변환에 실패했습니다.');
      }

      const blob = await response.blob();
      return blob;

    } catch (e: unknown) {
      const error = e instanceof Error ? e.message : '알 수 없는 오류가 발생했습니다.';
      set({ error });
      return null;
    } finally {
      set({ isConverting: false });
    }
  },

  reset: () => set(initialState),
}));
