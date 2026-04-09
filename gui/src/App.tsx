import React from 'react';
import { BrowserRouter, Route, Routes, Navigate } from 'react-router-dom';
import { ModeProvider, useMode } from '@/context/ModeContext';
import { ToastProvider } from '@/context/ToastContext';
import { RunsRefreshProvider } from '@/context/RunsRefreshContext';
import { ToastContainer } from '@/components/shared/ToastNotification';
import ModeSelector from '@/pages/ModeSelector';
import Dashboard from '@/pages/Dashboard';
import Models from '@/pages/Models';
import Build from '@/pages/Build';
import Run from '@/pages/Run';
import Results from '@/pages/Results';
import Compare from '@/pages/Compare';
import Templates from '@/pages/Templates';
import PastResults from '@/pages/PastResults';
import NotFound from '@/pages/NotFound';

function RootRedirect() {
  return <ModeSelector />;
}

function RequireMode({ children }: { children: React.ReactNode }) {
  const { mode } = useMode();
  if (!mode) return <Navigate to="/" replace />;
  return <>{children}</>;
}

const App = () => (
  <ModeProvider>
    <ToastProvider>
      <RunsRefreshProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<RootRedirect />} />
            <Route path="/dashboard" element={<RequireMode><Dashboard /></RequireMode>} />
            <Route path="/models" element={<RequireMode><Models /></RequireMode>} />
            <Route path="/build" element={<RequireMode><Build /></RequireMode>} />
            <Route path="/run" element={<RequireMode><Run /></RequireMode>} />
            <Route path="/results/:run_id" element={<RequireMode><Results /></RequireMode>} />
            <Route path="/results" element={<RequireMode><Results /></RequireMode>} />
            <Route path="/past-results" element={<RequireMode><PastResults /></RequireMode>} />
            <Route path="/compare" element={<RequireMode><Compare /></RequireMode>} />
            <Route path="/templates" element={<RequireMode><Templates /></RequireMode>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
        <ToastContainer />
      </RunsRefreshProvider>
    </ToastProvider>
  </ModeProvider>
);

export default App;
