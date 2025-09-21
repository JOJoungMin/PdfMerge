import { create } from 'zustand';
import { tempFileStore } from '@/shared/lib/temp-file-store';

interface TransferSidebarState {
  isVisible: boolean;
  showSidebar: () => void;
  hideSidebar: () => void;
}

export const useTransferSidebarStore = create<TransferSidebarState>((set) => ({
  isVisible: false,
  showSidebar: () => set({ isVisible: true }),
  hideSidebar: () => {
    set({ isVisible: false });
    tempFileStore.setFile(null);
  },
}));
