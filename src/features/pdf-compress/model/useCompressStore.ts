import { create } from "zustand";
import { downloadBlob } from "@/shared/lib/pdf/downloadBlob";

interface CompressionResult {
  originalSize: number;
  compressedSize: number;
  reduction: string;
}

interface CompressState {
  file: File | null;
  isCompressing: boolean;
  error: string | null;
  quality: number;
  compressionResult: CompressionResult | null;
  
  setFile: (file: File | null) => void;
  setQuality: (quality: number) => void;
  compressAndDownload: () => Promise<boolean>;
  reset: () => void;
}

const initialState: Omit<CompressState, 'setFile' | 'setQuality' | 'compressAndDownload' | 'reset'> = {
  file: null,
  isCompressing: false,
  error: null,
  quality: 0.7,
  compressionResult: null,
};

export const useCompressStore = create<CompressState>((set, get) => ({
  ...initialState,
  
  setFile: (file) => set({ file, error: null, compressionResult: null }),
  
  setQuality: (quality) => set({ quality }),

  compressAndDownload: async () => {
    const { file, quality } = get();
    if (!file) return false;

    set({ isCompressing: true, error: null, compressionResult: null });

    const formData = new FormData();
    formData.append('file', file);
    formData.append('quality', quality.toString());

    try {
      const response = await fetch('/api/pdf-compress', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'PDF 압축에 실패했습니다.');
      }

      const blob = await response.blob();
      const originalSize = file.size;
      const compressedSize = blob.size;
      const reduction = (((originalSize - compressedSize) / originalSize) * 100).toFixed(2);

      set({ compressionResult: { originalSize, compressedSize, reduction } });
      
      await downloadBlob(blob, `compressed-${file.name}`);
      set({ file: null }); // Reset file after successful download
      return true;

    } catch (e: unknown) {
      const error = e instanceof Error ? e.message : '알 수 없는 오류가 발생했습니다.';
      set({ error });
      return false;
    } finally {
      set({ isCompressing: false });
    }
  },

  reset: () => set(initialState),
}));
