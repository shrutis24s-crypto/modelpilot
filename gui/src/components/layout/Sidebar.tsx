import { NavLink } from 'react-router-dom';
import { useMode } from '@/context/ModeContext';
import {
  LayoutDashboard,
  Box,
  Hammer,
  Play,
  GitCompare,
  FileStack,
  ArrowLeftRight,
  Hexagon,
  Home,
  FlaskConical,
  Sparkles,
  BarChart3,
  Layers,
  History,
} from 'lucide-react';

const devSections = [
  {
    label: 'WORKSPACE',
    items: [
      { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { to: '/models', label: 'Models', icon: Box },
    ],
  },
  {
    label: 'EXECUTION',
    items: [
      { to: '/build', label: 'Load & Build', icon: Hammer },
      { to: '/run', label: 'Run Model', icon: Play },
    ],
  },
  {
    label: 'ANALYSIS',
    items: [
      { to: '/past-results', label: 'Past Results', icon: History },
      { to: '/compare', label: 'Compare', icon: GitCompare },
    ],
  },
  {
    label: 'SYSTEM',
    items: [
      { to: '/templates', label: 'Templates', icon: FileStack },
    ],
  },
];

const researcherSections = [
  {
    items: [
      { to: '/dashboard', label: 'Home', icon: Home },
      { to: '/models', label: 'My Models', icon: FlaskConical },
    ],
  },
  {
    items: [
      { to: '/build', label: 'Prepare Model', icon: Sparkles },
      { to: '/run', label: 'Run Analysis', icon: Play },
    ],
  },
  {
    items: [
      { to: '/past-results', label: 'Past Analyses', icon: History },
      { to: '/compare', label: 'Compare Results', icon: BarChart3 },
    ],
  },
  {
    items: [
      { to: '/templates', label: 'Model Templates', icon: Layers },
    ],
  },
];

export function Sidebar() {
  const { mode, setMode } = useMode();
  const isDev = mode === 'developer';
  const sections = isDev ? devSections : researcherSections;

  const switchMode = () => {
    setMode(isDev ? 'researcher' : 'developer');
  };

  return (
    <aside className={`fixed left-0 top-0 h-screen w-60 flex flex-col border-r border-sidebar-border z-40 ${isDev ? 'bg-sidebar-bg' : 'bg-sidebar-bg'}`}>
      {/* Dot pattern overlay for dev */}
      {isDev && (
        <div className="absolute inset-0 sidebar-dots opacity-30 pointer-events-none" />
      )}

      {/* Logo */}
      <div className="relative px-5 py-5 flex items-center gap-2.5">
        <Hexagon size={18} className="text-primary" />
        <span className="font-display text-base font-bold tracking-tight text-foreground">
          ModelPilot
        </span>
      </div>

      {/* Nav sections */}
      <nav className="relative flex-1 px-3 mt-1 overflow-y-auto">
        {sections.map((section, si) => (
          <div key={si} className={isDev ? 'mb-4' : 'mb-2'}>
            {'label' in section && (section as any).label && (
              <span className="px-3 text-[10px] font-body font-semibold tracking-wide text-muted-foreground/50 uppercase">
                {(section as any).label}
              </span>
            )}
            <div className={`${isDev ? 'mt-1.5' : 'mt-0'} flex flex-col gap-px`}>
              {section.items.map(item => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `flex items-center gap-2.5 px-3 py-2 text-[13px] font-body font-medium transition-all duration-200 ${
                      isActive
                        ? isDev
                          ? 'text-sidebar-fg-active rounded-md'
                          : 'text-primary rounded-none rounded-r-lg'
                        : isDev
                          ? 'border-l-[3px] border-l-transparent text-sidebar-fg hover:bg-surface-2/50 rounded-md'
                          : 'text-sidebar-fg hover:bg-primary/5 rounded-lg'
                    }`
                  }
                  style={({ isActive }) =>
                    isActive
                      ? isDev
                        ? {
                            boxShadow: 'inset 3px 0 0 #39D0FF, inset 0 0 20px rgba(57,208,255,0.05)',
                            background: 'hsl(213 14% 11%)',
                          }
                        : {
                            background: 'linear-gradient(90deg, rgba(14,165,233,0.12), rgba(14,165,233,0.04))',
                            borderLeft: '3px solid #0EA5E9',
                          }
                      : {}
                  }
                >
                  <item.icon size={15} className="flex-shrink-0" />
                  {item.label}
                </NavLink>
              ))}
            </div>
            {si < sections.length - 1 && !isDev && (
              <div className="my-2 mx-3 border-t border-border/50" />
            )}
          </div>
        ))}
      </nav>

      {/* Mode switcher */}
      <div className="relative px-3 py-3 border-t border-sidebar-border">
        <button
          onClick={switchMode}
          className={`w-full flex items-center justify-center gap-2 px-3 py-2 rounded-md text-[11px] font-body font-medium transition-colors duration-150 border ${
            isDev
              ? 'border-border hover:border-primary text-muted-foreground hover:text-foreground bg-surface-2'
              : 'border-border hover:border-primary text-muted-foreground hover:text-primary bg-surface-2'
          }`}
        >
          <ArrowLeftRight size={12} />
          Switch to {isDev ? 'Researcher' : 'Developer'}
        </button>
      </div>
    </aside>
  );
}
