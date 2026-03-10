import { create } from 'zustand';
import { API_BASE_URL } from '@/shared/api/config';

/** 가릴 영역 하나. x,y,width,height는 비율(0~1), 원점 좌상단 */
export type RedactAreaStyle = 'black' | 'blur' | 'background';
export interface UserRedactArea {
  pageIndex: number;
  x: number;
  y: number;
  width: number;
  height: number;
  style: RedactAreaStyle;
}

interface RedactState {
  file: File | null;
  isRedacting: boolean;
  error: string | null;
  setFile: (file: File | null) => void;
  redactAndGetBlob: (areas: UserRedactArea[]) => Promise<Blob | null>;
  reset: () => void;
}

const initialState = {
  file: null as File | null,
  isRedacting: false,
  error: null as string | null,
};

export const useRedactStore = create<RedactState>((set, get) => ({
  ...initialState,
  setFile: (file) => set({ file, error: null }),

  redactAndGetBlob: async (areas: UserRedactArea[]) => {
    const { file } = get();
    if (!file) return null;
    if (!areas?.length) {
      set({ error: '가릴 영역을 1개 이상 그려 주세요.' });
      return null;
    }

    set({ isRedacting: true, error: null });
    const formData = new FormData();
    formData.append('file', file);
    formData.append('redactAreas', JSON.stringify(areas));
    formData.append('githubVersion', process.env.NEXT_PUBLIC_GIT_COMMIT_SHA || 'local');

    try {
      const response = await fetch(`${API_BASE_URL}/api/pdf-redact`, {
        method: 'POST',
        body: formData,
      });
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error((errData as { message?: string }).message || '블라인드 처리에 실패했습니다.');
      }
      return await response.blob();
    } catch (e: unknown) {
      set({
        error: e instanceof Error ? e.message : '알 수 없는 오류가 발생했습니다.',
      });
      return null;
    } finally {
      set({ isRedacting: false });
    }
  },

  reset: () => set(initialState),
}));
