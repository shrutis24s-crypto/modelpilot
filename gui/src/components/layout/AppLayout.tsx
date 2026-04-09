import { ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { useMode } from '@/context/ModeContext';

export function AppLayout({ children }: { children: ReactNode }) {
  const { mode } = useMode();
  const isDev = mode === 'developer';

  return (
    <div className={`min-h-screen ${isDev ? 'dev-bg-gradient scanlines' : 'bg-background'}`}>
      <Sidebar />
      <main className={`ml-60 px-10 py-8 ${isDev ? 'page-enter-dev' : 'page-enter-res'}`}>
        {isDev ? (
          children
        ) : (
          <div className="relative">
            <div className="fixed inset-0 ml-60 dot-grid-pattern pointer-events-none" />
            <div className="relative z-10">{children}</div>
          </div>
        )}
      </main>
    </div>
  );
}
