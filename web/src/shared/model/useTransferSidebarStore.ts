import { create } from 'zustand';

interface TransferSidebarState {
  isVisible: boolean;
  transferFile: File | null;
  closeInstantly: boolean;
  showSidebar: (file?: File) => void;
  hideSidebar: () => void;
  clearForHomePage: () => void;
  getAndClearTransferFile: () => File | null;
}

export const useTransferSidebarStore = create<TransferSidebarState>((set, get) => ({
  isVisible: false,
  transferFile: null,
  closeInstantly: false,
  showSidebar: (file) => set({ isVisible: true, transferFile: file ?? null, closeInstantly: false }),
  hideSidebar: () => set({ isVisible: false, closeInstantly: false }),
  clearForHomePage: () => set({ isVisible: false, transferFile: null, closeInstantly: true }),
  getAndClearTransferFile: () => {
    const file = get().transferFile;
    set({ transferFile: null });
    return file;
  },
}));
