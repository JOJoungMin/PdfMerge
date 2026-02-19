import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

const ANONYMOUS_DAILY_LIMIT = 300;

function getTodayLocal(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(new Date());
}

interface DownloadLimitState {
  count: number;
  lastReset: string;
  limit: number;
  resetIfNeeded: () => void;
  canDownload: () => boolean;
  remaining: () => number;
  increment: () => void;
}

export const useDownloadLimitStore = create<DownloadLimitState>()(
  persist(
    (set, get) => ({
      count: 0,
      lastReset: getTodayLocal(),
      limit: ANONYMOUS_DAILY_LIMIT,

      resetIfNeeded: () => {
        const today = getTodayLocal();
        if (get().lastReset !== today) {
          set({ count: 0, lastReset: today });
        }
      },

      canDownload: () => {
        const today = getTodayLocal();
        if (get().lastReset !== today) return true;
        return get().count < get().limit;
      },

      remaining: () => {
        const today = getTodayLocal();
        if (get().lastReset !== today) return get().limit;
        return Math.max(0, get().limit - get().count);
      },

      increment: () => {
        const today = getTodayLocal();
        if (get().lastReset !== today) {
          set({ count: 1, lastReset: today });
        } else {
          set((s) => ({ count: Math.min(s.count + 1, s.limit) }));
        }
      },
    }),
    {
      name: "download-limit",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ count: state.count, lastReset: state.lastReset }),
    }
  )
);
