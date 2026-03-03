import { create } from 'zustand';
import { API_BASE_URL } from '@/shared/api/config';

interface ImageToPdfState {
  files: File[];
  isConverting: boolean;
  error: string | null;
  addFiles: (files: File[]) => void;
  removeFile: (index: number) => void;
  reset: () => void;
  convertAndGetBlob: () => Promise<{ blob: Blob; filename: string } | null>;
}

const initialState = {
  files: [] as File[],
  isConverting: false,
  error: null as string | null,
};

function parseFilenameFromDisposition(disposition: string | null): string {
  if (!disposition) return 'result.pdf';
  const match = disposition.match(/filename\*=UTF-8''(.+?)(?:;|$)/i) || disposition.match(/filename="?(.+?)"?(?:;|$)/i);
  if (match) try { return decodeURIComponent(match[1].trim()); } catch { return match[1].trim(); }
  return 'result.pdf';
}

export const useImageToPdfStore = create<ImageToPdfState>((set, get) => ({
  ...initialState,
  addFiles: (newFiles) =>
    set((state) => ({
      files: [...state.files, ...newFiles.filter((f) => ['image/jpeg', 'image/jpg', 'image/png'].includes(f.type?.toLowerCase()))],
      error: null,
    })),
  removeFile: (index) =>
    set((state) => ({
      files: state.files.filter((_, i) => i !== index),
      error: null,
    })),
  reset: () => set(initialState),

  convertAndGetBlob: async () => {
    const { files } = get();
    if (!files.length) return null;

    set({ isConverting: true, error: null });

    const formData = new FormData();
    files.forEach((f) => formData.append('files', f));
    formData.append('githubVersion', process.env.NEXT_PUBLIC_GIT_COMMIT_SHA || 'local');

    try {
      const response = await fetch(`${API_BASE_URL}/api/image-to-pdf`, { method: 'POST', body: formData });
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        const msg = (errData as { message?: string; error?: string }).message ?? (errData as { error?: string }).error;
        throw new Error(msg || '이미지 PDF 변환에 실패했습니다.');
      }
      const filename = parseFilenameFromDisposition(response.headers.get('Content-Disposition'));
      const blob = await response.blob();
      return { blob, filename };
    } catch (e: unknown) {
      set({ error: e instanceof Error ? e.message : '알 수 없는 오류가 발생했습니다.' });
      return null;
    } finally {
      set({ isConverting: false });
    }
  },
}));
