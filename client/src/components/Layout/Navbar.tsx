import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.js';
import { Badge } from '../UI/Badge.js';
import { Button } from '../UI/Button.js';
import { LogIn, LogOut, Menu, Shield } from 'lucide-react';

export const Navbar: React.FC<{ onMenuToggle: () => void }> = ({ onMenuToggle }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const isStaff = user?.role === 'admin' || user?.role === 'evaluator' || user?.role === 'mentor';
  const homePath = isStaff ? '/staff' : '/';

  const roleBadgeVariant = {
    admin: 'signal' as const,
    evaluator: 'saffron' as const,
    mentor: 'navy' as const,
    public: 'mist' as const,
  }[user?.role || 'public'];

  return (
    <header className="sticky top-0 z-40 bg-ink text-white border-b border-ink-light">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Left: Mobile menu button & Brand */}
          <div className="flex items-center gap-3">
            <button
              onClick={onMenuToggle}
              className="lg:hidden p-2 rounded-md text-mist hover:text-white hover:bg-ink-light focus:outline-none focus:ring-2 focus:ring-signal"
              aria-label="Toggle navigation"
            >
              <Menu className="w-6 h-6" />
            </button>

            <Link to={homePath} className="flex items-center gap-3 group">
              <img
                src="/synapse-image.png"
                alt="Synapse 2026"
                className="h-8 sm:h-9 w-auto max-w-[170px] sm:max-w-[200px] object-contain transition-opacity group-hover:opacity-90"
              />
              <span className="hidden sm:inline-block font-mono tracking-widest text-[11px] uppercase font-semibold text-mist-dark border-l border-ink-light pl-3 py-0.5">
                ISTE × Saturnalia
              </span>
            </Link>
          </div>

          {/* Right: User Profile & Staff Shortcut */}
          <div className="flex items-center gap-3">
            {isStaff && (
              <Link to="/staff">
                <Button variant="secondary" size="sm" icon={<Shield className="w-3.5 h-3.5 text-signal" />}>
                  Staff Portal
                </Button>
              </Link>
            )}

            {user ? (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-full bg-signal-light/20 text-white flex items-center justify-center text-xs font-bold border border-mist-dark/30">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="hidden sm:block">
                    <div className="text-xs font-medium text-white leading-none">{user.name}</div>
                    <div className="text-[10px] text-mist-dark mt-0.5">{user.email}</div>
                  </div>
                  <Badge variant={roleBadgeVariant} size="sm">
                    {user.role}
                  </Badge>
                </div>

                <button
                  onClick={() => {
                    logout();
                    navigate('/');
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-mist hover:text-white hover:bg-ink-light transition-colors border border-ink-light"
                  title="Sign out"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Sign out</span>
                </button>
              </div>
            ) : (
              <Link to="/login">
                <Button variant="primary" size="sm" icon={<LogIn className="w-4 h-4" />}>
                  Sign in with Google
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
