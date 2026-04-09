import { useMode } from '@/context/ModeContext';
import DevBuild from '@/pages/developer/DevBuild';
import ResearcherBuild from '@/pages/researcher/ResearcherBuild';

export default function Build() {
  const { mode } = useMode();
  if (mode === 'researcher') return <ResearcherBuild />;
  return <DevBuild />;
}
