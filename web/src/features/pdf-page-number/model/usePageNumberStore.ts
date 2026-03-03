import { create } from 'zustand';
import { API_BASE_URL } from '@/shared/api/config';

export type PageNumberPosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right';
export type PageNumberMargin = 'narrow' | 'medium' | 'wide';
export type PageNumberTextFormat = 'number-only' | 'n-of-total';
export type PageNumberPadding = 1 | 2 | 3;

interface PageNumberState {
  file: File | null;
  isAdding: boolean;
  error: string | null;
  position: PageNumberPosition;
  margin: PageNumberMargin;
  startPage: number;
  endPage: number;
  startNumber: number;
  textFormat: PageNumberTextFormat;
  padding: PageNumberPadding;
  setFile: (file: File | null) => void;
  setPosition: (v: PageNumberPosition) => void;
  setMargin: (v: PageNumberMargin) => void;
  setStartPage: (v: number) => void;
  setEndPage: (v: number) => void;
  setStartNumber: (v: number) => void;
  setTextFormat: (v: PageNumberTextFormat) => void;
  setPadding: (v: PageNumberPadding) => void;
  addPageNumbersAndGetBlob: () => Promise<{ blob: Blob; filename: string } | null>;
  reset: () => void;
}

const defaultPosition: PageNumberPosition = 'bottom-center';
const defaultMargin: PageNumberMargin = 'medium';
const defaultTextFormat: PageNumberTextFormat = 'number-only';
const defaultPadding: PageNumberPadding = 1;

const initialState = {
  file: null as File | null,
  isAdding: false,
  error: null as string | null,
  position: defaultPosition,
  margin: defaultMargin,
  startPage: 1,
  endPage: 1,
  startNumber: 1,
  textFormat: defaultTextFormat,
  padding: defaultPadding,
};

function parseFilenameFromDisposition(disposition: string | null): string {
  if (!disposition) return 'numbered.pdf';
  const match =
    disposition.match(/filename\*=UTF-8''(.+?)(?:;|$)/i) ||
    disposition.match(/filename="?(.+?)"?(?:;|$)/i);
  if (match) {
    try {
      return decodeURIComponent(match[1].trim());
    } catch {
      return match[1].trim();
    }
  }
  return 'numbered.pdf';
}

export const usePageNumberStore = create<PageNumberState>((set, get) => ({
  ...initialState,
  setFile: (file) => set({ file, error: null }),
  setPosition: (position) => set({ position }),
  setMargin: (margin) => set({ margin }),
  setStartPage: (v) => set({ startPage: Math.max(1, v) }),
  setEndPage: (v) => set({ endPage: Math.max(1, v) }),
  setStartNumber: (v) => set({ startNumber: Math.max(1, v) }),
  setTextFormat: (textFormat) => set({ textFormat }),
  setPadding: (padding) => set({ padding }),
  reset: () => set(initialState),

  addPageNumbersAndGetBlob: async () => {
    const { file, position, margin, startPage, endPage, startNumber, textFormat, padding } = get();
    if (!file) return null;

    set({ isAdding: true, error: null });

    const formData = new FormData();
    formData.append('file', file);
    formData.append('position', position);
    formData.append('margin', margin);
    formData.append('startPage', String(startPage));
    formData.append('endPage', String(endPage));
    formData.append('startNumber', String(startNumber));
    formData.append('textFormat', textFormat);
    formData.append('padding', String(padding));

    try {
      const response = await fetch(`${API_BASE_URL}/api/pdf-page-number`, { method: 'POST', body: formData });
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        const msg = (errData as { message?: string; error?: string }).message ?? (errData as { error?: string }).error;
        throw new Error(msg || '페이지 번호 추가에 실패했습니다.');
      }
      const filename = parseFilenameFromDisposition(response.headers.get('Content-Disposition'));
      const blob = await response.blob();
      return { blob, filename };
    } catch (e: unknown) {
      set({ error: e instanceof Error ? e.message : '알 수 없는 오류가 발생했습니다.' });
      return null;
    } finally {
      set({ isAdding: false });
    }
  },
}));
