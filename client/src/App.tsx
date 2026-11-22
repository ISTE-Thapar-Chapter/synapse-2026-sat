import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { AuthProvider, useAuth } from './context/AuthContext.js';
import { StageProvider } from './context/StageContext.js';
import { Navbar } from './components/Layout/Navbar.js';
import { Sidebar } from './components/Layout/Sidebar.js';
import { PublicHome } from './pages/PublicHome.js';
import { TeamPortal } from './pages/TeamPortal.js';
import { StaffPortal } from './pages/StaffPortal.js';
import { Login } from './pages/Login.js';
import { LeaderboardPage } from './pages/LeaderboardPage.js';
import { RankingPage } from './pages/RankingPage.js';
import { WinnersPodiumPage } from './pages/WinnersPodiumPage.js';
import { api } from './services/api.js';
import { WinnersAnnouncement } from './types/index.js';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || 'mock-google-client-id';

const AppContent: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [winnersState, setWinnersState] = useState<WinnersAnnouncement | null>(null);
  const location = useLocation();
  const { user } = useAuth();

  const loadWinners = async () => {
    try {
      const data = await api.get<WinnersAnnouncement>('/leaderboard/winners');
      setWinnersState(data);
    } catch {
      // silent fallback
    }
  };

  useEffect(() => {
    loadWinners();
    const interval = setInterval(loadWinners, 8000);
    return () => clearInterval(interval);
  }, []);

  const isStaffPath =
    location.pathname.startsWith('/staff') ||
    (location.pathname === '/login' && location.search.includes('staff=true'));
  const isStaffUser = user && (user.role === 'admin' || user.role === 'evaluator' || user.role === 'mentor' || user.role === 'desk');

  // Once winners are announced, every login and view for participants and general public is shown the 2 1 3 podium
  if (winnersState?.announced && !isStaffPath && !isStaffUser) {
    return (
      <WinnersPodiumPage
        winners={winnersState.winners}
        announcedAt={winnersState.announcedAt}
      />
    );
  }

  return (
    <div className="min-h-screen bg-paper flex flex-col font-sans">
      <Navbar onMenuToggle={() => setMobileMenuOpen(!mobileMenuOpen)} />

      <div className="flex-1 flex max-w-7xl w-full mx-auto">
        <Sidebar isOpen={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          <Routes>
            <Route path="/" element={<PublicHome />} />
            <Route
              path="/winners"
              element={
                <WinnersPodiumPage
                  winners={winnersState?.winners}
                  announcedAt={winnersState?.announcedAt}
                />
              }
            />
            <Route path="/staff/*" element={<StaffPortal />} />
            <Route path="/login" element={<Login />} />
            <Route path="/team" element={<TeamPortal />} />
            <Route path="/evaluator" element={<Navigate to="/staff" replace />} />
            <Route path="/admin/*" element={<Navigate to="/staff" replace />} />
            <Route path="/leaderboard" element={<LeaderboardPage />} />
            <Route path="/ranking" element={<RankingPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <BrowserRouter>
        <AuthProvider>
          <StageProvider>
            <AppContent />
          </StageProvider>
        </AuthProvider>
      </BrowserRouter>
    </GoogleOAuthProvider>
  );
};

export default App;
