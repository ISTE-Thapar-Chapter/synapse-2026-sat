import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.js';
import {
  Compass,
  Users,
  Shield,
  Award,
} from 'lucide-react';

export const Sidebar: React.FC<{ isOpen: boolean; onClose: () => void }> = ({
  isOpen,
  onClose,
}) => {
  const { user, team } = useAuth();

  const isStaff = user?.role === 'admin' || user?.role === 'evaluator';

  const navItemClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
      isActive
        ? 'bg-ink text-white font-semibold'
        : 'text-ink-muted hover:bg-mist hover:text-ink'
    }`;

  const navContent = (
    <div className="flex flex-col h-full justify-between py-6 px-4">
      <div className="space-y-6">
        <div>
          <div className="text-[11px] font-semibold text-ink-muted uppercase tracking-wider mb-2 px-3">
            Navigation
          </div>
          <nav className="space-y-1">
            {isStaff ? (
              <NavLink to="/staff" className={navItemClass} onClick={onClose}>
                <Shield className="w-4 h-4 text-signal" />
                <span>Staff Portal</span>
              </NavLink>
            ) : user && team ? (
              <NavLink to="/" end className={navItemClass} onClick={onClose}>
                <Users className="w-4 h-4 text-saffron" />
                <span>Team Workspace</span>
              </NavLink>
            ) : (
              <NavLink to="/" end className={navItemClass} onClick={onClose}>
                <Compass className="w-4 h-4" />
                <span>Competition Overview</span>
              </NavLink>
            )}

            <NavLink to="/leaderboard" className={navItemClass} onClick={onClose}>
              <Award className="w-4 h-4" />
              <span>Leaderboard</span>
            </NavLink>
          </nav>
        </div>
      </div>

      {/* Clean brand signet */}
      <div className="pt-4 border-t border-mist text-xs text-ink-muted">
        <div className="font-semibold text-ink">Synapse 2026</div>
        <div className="text-[11px]">ISTE &bull; Saturnalia</div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:block w-64 bg-paper border-r border-mist h-[calc(100vh-4rem)] sticky top-16 overflow-y-auto">
        {navContent}
      </aside>

      {/* Mobile drawer */}
      {isOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-ink/60" onClick={onClose} />
          <div className="relative w-64 bg-paper h-full shadow-xl z-10 border-r border-mist">
            {navContent}
          </div>
        </div>
      )}
    </>
  );
};
