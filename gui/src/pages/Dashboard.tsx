import { useMode } from '@/context/ModeContext';
import DevDashboard from '@/pages/developer/DevDashboard';
import ResearcherDashboard from '@/pages/researcher/ResearcherDashboard';

export default function Dashboard() {
  const { mode } = useMode();
  if (mode === 'researcher') return <ResearcherDashboard />;
  return <DevDashboard />;
}
