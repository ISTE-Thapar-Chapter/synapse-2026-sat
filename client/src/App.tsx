import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { AuthProvider } from './context/AuthContext.js';
import { StageProvider } from './context/StageContext.js';
import { Navbar } from './components/Layout/Navbar.js';
import { Sidebar } from './components/Layout/Sidebar.js';
import { PublicHome } from './pages/PublicHome.js';
import { TeamPortal } from './pages/TeamPortal.js';
import { StaffPortal } from './pages/StaffPortal.js';
import { Login } from './pages/Login.js';
import { LeaderboardPage } from './pages/LeaderboardPage.js';
import { RankingPage } from './pages/RankingPage.js';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || 'mock-google-client-id';

export const App: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <BrowserRouter>
        <AuthProvider>
          <StageProvider>
            <div className="min-h-screen bg-paper flex flex-col font-sans">
              <Navbar onMenuToggle={() => setMobileMenuOpen(!mobileMenuOpen)} />

              <div className="flex-1 flex max-w-7xl w-full mx-auto">
                <Sidebar isOpen={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />

                <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
                  <Routes>
                    <Route path="/" element={<PublicHome />} />
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
          </StageProvider>
        </AuthProvider>
      </BrowserRouter>
    </GoogleOAuthProvider>
  );
};

export default App;
