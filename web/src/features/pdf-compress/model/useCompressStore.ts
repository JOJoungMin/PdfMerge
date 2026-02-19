import { create } from "zustand";
import { API_BASE_URL } from "@/shared/api/config";

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
  compressAndGetBlob: () => Promise<Blob | null>;
  reset: () => void;
}

const initialState = {
  file: null as File | null,
  isCompressing: false,
  error: null as string | null,
  quality: 0.7,
  compressionResult: null as CompressionResult | null,
};

export const useCompressStore = create<CompressState>((set, get) => ({
  ...initialState,
  setFile: (file) => set({ file, error: null, compressionResult: null }),
  setQuality: (quality) => set({ quality }),

  compressAndGetBlob: async () => {
    const { file, quality } = get();
    if (!file) return null;

    set({ isCompressing: true, error: null, compressionResult: null });

    const formData = new FormData();
    formData.append("file", file);
    formData.append("quality", quality.toString());
    formData.append("githubVersion", process.env.NEXT_PUBLIC_GIT_COMMIT_SHA || "local");

    try {
      const response = await fetch(`${API_BASE_URL}/api/pdf-compress`, { method: "POST", body: formData });
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error((errData as { error?: string }).error || "PDF 압축에 실패했습니다.");
      }
      const blob = await response.blob();
      const originalSize = file.size;
      const compressedSize = blob.size;
      const reduction = (((originalSize - compressedSize) / originalSize) * 100).toFixed(2);
      set({ compressionResult: { originalSize, compressedSize, reduction } });
      return blob;
    } catch (e: unknown) {
      set({ error: e instanceof Error ? e.message : "알 수 없는 오류가 발생했습니다." });
      return null;
    } finally {
      set({ isCompressing: false });
    }
  },

  reset: () => set(initialState),
}));
