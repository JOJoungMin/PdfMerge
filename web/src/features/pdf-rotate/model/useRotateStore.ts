import { create } from "zustand";
import { API_BASE_URL } from "@/shared/api/config";

export type RotateAngle = null | 90 | 180 | 270 | 360;

interface RotateState {
  file: File | null;
  isRotating: boolean;
  error: string | null;
  angle: RotateAngle;
  pageIndex: number;
  setFile: (file: File | null) => void;
  setAngle: (angle: RotateAngle) => void;
  setPageIndex: (pageIndex: number) => void;
  rotateAndGetBlob: () => Promise<Blob | null>;
  reset: () => void;
}

const initialState = {
  file: null as File | null,
  isRotating: false,
  error: null as string | null,
  angle: null as RotateAngle,
  pageIndex: 0,
};

export const useRotateStore = create<RotateState>((set, get) => ({
  ...initialState,
  setFile: (file) => set({ file, error: null, pageIndex: 0 }),
  setAngle: (angle) => set({ angle }),
  setPageIndex: (pageIndex) => set({ pageIndex }),

  rotateAndGetBlob: async () => {
    const { file, angle, pageIndex } = get();
    if (!file) return null;

    set({ isRotating: true, error: null });

    // 0°(미선택), 360° = 회전 없음 → 원본 그대로 반환
    if (angle === null || angle === 360) {
      try {
        const blob = await file.arrayBuffer();
        return new Blob([blob], { type: "application/pdf" });
      } finally {
        set({ isRotating: false });
      }
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("angle", angle.toString());
    if (pageIndex >= 0) formData.append("pageIndex", String(pageIndex));
    formData.append("githubVersion", process.env.NEXT_PUBLIC_GIT_COMMIT_SHA || "local");

    try {
      const response = await fetch(`${API_BASE_URL}/api/pdf-rotate`, { method: "POST", body: formData });
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error((errData as { message?: string }).message || "PDF 회전에 실패했습니다.");
      }
      return await response.blob();
    } catch (e: unknown) {
      set({ error: e instanceof Error ? e.message : "알 수 없는 오류가 발생했습니다." });
      return null;
    } finally {
      set({ isRotating: false });
    }
  },

  reset: () => set(initialState),
}));
