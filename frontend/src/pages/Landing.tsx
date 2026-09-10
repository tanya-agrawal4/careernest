import { useNavigate } from 'react-router-dom';
import { GraduationCap, Briefcase, Sparkles, ArrowRight, CheckCircle2, Shield, Zap, Users } from 'lucide-react';

// =============================================================================
// Landing Page — White × Indigo Editorial Split-Pane
// =============================================================================
// REDESIGN: Pure white background. Single Indigo (#4f46e5) accent.
// Hero heading: Playfair Display (serif) — editorial warmth.
// Body / UI text: Inter (clean sans-serif).
// Layout: Asymmetric two-column grid — left hero text, right floating panels.
// All routing logic, links, and IDs are UNCHANGED.
// =============================================================================

export default function Landing() {
  const navigate = useNavigate();

  return (
    <>
      {/* ── Google Fonts: Playfair Display + Inter ────────────────────────── */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;0,800;0,900;1,800&family=Inter:wght@300;400;500;600;700;800&display=swap');

        .landing-root {
          font-family: 'Inter', system-ui, sans-serif;
        }
        .heading-serif {
          font-family: 'Playfair Display', Georgia, serif;
          font-weight: 900;
          line-height: 1.08;
          letter-spacing: -0.02em;
        }
        .gradient-text-indigo {
          background: linear-gradient(135deg, #4f46e5 0%, #818cf8 60%, #a5b4fc 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        /* ── Buttons ── */
        .btn-indigo-solid {
          background: #4f46e5;
          color: #ffffff;
          box-shadow: 0 4px 18px rgba(79, 70, 229, 0.32);
          transition: all 0.18s ease;
          font-family: 'Inter', sans-serif;
        }
        .btn-indigo-solid:hover {
          background: #4338ca;
          box-shadow: 0 6px 24px rgba(79, 70, 229, 0.45);
          transform: translateY(-1px);
        }
        .btn-indigo-solid:active { transform: scale(0.98); }

        .btn-indigo-outline {
          background: rgba(79, 70, 229, 0.06);
          color: #4f46e5;
          border: 1.5px solid rgba(79, 70, 229, 0.3);
          transition: all 0.18s ease;
          font-family: 'Inter', sans-serif;
        }
        .btn-indigo-outline:hover {
          background: rgba(79, 70, 229, 0.1);
          border-color: #4f46e5;
          box-shadow: 0 0 0 3px rgba(79,70,229,0.1);
        }
        .btn-indigo-outline:active { transform: scale(0.98); }

        /* ── Feature cards (right panel) ── */
        .feature-card {
          background: #ffffff;
          border: 1px solid #e5e7eb;
          border-radius: 1rem;
          transition: box-shadow 0.2s ease, border-color 0.2s ease, transform 0.2s ease;
        }
        .feature-card:hover {
          box-shadow: 0 8px 28px rgba(79, 70, 229, 0.1);
          border-color: rgba(79, 70, 229, 0.25);
          transform: translateX(-4px);
        }

        /* ── Stats panel ── */
        .stats-panel {
          background: linear-gradient(135deg, #4f46e5 0%, #6366f1 100%);
          border-radius: 1.25rem;
          box-shadow: 0 12px 40px rgba(79, 70, 229, 0.3);
        }

        /* ── AI badge ── */
        .ai-badge {
          background: rgba(79, 70, 229, 0.08);
          border: 1px solid rgba(79, 70, 229, 0.22);
          color: #4f46e5;
        }

        /* ── Dot grid (subtle indigo) ── */
        .dot-grid-indigo {
          background-image: radial-gradient(circle, rgba(79,70,229,0.09) 1px, transparent 1px);
          background-size: 26px 26px;
        }

        /* ── Right column line decoration ── */
        .line-decoration {
          position: absolute;
          top: 0; left: 0; bottom: 0;
          width: 1px;
          background: linear-gradient(180deg, transparent, rgba(79,70,229,0.2) 30%, rgba(79,70,229,0.2) 70%, transparent);
        }

        /* ── Stagger animation ── */
        @keyframes stagger-in {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .stagger-1 { animation: stagger-in 0.5s ease 0.05s both; }
        .stagger-2 { animation: stagger-in 0.5s ease 0.15s both; }
        .stagger-3 { animation: stagger-in 0.5s ease 0.25s both; }
        .stagger-4 { animation: stagger-in 0.5s ease 0.35s both; }
        .stagger-5 { animation: stagger-in 0.5s ease 0.45s both; }
        .stagger-6 { animation: stagger-in 0.5s ease 0.55s both; }
      `}</style>

      <div className="landing-root min-h-[calc(100vh-4rem)] w-full relative overflow-hidden"
           style={{ background: '#ffffff' }}>

        {/* ── Dot-grid background ─────────────────────────────────────────── */}
        <div className="absolute inset-0 pointer-events-none dot-grid-indigo" style={{ opacity: 0.7 }} />

        {/* ── Ambient gradient blobs ──────────────────────────────────────── */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div
            className="absolute -top-60 -right-60 w-[700px] h-[700px] rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(79,70,229,0.07) 0%, transparent 65%)', filter: 'blur(60px)' }}
          />
          <div
            className="absolute -bottom-60 -left-40 w-[600px] h-[600px] rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(129,140,248,0.06) 0%, transparent 65%)', filter: 'blur(60px)' }}
          />
        </div>

        {/* ── Main split-pane grid ────────────────────────────────────────── */}
        <div className="relative z-10 max-w-7xl mx-auto px-4 md:px-8 min-h-[calc(100vh-4rem)] flex items-center">
          <div className="w-full grid grid-cols-1 lg:grid-cols-[1fr_420px] xl:grid-cols-[1fr_460px] gap-12 xl:gap-20 py-16 lg:py-20">

            {/* ═══════════════════════════════════════════════════════════════
                LEFT COLUMN — Hero text + CTAs
            ═══════════════════════════════════════════════════════════════ */}
            <div className="flex flex-col justify-center">

              {/* AI badge */}
              <div className="stagger-1 inline-flex items-center gap-2 ai-badge rounded-full px-4 py-1.5 mb-8 text-xs font-semibold tracking-wide w-fit">
                <Sparkles size={12} />
                AI-Powered Placement Platform
              </div>

              {/* Main headline — Playfair Display serif */}
              <h1 className="heading-serif stagger-2 text-5xl sm:text-6xl xl:text-7xl mb-6" style={{ color: '#0f0f11' }}>
                Your Pathway
                <br />
                to{' '}
                <span className="gradient-text-indigo italic">Dream Careers</span>
              </h1>

              {/* Subtitle */}
              <p className="stagger-3 text-lg sm:text-xl max-w-xl mb-3 leading-relaxed font-normal"
                 style={{ color: '#6b7280' }}>
                CareerNest connects students to their ideal roles using a{' '}
                <span style={{ color: '#4f46e5', fontWeight: 600 }}>Hybrid AI Scoring Engine</span>
                {' '}— analysing skills, CGPA, and experience in milliseconds.
              </p>
              <p className="stagger-3 text-xs tracking-widest uppercase mb-10 font-medium"
                 style={{ color: '#9ca3af' }}>
                Trusted by universities and top recruiters
              </p>

              {/* CTA buttons */}
              <div className="stagger-4 flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-8">
                <button
                  onClick={() => navigate('/auth')}
                  className="group btn-indigo-solid flex items-center justify-center gap-3
                             font-bold text-base px-8 py-4 rounded-xl w-full sm:w-auto"
                >
                  <GraduationCap size={20} />
                  I am a Student
                  <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                </button>

                <button
                  onClick={() => navigate('/auth')}
                  className="group btn-indigo-outline flex items-center justify-center gap-3
                             font-bold text-base px-8 py-4 rounded-xl w-full sm:w-auto"
                >
                  <Briefcase size={20} />
                  I am a Recruiter
                  <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                </button>
              </div>

              {/* Admin Link */}
              <div className="stagger-5">
                <button
                  onClick={() => navigate('/auth')}
                  className="inline-flex items-center gap-1.5 text-sm transition-colors cursor-pointer font-medium"
                  style={{ color: '#9ca3af' }}
                  onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = '#4f46e5')}
                  onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = '#9ca3af')}
                >
                  <Shield size={13} />
                  Placement Cell?{' '}
                  <span style={{ textDecoration: 'underline', textUnderlineOffset: '4px' }}>Admin Login</span>
                </button>
              </div>

              {/* Horizontal stats strip (mobile/left) */}
              <div className="stagger-6 mt-12 hidden sm:flex lg:hidden items-center gap-8">
                {[
                  { value: '<50ms',   label: 'AI Match Latency' },
                  { value: '3 Roles', label: 'Student · Recruiter · Admin' },
                  { value: '100%',    label: 'Free Platform' },
                ].map(({ value, label }, i) => (
                  <div key={label} className={`flex flex-col ${i > 0 ? 'pl-8 border-l border-[#e5e7eb]' : ''}`}>
                    <span className="text-xl font-black" style={{ color: '#4f46e5' }}>{value}</span>
                    <span className="text-xs text-[#9ca3af] mt-0.5 font-medium">{label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* ═══════════════════════════════════════════════════════════════
                RIGHT COLUMN — Floating panels
            ═══════════════════════════════════════════════════════════════ */}
            <div className="relative hidden lg:flex flex-col gap-5 justify-center">

              {/* Vertical line decoration */}
              <div className="line-decoration" />

              {/* Stats panel (Indigo card) */}
              <div className="stagger-2 stats-panel p-6 ml-8 animate-float">
                <p className="text-xs font-semibold tracking-widest uppercase text-indigo-200 mb-4"
                   style={{ color: 'rgba(255,255,255,0.6)' }}>
                  Platform at a glance
                </p>
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { value: '<50ms',   label: 'AI Latency' },
                    { value: '3',       label: 'Roles' },
                    { value: '100%',    label: 'Free' },
                  ].map(({ value, label }) => (
                    <div key={label} className="text-center">
                      <p className="text-2xl font-black text-white">{value}</p>
                      <p className="text-xs mt-0.5 font-medium" style={{ color: 'rgba(255,255,255,0.6)' }}>{label}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Feature cards */}
              {[
                {
                  icon: <Sparkles size={16} style={{ color: '#4f46e5' }} />,
                  title: 'AI Skill Matching',
                  desc: 'LLM-powered skill extraction & scoring engine',
                  delay: 'stagger-3',
                },
                {
                  icon: <Zap size={16} style={{ color: '#4f46e5' }} />,
                  title: 'Instant ATS Ranking',
                  desc: 'AI-ranked applicant tracking for recruiters',
                  delay: 'stagger-4',
                },
                {
                  icon: <CheckCircle2 size={16} style={{ color: '#4f46e5' }} />,
                  title: 'Skill Gap Analysis',
                  desc: 'Actionable feedback with matched vs. missing skills',
                  delay: 'stagger-5',
                },
                {
                  icon: <Users size={16} style={{ color: '#4f46e5' }} />,
                  title: 'Multi-Role Platform',
                  desc: 'Student, Recruiter & Admin — one unified system',
                  delay: 'stagger-6',
                },
              ].map(({ icon, title, desc, delay }) => (
                <div
                  key={title}
                  className={`${delay} feature-card flex items-start gap-4 p-4 ml-8`}
                >
                  <div
                    className="w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center mt-0.5"
                    style={{ background: 'rgba(79,70,229,0.08)', border: '1px solid rgba(79,70,229,0.15)' }}
                  >
                    {icon}
                  </div>
                  <div>
                    <p className="font-semibold text-sm" style={{ color: '#111827' }}>{title}</p>
                    <p className="text-xs mt-0.5 leading-snug" style={{ color: '#9ca3af' }}>{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Mobile feature cards (below fold on small screens) ─────────── */}
        <div className="lg:hidden relative z-10 max-w-7xl mx-auto px-4 md:px-8 pb-16">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              {
                icon: <Sparkles size={18} style={{ color: '#4f46e5' }} />,
                title: 'AI Skill Matching',
                desc:  'LLM-powered skill extraction & scoring engine',
              },
              {
                icon: <GraduationCap size={18} style={{ color: '#4f46e5' }} />,
                title: 'Student First',
                desc:  'Skill gap analysis with actionable feedback',
              },
              {
                icon: <CheckCircle2 size={18} style={{ color: '#4f46e5' }} />,
                title: 'Real-time ATS',
                desc:  'AI-ranked applicant tracking for recruiters',
              },
            ].map(({ icon, title, desc }) => (
              <div
                key={title}
                className="feature-card flex flex-col items-center gap-3 p-5 text-center"
              >
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center"
                  style={{ background: 'rgba(79,70,229,0.08)', border: '1px solid rgba(79,70,229,0.15)' }}
                >
                  {icon}
                </div>
                <div>
                  <p className="font-semibold text-sm" style={{ color: '#111827' }}>{title}</p>
                  <p className="text-xs mt-0.5 leading-snug" style={{ color: '#9ca3af' }}>{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}