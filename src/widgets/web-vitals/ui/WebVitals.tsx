'use client';

import { usePathname } from 'next/navigation';
import { onCLS, onINP, onLCP, Metric } from 'web-vitals';
import { useEffect } from 'react';

function sendToAnalytics(metric: Metric) {
  const path = window.location.pathname;
  const body = { 
    name: metric.name,
    value: metric.value,
    path: path,
    githubVersion: process.env.NEXT_PUBLIC_GIT_COMMIT_SHA,
  };

  const url = '/api/frontend-vitals';

  // Use `navigator.sendBeacon()` if available, falling back to `fetch()`
  if (navigator.sendBeacon) {
    navigator.sendBeacon(url, JSON.stringify(body));
  } else {
    fetch(url, { body: JSON.stringify(body), method: 'POST', keepalive: true });
  }
}

export function WebVitals() {
  const pathname = usePathname();

  useEffect(() => {
    onCLS(sendToAnalytics);
    onINP(sendToAnalytics);
    onLCP(sendToAnalytics);
  }, [pathname]);

  return null;
}
