import React, { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.js';
import { TeamPortal } from './TeamPortal.js';
import { api } from '../services/api.js';
import { Card } from '../components/UI/Card.js';
import { Badge } from '../components/UI/Badge.js';
import { Button } from '../components/UI/Button.js';
import { LeaderboardEntry } from '../types/index.js';
import { LiveAuctionViewer } from '../components/Auction/LiveAuctionViewer.js';
import {
  Sparkles,
  Award,
  Calendar,
  LogIn,
  CheckCircle2,
} from 'lucide-react';

export const PublicHome: React.FC = () => {
  const { user, team, loading } = useAuth();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);

  useEffect(() => {
    api
      .get<{ published: boolean; leaderboard?: { entries: LeaderboardEntry[] } }>('/leaderboard/published')
      .then((res) => {
        if (res.published && res.leaderboard) {
          setLeaderboard(res.leaderboard.entries);
        }
      })
      .catch(console.error);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-signal"></div>
      </div>
    );
  }

  // 1. Staff members are strictly redirected to /staff
  if (user && (user.role === 'admin' || user.role === 'evaluator' || user.role === 'mentor' || user.role === 'desk')) {
    return <Navigate to="/staff" replace />;
  }

  // 2. Logged-in team members see their current stage workspace directly
  if (user && team) {
    return <TeamPortal />;
  }

  // 3. Logged-in public guest (no team)
  if (user && !team) {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-lg border border-mist p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-xl font-serif font-bold text-ink">Welcome, {user.name}</h1>
              <Badge variant="mist">Guest Observer</Badge>
            </div>
            <p className="text-xs text-ink-muted">
              {user.email} &bull; Your account is signed in as a public guest. Follow the live auction and competition leaderboard below.
            </p>
          </div>
        </div>

        {/* Live Auction Card */}
        <LiveAuctionViewer />

        <Card title="Current Leaderboard" subtitle="Official competition standings">
          {leaderboard.length === 0 ? (
            <div className="p-8 text-center text-xs text-ink-muted">
              The competition leaderboard has not been published yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr>
                    <th className="table-header w-16">Rank</th>
                    <th className="table-header">Team Name</th>
                    <th className="table-header">Score</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.map((entry) => (
                    <tr key={entry.teamId} className="hover:bg-paper/40">
                      <td className="table-cell font-bold text-center">
                        {entry.rank === 1 ? (
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-saffron text-ink text-xs font-bold">
                            1
                          </span>
                        ) : entry.rank === 2 ? (
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-300 text-ink text-xs font-bold">
                            2
                          </span>
                        ) : entry.rank === 3 ? (
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-600/30 text-ink text-xs font-bold">
                            3
                          </span>
                        ) : (
                          entry.rank
                        )}
                      </td>
                      <td className="table-cell font-semibold text-ink">{entry.teamName}</td>
                      <td className="table-cell font-mono font-bold text-signal">{entry.score}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    );
  }

  // 4. Non-logged in members: Introduction to Synapse & Login
  return (
    <div className="space-y-8">
      {/* Editorial Hero Header */}
      <div className="bg-ink text-white rounded-xl p-8 sm:p-10 border border-ink-light shadow-md relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-gradient-to-l from-signal/15 to-transparent pointer-events-none" />
        <div className="max-w-2xl relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-signal-light/10 text-signal-light text-xs font-semibold mb-4 border border-signal-light/20">
            <Sparkles className="w-3.5 h-3.5 text-signal" />
            ISTE &bull; Saturnalia
          </div>
          <h1 className="font-serif text-3xl sm:text-5xl font-bold tracking-tight text-white mb-4 leading-tight">
            Synapse 2026: Data Science Championship
          </h1>
          <p className="text-mist text-base sm:text-lg leading-relaxed mb-6 font-normal">
            A three-round data science competition challenging teams across raw data cleaning, machine learning benchmark evaluation, and industrial solutions.
          </p>

          <div className="flex flex-wrap items-center gap-3">
            <Link to="/login">
              <Button variant="primary" size="lg" icon={<LogIn className="w-4 h-4" />}>
                Sign in with Google
              </Button>
            </Link>
            <Link to="/leaderboard">
              <Button variant="secondary" size="lg" icon={<Award className="w-4 h-4" />}>
                View Leaderboard
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Live Auction Card */}
      <LiveAuctionViewer />

      {/* Clean Competition Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card title="About the Competition">
          <div className="space-y-3 text-xs text-ink leading-relaxed">
            <p>
              Synapse 2026 is organized by ISTE in collaboration with Saturnalia. Teams compete across specialized data science challenges designed to test end-to-end capabilities:
            </p>
            <div className="space-y-2 pt-1">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-signal flex-shrink-0 mt-0.5" />
                <span><strong>Data Preprocessing:</strong> Handling messy, high-dimensional sensor data with verified transformation pipelines.</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-signal flex-shrink-0 mt-0.5" />
                <span><strong>Model Training:</strong> Developing predictive machine learning architectures across 5 industry-specific vertical tracks.</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-signal flex-shrink-0 mt-0.5" />
                <span><strong>Industrial Deliverable:</strong> Packaging algorithms into functional solutions for partner organizations.</span>
              </div>
            </div>
          </div>
        </Card>

        <Card title="Participation Guidelines">
          <ul className="space-y-3 text-xs text-ink leading-relaxed">
            <li className="flex items-start gap-2">
              <Calendar className="w-4 h-4 text-signal flex-shrink-0 mt-0.5" />
              <span><strong>Google Sign-in:</strong> Access to team workspaces is authorized using your registered team member email.</span>
            </li>
            <li className="flex items-start gap-2">
              <Calendar className="w-4 h-4 text-signal flex-shrink-0 mt-0.5" />
              <span><strong>Live Progression:</strong> Datasets and challenge tracks are released directly through your workspace during each phase.</span>
            </li>
            <li className="flex items-start gap-2">
              <Calendar className="w-4 h-4 text-signal flex-shrink-0 mt-0.5" />
              <span><strong>Leaderboard:</strong> Verified scores and standings are published by the evaluation team upon review.</span>
            </li>
          </ul>
        </Card>
      </div>

      {/* Leaderboard Preview if available */}
      {leaderboard.length > 0 && (
        <Card title="Official Leaderboard" subtitle="Current verified standings">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr>
                  <th className="table-header w-16">Rank</th>
                  <th className="table-header">Team Name</th>
                  <th className="table-header">Score</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.slice(0, 5).map((entry) => (
                  <tr key={entry.teamId} className="hover:bg-paper/40">
                    <td className="table-cell font-bold text-center">{entry.rank}</td>
                    <td className="table-cell font-semibold text-ink">{entry.teamName}</td>
                    <td className="table-cell font-mono font-bold text-signal">{entry.score}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
};
