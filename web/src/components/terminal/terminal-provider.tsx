"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";

interface TerminalContextValue {
  collapsed: boolean;
  toggleCollapsed: () => void;
}

const TerminalContext = createContext<TerminalContextValue>({
  collapsed: false,
  toggleCollapsed: () => {},
});

export function TerminalProvider({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);

  const toggleCollapsed = useCallback(() => {
    setCollapsed((c) => !c);
  }, []);

  // Keyboard shortcut: Ctrl+` or Cmd+`
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === '`' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        toggleCollapsed();
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [toggleCollapsed]);

  return (
    <TerminalContext.Provider value={{ collapsed, toggleCollapsed }}>
      {children}
    </TerminalContext.Provider>
  );
}

export function useTerminalContext() {
  return useContext(TerminalContext);
}
