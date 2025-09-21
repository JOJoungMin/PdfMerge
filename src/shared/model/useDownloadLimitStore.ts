import {create} from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

import { User } from "next-auth";

const ANONYMOUS_DAILY_LIMIT = 300;
const USER_DAILY_LIMIT = 100; // API와 동일하게 설정

function getTodayLocal(): string {
    return new Intl.DateTimeFormat("en-CA", {timeZone: "Asia/Seoul"}).format(new Date());
}

interface DownloadLimitState{
    count: number;
    lastReset: string;
    limit: number;
    isSyncedWithUser: boolean; // 유저 정보와 동기화되었는지 여부

  // 유틸
  resetIfNeeded: () => void;
  canDownload: () => boolean;
  remaining: () => number;

  // 액션
  increment: () => void; // 다운로드 '성공' 시 호출
  syncWithUser: (user: User | null) => void; // 유저 정보와 동기화
}

export const useDownloadLimitStore = create<DownloadLimitState>()(
    persist(
      (set, get) => ({
        count: 0,
        lastReset: getTodayLocal(),
        limit: ANONYMOUS_DAILY_LIMIT,
        isSyncedWithUser: false,
  
        resetIfNeeded: () => {
          if (get().isSyncedWithUser) return; // 유저 정보와 동기화된 경우, localStorage 기반 리셋 방지
          const today = getTodayLocal();
          if (get().lastReset !== today) {
            set({ count: 0, lastReset: today });
          }
        },
  
        canDownload: () => {
          // 유저와 동기화된 경우, 서버에서 받은 count/limit 기준
          if (get().isSyncedWithUser) {
            return get().count < get().limit;
          }
          // 비로그인 유저: 기존 로직
          const today = getTodayLocal();
          if (get().lastReset !== today) return true;
          return get().count < get().limit;
        },
  
        remaining: () => {
            if (get().isSyncedWithUser) {
                return Math.max(0, get().limit - get().count);
            }
            const today = getTodayLocal();
            if (get().lastReset !== today) return get().limit;
            return Math.max(0, get().limit - get().count);
        },
  
        increment: () => {
            // 로그인 유저는 API에서 처리하므로, 여기서는 UI 즉시 피드백만 담당
            if (get().isSyncedWithUser) {
                set((s) => ({ count: Math.min(s.count + 1, s.limit) }));
                return;
            }
            // 비로그인 유저는 localStorage 기반으로 직접 처리
            const today = getTodayLocal();
            if (get().lastReset !== today) {
                set({ count: 1, lastReset: today });
            } else {
                set((s) => ({ count: Math.min(s.count + 1, s.limit) }));
            }
        },

        syncWithUser: (user) => {
            if (user) {
              const today = getTodayLocal();
              const userLastDownloadStr = user.lastDownloadDate ? new Intl.DateTimeFormat("en-CA", {timeZone: "Asia/Seoul"}).format(new Date(user.lastDownloadDate)) : null;
              const userDownloadCount = user.downloadCount || 0;
      
              if (userLastDownloadStr === today) {
                // 마지막 다운로드가 오늘이면, DB 상태를 그대로 반영
                set({
                  count: userDownloadCount,
                  limit: USER_DAILY_LIMIT,
                  lastReset: today,
                  isSyncedWithUser: true,
                });
              } else {
                // 마지막 다운로드가 오늘이 아니면, 0으로 리셋
                set({
                  count: 0,
                  limit: USER_DAILY_LIMIT,
                  lastReset: today,
                  isSyncedWithUser: true,
                });
              }
            } else {
              // 로그아웃 시, 비로그인 상태로 전환
              const today = getTodayLocal();
              if (get().lastReset !== today) {
                set({ count: 0, limit: ANONYMOUS_DAILY_LIMIT, lastReset: today, isSyncedWithUser: false });
              } else {
                set({ limit: ANONYMOUS_DAILY_LIMIT, isSyncedWithUser: false });
              }
            }
          },
      }),
      {
        name: "download-limit", // localStorage key
        storage: createJSONStorage(() => localStorage),
        // 로그아웃/로그인 시 상태 유지를 위해 일부만 persist
        partialize: (state) => ({ count: state.count, lastReset: state.lastReset }),
      }
    )
  );