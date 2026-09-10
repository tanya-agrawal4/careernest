import { useState } from 'react';
import { Link, useNavigate, Outlet, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import {
  GraduationCap, Briefcase, LayoutDashboard, LogOut,
  Menu, X, LogIn, UserPlus, Shield
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { cn } from '../lib/cn';
import ProfilePanel from './ProfilePanel';

/**
 * Global application shell component.
 * Provides the top navigation bar, responsive drawer, toast notifications, and
 * role-based dynamic routing links (Student vs Recruiter vs Admin).
 *
 * REDESIGN: White × Indigo minimal editorial theme.
 * All routing logic, auth checks, and logout behaviour are UNCHANGED.
 */

interface NavLink {
  label: string;
  to:    string;
  icon:  React.ReactNode;
}

export default function Layout() {
  const { isAuth, user, logout } = useAuthStore();
  const navigate          = useNavigate();
  const location          = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const isStudent   = user?.role === 'STUDENT';
  const isRecruiter = user?.role === 'RECRUITER';
  const isAdmin     = user?.role === 'ADMIN';

  const navLinks: NavLink[] = isStudent
    ? [{ label: 'Dashboard', to: '/student',   icon: <LayoutDashboard size={15} /> }]
    : isRecruiter
    ? [{ label: 'Dashboard', to: '/recruiter', icon: <LayoutDashboard size={15} /> }]
    : isAdmin
    ? [{ label: 'Dashboard', to: '/admin',     icon: <LayoutDashboard size={15} /> }]
    : [];

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const roleMeta = isStudent
    ? { label: 'Student',   icon: <GraduationCap size={13} />, cls: 'text-[#4f46e5] border-[rgba(79,70,229,0.25)] bg-[rgba(79,70,229,0.07)]' }
    : isRecruiter
    ? { label: 'Recruiter', icon: <Briefcase size={13} />,     cls: 'text-[#059669] border-[rgba(5,150,105,0.25)] bg-[rgba(5,150,105,0.07)]' }
    : isAdmin
    ? { label: 'Admin',     icon: <Shield size={13} />,        cls: 'text-[#7c3aed] border-[rgba(124,58,237,0.25)] bg-[rgba(124,58,237,0.07)]' }
    : null;

  return (
    <div className="w-full min-h-full flex flex-col" style={{ background: '#ffffff' }}>
      {/* ── Toast provider ─────────────────────────────────────────────────── */}
      <Toaster
        position="top-center"
        toastOptions={{
          duration: 4000,
          style: {
            background:   '#ffffff',
            color:        '#111827',
            border:       '1px solid #e5e7eb',
            borderRadius: '12px',
            fontSize:     '14px',
            fontWeight:   '600',
            boxShadow:    '0 8px 32px rgba(0,0,0,0.1)',
            fontFamily:   "'Inter', sans-serif",
          },
          success: { iconTheme: { primary: '#4f46e5', secondary: '#ffffff' } },
          error:   { iconTheme: { primary: '#ef4444', secondary: '#ffffff' } },
        }}
      />

      {/* ── Top Navigation ─────────────────────────────────────────────────── */}
      <header
        className="sticky top-0 z-50 w-full border-b"
        style={{
          background: 'rgba(255,255,255,0.92)',
          borderColor: '#e5e7eb',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
        }}
      >
        <div className="max-w-7xl mx-auto w-full px-4 md:px-8 h-16 flex items-center justify-between">

          {/* Left: brand */}
          <Link to="/" className="flex items-center gap-3 group">
            {/* Indigo Logo Mark */}
            <div className="relative w-9 h-9 flex-shrink-0">
              <svg width="36" height="36" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
                {/* Outer ring */}
                <circle cx="18" cy="18" r="17" stroke="url(#logoRingGrad)" strokeWidth="1.5" opacity="0.5"/>
                {/* Nest arcs */}
                <path d="M8 22 Q18 12 28 22" stroke="url(#logoIndigoGrad)" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
                <path d="M11 24 Q18 15 25 24" stroke="url(#logoIndigoGrad)" strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.5"/>
                {/* Center dot */}
                <circle cx="18" cy="18" r="2.5" fill="url(#logoIndigoGrad)"/>
                {/* Sparkle lines */}
                <line x1="18" y1="12" x2="18" y2="14" stroke="#818cf8" strokeWidth="1.5" strokeLinecap="round"/>
                <line x1="18" y1="22" x2="18" y2="24" stroke="#818cf8" strokeWidth="1.5" strokeLinecap="round"/>
                <line x1="12" y1="18" x2="14" y2="18" stroke="#818cf8" strokeWidth="1.5" strokeLinecap="round"/>
                <line x1="22" y1="18" x2="24" y2="18" stroke="#818cf8" strokeWidth="1.5" strokeLinecap="round"/>
                <defs>
                  <linearGradient id="logoIndigoGrad" x1="0" y1="0" x2="36" y2="36" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#4f46e5"/>
                    <stop offset="100%" stopColor="#818cf8"/>
                  </linearGradient>
                  <linearGradient id="logoRingGrad" x1="0" y1="0" x2="36" y2="36" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#4f46e5" stopOpacity="0.7"/>
                    <stop offset="100%" stopColor="#818cf8" stopOpacity="0.1"/>
                  </linearGradient>
                </defs>
              </svg>
              {/* Hover glow */}
              <div className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                   style={{ background: 'radial-gradient(circle, rgba(79,70,229,0.2) 0%, transparent 70%)', filter: 'blur(4px)' }} />
            </div>
            <span className="text-lg font-extrabold tracking-tight" style={{ color: '#111827', fontFamily: "'Inter', sans-serif" }}>
              Career<span className="gradient-text">Nest</span>
            </span>
          </Link>

          {/* Right: nav links + actions */}
          <div className="hidden md:flex items-center gap-2">
            {isAuth ? (
              <>
                {navLinks.map((link) => (
                  <Link
                    key={link.to}
                    to={link.to}
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold transition-all duration-150',
                      location.pathname === link.to
                        ? 'text-[#4f46e5] bg-[rgba(79,70,229,0.08)] border border-[rgba(79,70,229,0.2)]'
                        : 'text-[#6b7280] hover:text-[#111827] hover:bg-[#f3f4f6]',
                    )}
                  >
                    {link.icon}
                    {link.label}
                  </Link>
                ))}

                <div className="h-5 w-px mx-1" style={{ background: '#e5e7eb' }} />

                {/* Role pill badge */}
                {roleMeta && (
                  <span className={cn(
                    'flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border',
                    roleMeta.cls,
                  )}>
                    {roleMeta.icon}
                    {roleMeta.label}
                  </span>
                )}

                <div className="h-5 w-px mx-1" style={{ background: '#e5e7eb' }} />

                {/* Avatar Button */}
                <button
                  onClick={() => setIsProfileOpen(true)}
                  className="w-9 h-9 ml-1 rounded-full flex items-center justify-center transition-all duration-150"
                  style={{
                    background: 'linear-gradient(135deg, #4f46e5, #818cf8)',
                    boxShadow: '0 2px 10px rgba(79,70,229,0.3)',
                  }}
                  aria-label="Open profile settings"
                >
                  <span className="text-white text-sm font-bold tracking-wide">
                    {user?.email?.substring(0, 2).toUpperCase() || 'U'}
                  </span>
                </button>

                <button
                  onClick={handleLogout}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold transition-all duration-150 ml-1"
                  style={{ color: '#6b7280' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#ef4444'; (e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.07)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#6b7280'; (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                >
                  <LogOut size={15} />
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/auth"
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-150 text-[#6b7280] hover:text-[#111827] hover:bg-[#f3f4f6]"
                >
                  <LogIn size={15} />
                  Login
                </Link>
                <Link
                  to="/auth"
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold transition-all duration-150"
                  style={{
                    background: '#4f46e5',
                    color: '#ffffff',
                    boxShadow: '0 4px 14px rgba(79,70,229,0.28)',
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#4338ca'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '#4f46e5'; }}
                >
                  <UserPlus size={15} />
                  Get Started
                </Link>
              </>
            )}
          </div>

          {/* Mobile: hamburger */}
          <button
            className="md:hidden p-2 rounded-xl transition-colors text-[#6b7280] hover:text-[#111827] hover:bg-[#f3f4f6]"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Toggle menu"
          >
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {/* Mobile drawer */}
        {menuOpen && (
          <div
            className="md:hidden border-t py-3 flex flex-col gap-1 animate-slide-up px-4"
            style={{
              background: '#ffffff',
              borderColor: '#e5e7eb',
            }}
          >
            {isAuth ? (
              <>
                {navLinks.map((link) => (
                  <Link
                    key={link.to}
                    to={link.to}
                    onClick={() => setMenuOpen(false)}
                    className={cn(
                      'flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors',
                      location.pathname === link.to
                        ? 'text-[#4f46e5] bg-[rgba(79,70,229,0.08)]'
                        : 'text-[#6b7280] hover:text-[#111827] hover:bg-[#f3f4f6]',
                    )}
                  >
                    {link.icon}
                    {link.label}
                  </Link>
                ))}

                {roleMeta && (
                  <div className={cn(
                    'flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold border w-fit ml-4 mt-1',
                    roleMeta.cls,
                  )}>
                    {roleMeta.icon}
                    {roleMeta.label}
                  </div>
                )}

                <div className="h-px my-2" style={{ background: '#e5e7eb' }} />

                <button
                  onClick={() => { setMenuOpen(false); setIsProfileOpen(true); }}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors text-[#4f46e5] hover:bg-[rgba(79,70,229,0.07)]"
                >
                  <UserPlus size={15} />
                  Profile Settings
                </button>

                <div className="h-px my-2" style={{ background: '#e5e7eb' }} />

                <button
                  onClick={() => { setMenuOpen(false); handleLogout(); }}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors text-[#ef4444] hover:bg-[rgba(239,68,68,0.07)]"
                >
                  <LogOut size={15} />
                  Logout
                </button>
              </>
            ) : (
              <div className="flex flex-col gap-2">
                <Link
                  to="/auth"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm font-semibold transition-colors text-[#6b7280] hover:text-[#111827]"
                  style={{ background: '#f3f4f6' }}
                >
                  <LogIn size={15} />
                  Login
                </Link>
                <Link
                  to="/auth"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm font-bold transition-colors"
                  style={{
                    background: '#4f46e5',
                    color: '#ffffff',
                    boxShadow: '0 4px 12px rgba(79,70,229,0.28)',
                  }}
                >
                  <UserPlus size={15} />
                  Get Started
                </Link>
              </div>
            )}
          </div>
        )}
      </header>

      {/* ── Page content ───────────────────────────────────────────────────── */}
      <main className="flex-1 w-full">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-8">
          <Outlet />
        </div>
      </main>

      {/* Profile Settings Panel */}
      <ProfilePanel
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
      />
    </div>
  );
}
