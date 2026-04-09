import { useMode } from '@/context/ModeContext';
import DevResults from '@/pages/developer/DevResults';
import ResearcherResults from '@/pages/researcher/ResearcherResults';

export default function Results() {
  const { mode } = useMode();
  if (mode === 'researcher') return <ResearcherResults />;
  return <DevResults />;
}
