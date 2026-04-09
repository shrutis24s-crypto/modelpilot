import { useMode } from '@/context/ModeContext';
import DevModels from '@/pages/developer/DevModels';
import ResearcherModels from '@/pages/researcher/ResearcherModels';

export default function Models() {
  const { mode } = useMode();
  if (mode === 'researcher') return <ResearcherModels />;
  return <DevModels />;
}
