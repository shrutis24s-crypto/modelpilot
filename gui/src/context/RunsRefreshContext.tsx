import { createContext, useContext, useState, useCallback } from 'react';

const RunsRefreshContext = createContext<{ 
  refreshKey: number; 
  triggerRefresh: () => void 
}>({ refreshKey: 0, triggerRefresh: () => {} });

export function RunsRefreshProvider({ children }: { children: React.ReactNode }) {
  const [refreshKey, setRefreshKey] = useState(0);
  const triggerRefresh = useCallback(() => setRefreshKey(k => k + 1), []);
  return (
    <RunsRefreshContext.Provider value={{ refreshKey, triggerRefresh }}>
      {children}
    </RunsRefreshContext.Provider>
  );
}

export const useRunsRefresh = () => useContext(RunsRefreshContext);
