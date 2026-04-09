import { useMode } from '@/context/ModeContext';
import { useNavigate } from 'react-router-dom';
import { Terminal, Microscope, Hexagon, ArrowRight } from 'lucide-react';
import { useState } from 'react';

const devTags = ['Docker', 'GPU', 'Logs', 'Metrics', 'CLI'];
const resTags = ['ALS Research', 'Visual Reports', 'Guided'];

export default function ModeSelector() {
  const { setMode } = useMode();
  const navigate = useNavigate();
  const [hovered, setHovered] = useState<'developer' | 'researcher' | null>(null);

  const select = (mode: 'developer' | 'researcher') => {
    setMode(mode);
    navigate('/dashboard');
  };

  return (
    <div className="fixed inset-0 flex overflow-hidden" style={{ background: '#080C10' }}>
      {/* Center divider */}
      <div
        className="absolute left-1/2 z-[5] w-px"
        style={{
          top: '10%',
          height: '80%',
          background: 'linear-gradient(to bottom, transparent, rgba(255,255,255,0.2), transparent)',
          opacity: 1,
          animation: 'dividerFadeIn 400ms ease-out 300ms both',
        }}
      />

      {/* Top center logo */}
      <div
        className="absolute z-10 flex items-center gap-2"
        style={{
          top: 32,
          left: '50%',
          transform: 'translateX(-50%)',
          animation: 'logoDropIn 400ms ease-out 200ms both',
          background: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(8px)',
          padding: '8px 20px',
          borderRadius: 8,
          border: '1px solid rgba(255,255,255,0.1)',
        }}
      >
        <Hexagon size={18} style={{ color: '#39D0FF' }} />
        <span className="font-display text-base font-bold tracking-tight" style={{ color: '#fff' }}>
          ModelPilot
        </span>
      </div>

      {/* Bottom center text */}
      <div
        className="absolute z-10 font-body"
        style={{
          bottom: 28,
          left: '50%',
          transform: 'translateX(-50%)',
          color: 'rgba(107, 99, 101, 0.8)',
          fontSize: 12,
          whiteSpace: 'nowrap',
          background: 'transparent',
          padding: '6px 16px',
        }}
      >
        You can switch modes anytime from the sidebar.
      </div>

      {/* LEFT HALF — Developer */}
      <button
        onClick={() => select('developer')}
        onMouseEnter={() => setHovered('developer')}
        onMouseLeave={() => setHovered(null)}
        className="relative w-1/2 h-full flex items-center justify-center cursor-pointer border-0 outline-none"
        style={{
          background: 'linear-gradient(135deg, #080C10 0%, #0A1628 50%, #080C10 100%)',
          borderRight: hovered === 'developer' ? '1px solid rgba(57,208,255,0.3)' : '1px solid transparent',
          animation: 'slideInLeft 600ms ease-out both',
        }}
      >
        {/* Grid dot pattern */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(circle, rgba(57,208,255,0.15) 1px, transparent 1px)',
            backgroundSize: '28px 28px',
            animation: 'gridFloat 20s ease infinite',
          }}
        />
        {/* Cyan orb */}
        <div
          className="absolute pointer-events-none"
          style={{
            width: 500,
            height: 500,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(57,208,255,0.12) 0%, transparent 70%)',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            filter: 'blur(40px)',
            opacity: hovered === 'developer' ? 1.4 : 1,
            transition: 'opacity 300ms ease',
          }}
        />

        {/* Content */}
        <div
          className="relative z-10 flex flex-col items-center text-center px-8 max-w-md"
          style={{
            transform: hovered === 'developer' ? 'scale(1.02)' : 'scale(1)',
            transition: 'transform 300ms ease',
          }}
        >
          <span
            className="font-display font-semibold uppercase"
            style={{
              color: '#39D0FF',
              letterSpacing: '0.2em',
              fontSize: 11,
              animation: 'contentStagger 500ms ease-out 600ms both',
            }}
          >
            Developer Mode
          </span>

          <Terminal
            size={48}
            className="mt-6"
            style={{
              color: '#39D0FF',
              filter: 'drop-shadow(0 0 12px rgba(57,208,255,0.4))',
              animation: 'contentStagger 500ms ease-out 680ms both',
            }}
          />

          <h2
            className="font-display font-bold mt-6"
            style={{
              fontSize: 36,
              color: '#fff',
              lineHeight: 1.1,
              animation: 'contentStagger 500ms ease-out 760ms both',
            }}
          >
            Built for engineers
          </h2>

          <p
            className="font-body mt-3"
            style={{
              fontSize: 14,
              color: 'rgba(255,255,255,0.5)',
              lineHeight: 1.6,
              animation: 'contentStagger 500ms ease-out 840ms both',
            }}
          >
            Full control over pipelines, metrics, logs and infrastructure.
          </p>

          {/* Tags */}
          <div
            className="flex flex-wrap justify-center gap-2 mt-6"
            style={{ animation: 'contentStagger 500ms ease-out 920ms both' }}
          >
            {devTags.map(tag => (
              <span
                key={tag}
                className="font-mono px-2.5 py-1 rounded-full"
                style={{
                  fontSize: 10,
                  border: '1px solid rgba(57,208,255,0.3)',
                  background: 'rgba(57,208,255,0.08)',
                  color: '#39D0FF',
                }}
              >
                {tag}
              </span>
            ))}
          </div>

          {/* Button */}
          <div
            className="mt-8 w-full flex justify-center"
            style={{ animation: 'contentStagger 500ms ease-out 1000ms both' }}
          >
            <span
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg font-display text-sm font-semibold transition-colors duration-200"
              style={{
                border: '1px solid #39D0FF',
                color: '#39D0FF',
                background: hovered === 'developer' ? 'rgba(57,208,255,0.1)' : 'transparent',
              }}
            >
              Enter Developer Mode <ArrowRight size={14} />
            </span>
          </div>
        </div>
      </button>

      {/* RIGHT HALF — Researcher */}
      <button
        onClick={() => select('researcher')}
        onMouseEnter={() => setHovered('researcher')}
        onMouseLeave={() => setHovered(null)}
        className="relative w-1/2 h-full flex items-center justify-center cursor-pointer border-0 outline-none"
        style={{
          background: 'linear-gradient(135deg, #F0F9FF 0%, #E0F2FE 50%, #F0F4F8 100%)',
          borderLeft: hovered === 'researcher' ? '1px solid rgba(14,165,233,0.3)' : '1px solid transparent',
          animation: 'slideInRight 600ms ease-out 100ms both',
        }}
      >
        {/* Floating circle 1 */}
        <div
          className="absolute pointer-events-none"
          style={{
            width: 400,
            height: 400,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(14,165,233,0.15) 0%, transparent 70%)',
            top: '20%',
            right: '10%',
            filter: 'blur(60px)',
          }}
        />
        {/* Floating circle 2 */}
        <div
          className="absolute pointer-events-none"
          style={{
            width: 300,
            height: 300,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(6,182,212,0.1) 0%, transparent 70%)',
            bottom: '20%',
            left: '10%',
            filter: 'blur(50px)',
          }}
        />

        {/* Content */}
        <div
          className="relative z-10 flex flex-col items-center text-center px-8 max-w-md"
          style={{
            transform: hovered === 'researcher' ? 'scale(1.02)' : 'scale(1)',
            transition: 'transform 300ms ease',
            boxShadow: hovered === 'researcher' ? '0 0 80px rgba(14,165,233,0.1)' : 'none',
            borderRadius: 24,
          }}
        >
          <span
            className="font-display font-semibold uppercase"
            style={{
              color: '#0369A1',
              letterSpacing: '0.2em',
              fontSize: 11,
              animation: 'contentStagger 500ms ease-out 700ms both',
            }}
          >
            Researcher Mode
          </span>

          <Microscope
            size={48}
            className="mt-6"
            style={{
              color: '#0EA5E9',
              animation: 'contentStagger 500ms ease-out 780ms both',
            }}
          />

          <h2
            className="font-display font-bold mt-6"
            style={{
              fontSize: 36,
              color: '#0F172A',
              lineHeight: 1.1,
              animation: 'contentStagger 500ms ease-out 860ms both',
            }}
          >
            Built for science
          </h2>

          <p
            className="font-body mt-3"
            style={{
              fontSize: 14,
              color: '#475569',
              lineHeight: 1.6,
              animation: 'contentStagger 500ms ease-out 940ms both',
            }}
          >
            Run models and view results without any technical setup.
          </p>

          {/* Tags */}
          <div
            className="flex flex-wrap justify-center gap-2 mt-6"
            style={{ animation: 'contentStagger 500ms ease-out 1020ms both' }}
          >
            {resTags.map(tag => (
              <span
                key={tag}
                className="font-body px-2.5 py-1 rounded-full"
                style={{
                  fontSize: 10,
                  border: '1px solid rgba(14,165,233,0.3)',
                  background: 'rgba(14,165,233,0.08)',
                  color: '#0369A1',
                }}
              >
                {tag}
              </span>
            ))}
          </div>

          {/* Button */}
          <div
            className="mt-8 w-full flex justify-center"
            style={{ animation: 'contentStagger 500ms ease-out 1100ms both' }}
          >
            <span
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg font-display text-sm font-semibold text-white transition-all duration-200"
              style={{
                background: 'linear-gradient(135deg, #0369A1, #0EA5E9)',
                boxShadow: hovered === 'researcher' ? '0 4px 20px rgba(14,165,233,0.3)' : 'none',
                transform: hovered === 'researcher' ? 'translateY(-1px)' : 'translateY(0)',
              }}
            >
              Enter Researcher Mode <ArrowRight size={14} />
            </span>
          </div>
        </div>
      </button>

      {/* Keyframe styles */}
      <style>{`
        @keyframes gridFloat {
          0%, 100% { background-position: 0 0; }
          50% { background-position: 14px 14px; }
        }
        @keyframes slideInLeft {
          from { transform: translateX(-20px); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideInRight {
          from { transform: translateX(20px); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes dividerFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes logoDropIn {
          from { transform: translateX(-50%) translateY(-10px); opacity: 0; }
          to { transform: translateX(-50%) translateY(0); opacity: 1; }
        }
        @keyframes contentStagger {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}