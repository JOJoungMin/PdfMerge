import { create } from "zustand";
import { API_BASE_URL } from "@/shared/api/config";

type TargetFormat = "png" | "jpeg";

interface ConvertState {
  file: File | null;
  isConverting: boolean;
  error: string | null;
  targetFormat: TargetFormat;
  setFile: (file: File | null) => void;
  setTargetFormat: (format: TargetFormat) => void;
  convertAndGetBlob: () => Promise<Blob | null>;
  reset: () => void;
}

const initialState = {
  file: null as File | null,
  isConverting: false,
  error: null as string | null,
  targetFormat: "png" as TargetFormat,
};

export const useConvertStore = create<ConvertState>((set, get) => ({
  ...initialState,
  setFile: (file) => set({ file, error: null }),
  setTargetFormat: (format) => set({ targetFormat: format }),

  convertAndGetBlob: async () => {
    const { file, targetFormat } = get();
    if (!file) return null;

    set({ isConverting: true, error: null });

    const formData = new FormData();
    formData.append("file", file);
    formData.append("targetFormat", targetFormat);
    formData.append("githubVersion", process.env.NEXT_PUBLIC_GIT_COMMIT_SHA || "local");

    try {
      const response = await fetch(`${API_BASE_URL}/api/pdf-convert`, { method: "POST", body: formData });
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error((errData as { error?: string }).error || "PDF 변환에 실패했습니다.");
      }
      return await response.blob();
    } catch (e: unknown) {
      set({ error: e instanceof Error ? e.message : "알 수 없는 오류가 발생했습니다." });
      return null;
    } finally {
      set({ isConverting: false });
    }
  },

  reset: () => set(initialState),
}));
