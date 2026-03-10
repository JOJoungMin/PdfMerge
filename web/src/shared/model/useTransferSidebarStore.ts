import { create } from 'zustand';

export interface TransferSummary {
  title: string;
  lines: string[];
  /** 예: 블라인드 적용 후 "다시 시도하기" → 이전 단계로 */
  retry?: { label: string; onRetry: () => void };
}

interface TransferSidebarState {
  isVisible: boolean;
  transferFile: File | null;
  transferSummary: TransferSummary | null;
  closeInstantly: boolean;
  showSidebar: (file?: File, summary?: TransferSummary | null) => void;
  hideSidebar: () => void;
  clearForHomePage: () => void;
  getAndClearTransferFile: () => File | null;
}

export const useTransferSidebarStore = create<TransferSidebarState>((set, get) => ({
  isVisible: false,
  transferFile: null,
  transferSummary: null,
  closeInstantly: false,
  showSidebar: (file, summary) =>
    set({
      isVisible: true,
      transferFile: file ?? null,
      transferSummary: summary ?? null,
      closeInstantly: false,
    }),
  hideSidebar: () => set({ isVisible: false, closeInstantly: false }),
  clearForHomePage: () => set({ isVisible: false, transferFile: null, transferSummary: null, closeInstantly: true }),
  getAndClearTransferFile: () => {
    const file = get().transferFile;
    set({ transferFile: null, transferSummary: null });
    return file;
  },
}));
