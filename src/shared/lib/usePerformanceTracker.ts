import { useRef, useCallback } from 'react';
import { usePathname } from 'next/navigation';

interface PerformanceMetadata {
  fileCount?: number;
  totalFileSizeInBytes?: number;
}

// This function will be responsible for sending the data.
const sendUserExperienceLog = (data: object) => {
  const url = '/api/log/user-experience';

  const body = JSON.stringify(data);

  // Use `navigator.sendBeacon()` if available for robustness.
  if (navigator.sendBeacon) {
    navigator.sendBeacon(url, body);
  } else {
    fetch(url, {
      method: 'POST',
      body: body,
      headers: { 'Content-Type': 'application/json' },
      keepalive: true,
    });
  }
};

export const usePerformanceTracker = (metricName: string) => {
  const trackingData = useRef<Map<string, { startTime: number; metadata: PerformanceMetadata }>>(new Map());
  const pathname = usePathname();

  const startTracking = useCallback((key: string, metadata: PerformanceMetadata = {}) => {
    trackingData.current.set(key, {
      startTime: performance.now(),
      metadata,
    });
  }, []);

  const endTracking = useCallback((key: string) => {
    const trackingInfo = trackingData.current.get(key);

    if (trackingInfo) {
      const endTime = performance.now();
      const durationInMs = Math.round(endTime - trackingInfo.startTime);

      sendUserExperienceLog({
        metricName,
        durationInMs,
        path: pathname,
        githubVersion: process.env.NEXT_PUBLIC_GIT_COMMIT_SHA,
        ...trackingInfo.metadata,
      });

      // Clean up the entry for this key
      trackingData.current.delete(key);
    }
  }, [metricName, pathname]);

  return { startTracking, endTracking };
};
