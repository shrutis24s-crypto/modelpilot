import { useMode } from '@/context/ModeContext';
import DevRun from '@/pages/developer/DevRun';
import ResearcherRun from '@/pages/researcher/ResearcherRun';

export default function Run() {
  const { mode } = useMode();
  if (mode === 'researcher') return <ResearcherRun />;
  return <DevRun />;
}
