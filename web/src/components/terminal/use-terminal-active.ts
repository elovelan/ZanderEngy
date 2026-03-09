'use client';

import { useState, useEffect } from 'react';

declare global {
  interface Window {
    __engy_terminal_active?: boolean;
  }
}

interface TerminalActiveDetail {
  hasActiveTab: boolean;
}

export function useTerminalActive(): boolean {
  const [hasActiveTab, setHasActiveTab] = useState(
    () => (typeof window !== 'undefined' ? window.__engy_terminal_active ?? false : false),
  );

  useEffect(() => {
    function onActiveChanged(e: Event) {
      const detail = (e as CustomEvent<TerminalActiveDetail>).detail;
      setHasActiveTab(detail.hasActiveTab);
    }

    window.addEventListener('terminal:active-changed', onActiveChanged);
    return () => window.removeEventListener('terminal:active-changed', onActiveChanged);
  }, []);

  return hasActiveTab;
}
