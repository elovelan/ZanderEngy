'use client';

import { useState, useCallback } from 'react';

const STORAGE_KEY = 'engy:recent-dirs';
const MAX_DIRS = 10;

function readDirs(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeDirs(dirs: string[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(dirs));
  } catch {
    // ignore storage errors
  }
}

export function useRecentDirs() {
  const [dirs, setDirs] = useState<string[]>(() => readDirs());

  const addDir = useCallback((dirPath: string) => {
    setDirs((prev) => {
      const deduped = [dirPath, ...prev.filter((d) => d !== dirPath)].slice(0, MAX_DIRS);
      writeDirs(deduped);
      return deduped;
    });
  }, []);

  const removeDir = useCallback((dirPath: string) => {
    setDirs((prev) => {
      const updated = prev.filter((d) => d !== dirPath);
      writeDirs(updated);
      return updated;
    });
  }, []);

  return { dirs, addDir, removeDir };
}
