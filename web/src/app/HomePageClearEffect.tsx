'use client';

import { useEffect } from 'react';
import { useTransferSidebarStore } from '@/shared/model/useTransferSidebarStore';

export function HomePageClearEffect() {
  useEffect(() => {
    useTransferSidebarStore.getState().clearForHomePage();
  }, []);
  return null;
}
