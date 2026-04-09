import { useMode } from '@/context/ModeContext';
import DevPastResults from '@/pages/developer/DevPastResults';
import ResearcherPastResults from '@/pages/researcher/ResearcherPastResults';

export default function PastResults() {
  const { mode } = useMode();
  if (mode === 'researcher') return <ResearcherPastResults />;
  return <DevPastResults />;
}
