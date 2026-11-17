import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.js';
import { Badge } from '../UI/Badge.js';
import { Button } from '../UI/Button.js';
import { LogIn, LogOut, Menu, Shield } from 'lucide-react';

export const Navbar: React.FC<{ onMenuToggle: () => void }> = ({ onMenuToggle }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const isStaff = user?.role === 'admin' || user?.role === 'evaluator';
  const homePath = isStaff ? '/staff' : '/';

  const roleBadgeVariant = {
    admin: 'signal' as const,
    evaluator: 'saffron' as const,
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

            <Link to={homePath} className="flex items-center gap-2 group">
              <div className="w-8 h-8 rounded bg-signal flex items-center justify-center font-bold text-white text-lg tracking-wider">
                S
              </div>
              <div>
                <span className="font-serif text-lg tracking-tight font-bold text-white group-hover:text-mist transition-colors">
                  SYNAPSE 2026
                </span>
                <span className="hidden sm:inline-block text-xs text-mist-dark ml-2 border-l border-ink-light pl-2">
                  ISTE × Saturnalia
                </span>
              </div>
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
