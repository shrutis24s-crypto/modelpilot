import { createContext, useContext, useState, ReactNode, useEffect } from 'react';

type Mode = 'developer' | 'researcher';

interface ModeContextType {
  mode: Mode | null;
  setMode: (mode: Mode) => void;
}

const ModeContext = createContext<ModeContextType | undefined>(undefined);

export function ModeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<Mode | null>(null);

  const setMode = (newMode: Mode) => {
    localStorage.setItem('modepilot_mode', newMode);
    setModeState(newMode);
  };

  useEffect(() => {
    const root = document.documentElement;
    if (mode === 'researcher') {
      root.classList.add('mode-researcher');
    } else {
      root.classList.remove('mode-researcher');
    }
  }, [mode]);

  return (
    <ModeContext.Provider value={{ mode, setMode }}>
      {children}
    </ModeContext.Provider>
  );
}

export function useMode() {
  const ctx = useContext(ModeContext);
  if (!ctx) throw new Error('useMode must be used within ModeProvider');
  return ctx;
}
