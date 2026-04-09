import { useMode } from '@/context/ModeContext';
import DevCompare from '@/pages/developer/DevCompare';
import ResearcherCompare from '@/pages/researcher/ResearcherCompare';

export default function Compare() {
  const { mode } = useMode();
  if (mode === 'researcher') return <ResearcherCompare />;
  return <DevCompare />;
}
