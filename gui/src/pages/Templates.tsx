import { useMode } from '@/context/ModeContext';
import DevTemplates from '@/pages/developer/DevTemplates';
import ResearcherTemplates from '@/pages/researcher/ResearcherTemplates';

export default function Templates() {
  const { mode } = useMode();
  if (mode === 'researcher') return <ResearcherTemplates />;
  return <DevTemplates />;
}
