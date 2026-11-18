import React from 'react';
import { Link } from 'react-router-dom';
import { WinnerPodiumItem } from '../types/index.js';
import { Shield, Sparkles, ExternalLink } from 'lucide-react';

interface WinnersPodiumPageProps {
  winners?: WinnerPodiumItem[];
  announcedAt?: string | null;
}

export const WinnersPodiumPage: React.FC<WinnersPodiumPageProps> = ({
  winners = [],
  announcedAt,
}) => {
  // Sort winners by rank: rank 1, 2, 3
  const rank1 = winners.find((w) => w.rank === 1);
  const rank2 = winners.find((w) => w.rank === 2);
  const rank3 = winners.find((w) => w.rank === 3);

  return (
    <div className="min-h-screen bg-paper flex flex-col justify-between py-10 px-4 sm:px-6 lg:px-8 text-ink selection:bg-signal selection:text-white">
      {/* Top Brand Header */}
      <div className="max-w-4xl mx-auto text-center space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-signal/10 border border-signal/20 text-signal text-xs font-bold uppercase tracking-widest animate-pulse">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Official Results &bull; Synapse 2026</span>
          <Sparkles className="w-3.5 h-3.5" />
        </div>

        <h1 className="text-3xl sm:text-5xl font-serif font-bold tracking-tight text-ink">
          🎉 Grand Finale Winners 🎉
        </h1>
        <p className="text-sm sm:text-base text-ink-muted max-w-xl mx-auto leading-relaxed">
          Celebrating the exceptional engineering, architectural synthesis, and innovative prototypes built during Synapse 2026.
        </p>

        {announcedAt && (
          <p className="text-[11px] font-mono text-ink-muted/80">
            Announced on {new Date(announcedAt).toLocaleDateString(undefined, { dateStyle: 'full', timeStyle: 'short' })}
          </p>
        )}
      </div>

      {/* Podium Stage: Ranked 2 | 1 | 3 */}
      <div className="max-w-5xl w-full mx-auto my-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
          {/* ========================================================= */}
          {/* RANK 2: SILVER PODIUM (LEFT) */}
          {/* ========================================================= */}
          <div className="order-2 md:order-1 flex flex-col items-center">
            {/* Winner Card Above Podium */}
            <div className="w-full bg-white rounded-2xl border-2 border-slate-300 p-5 shadow-lg shadow-slate-200/50 flex flex-col items-center text-center mb-3 transform hover:-translate-y-1 transition-transform">
              <div className="w-16 h-16 rounded-full bg-slate-100 border-2 border-slate-300 flex items-center justify-center text-3xl shadow-inner mb-3">
                🥈
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-300 uppercase tracking-wider mb-2">
                1st Runner Up
              </span>
              <h3 className="font-serif font-bold text-xl text-ink leading-tight">
                {rank2?.teamName || 'Runner Up Team'}
              </h3>
              {rank2?.college && (
                <p className="text-xs text-ink-muted mt-1">{rank2.college}</p>
              )}
              {rank2?.prizeTitle && (
                <span className="text-[11px] font-semibold text-slate-600 mt-2 block">
                  🌟 {rank2.prizeTitle}
                </span>
              )}
              {rank2?.score !== undefined && rank2.score > 0 && (
                <div className="mt-3 pt-2.5 border-t border-mist w-full">
                  <span className="text-[10px] text-ink-muted uppercase font-bold block">Final Standing</span>
                  <span className="font-mono text-base font-bold text-ink">{rank2.score} pts</span>
                </div>
              )}
            </div>

            {/* Podium Box 2 */}
            <div className="w-full h-44 sm:h-56 bg-gradient-to-t from-slate-200 via-slate-100 to-white rounded-t-2xl border-2 border-b-0 border-slate-300 flex flex-col items-center justify-center shadow-md">
              <span className="text-6xl sm:text-7xl font-serif font-bold text-slate-400 select-none">
                2
              </span>
              <span className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">
                2nd Place
              </span>
            </div>
          </div>

          {/* ========================================================= */}
          {/* RANK 1: GOLD PODIUM (CENTER - ELEVATED) */}
          {/* ========================================================= */}
          <div className="order-1 md:order-2 flex flex-col items-center -mt-6 md:-mt-10">
            {/* Winner Card Above Podium */}
            <div className="w-full bg-white rounded-2xl border-2 border-amber-400 p-6 shadow-xl shadow-amber-300/30 flex flex-col items-center text-center mb-3 transform hover:-translate-y-1.5 transition-transform relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-amber-400 text-amber-950 text-[10px] font-extrabold uppercase px-3 py-1 rounded-bl-lg tracking-wider">
                👑 Grand Champion
              </div>

              <div className="w-20 h-20 rounded-full bg-gradient-to-b from-amber-100 to-amber-200 border-2 border-amber-400 flex items-center justify-center text-4xl shadow-md mb-3 animate-bounce">
                🥇
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300 uppercase tracking-wider mb-2">
                🏆 Winner & Champion
              </span>
              <h2 className="font-serif font-extrabold text-2xl sm:text-3xl text-ink leading-tight">
                {rank1?.teamName || 'Champion Team'}
              </h2>
              {rank1?.college && (
                <p className="text-xs text-ink-muted mt-1 font-medium">{rank1.college}</p>
              )}
              {rank1?.prizeTitle && (
                <span className="text-xs font-bold text-amber-700 mt-2 block">
                  ✨ {rank1.prizeTitle}
                </span>
              )}
              {rank1?.score !== undefined && rank1.score > 0 && (
                <div className="mt-3.5 pt-3 border-t border-amber-100 w-full">
                  <span className="text-[10px] text-amber-800 uppercase font-bold block">Final Standing</span>
                  <span className="font-mono text-lg font-extrabold text-amber-600">{rank1.score} pts</span>
                </div>
              )}
            </div>

            {/* Podium Box 1 (Tallest) */}
            <div className="w-full h-60 sm:h-72 bg-gradient-to-t from-amber-200 via-amber-100 to-white rounded-t-2xl border-2 border-b-0 border-amber-400 flex flex-col items-center justify-center shadow-lg relative">
              <div className="text-4xl absolute -top-5">👑</div>
              <span className="text-7xl sm:text-8xl font-serif font-extrabold text-amber-500 select-none">
                1
              </span>
              <span className="text-xs font-bold text-amber-700 uppercase tracking-widest mt-1">
                1st Place
              </span>
            </div>
          </div>

          {/* ========================================================= */}
          {/* RANK 3: BRONZE PODIUM (RIGHT) */}
          {/* ========================================================= */}
          <div className="order-3 md:order-3 flex flex-col items-center">
            {/* Winner Card Above Podium */}
            <div className="w-full bg-white rounded-2xl border-2 border-amber-600/40 p-5 shadow-lg shadow-amber-700/10 flex flex-col items-center text-center mb-3 transform hover:-translate-y-1 transition-transform">
              <div className="w-16 h-16 rounded-full bg-amber-50 border-2 border-amber-600/40 flex items-center justify-center text-3xl shadow-inner mb-3">
                🥉
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-300 uppercase tracking-wider mb-2">
                2nd Runner Up
              </span>
              <h3 className="font-serif font-bold text-xl text-ink leading-tight">
                {rank3?.teamName || '2nd Runner Up Team'}
              </h3>
              {rank3?.college && (
                <p className="text-xs text-ink-muted mt-1">{rank3.college}</p>
              )}
              {rank3?.prizeTitle && (
                <span className="text-[11px] font-semibold text-amber-700 mt-2 block">
                  ✨ {rank3.prizeTitle}
                </span>
              )}
              {rank3?.score !== undefined && rank3.score > 0 && (
                <div className="mt-3 pt-2.5 border-t border-mist w-full">
                  <span className="text-[10px] text-ink-muted uppercase font-bold block">Final Standing</span>
                  <span className="font-mono text-base font-bold text-ink">{rank3.score} pts</span>
                </div>
              )}
            </div>

            {/* Podium Box 3 */}
            <div className="w-full h-36 sm:h-44 bg-gradient-to-t from-amber-100 via-stone-50 to-white rounded-t-2xl border-2 border-b-0 border-amber-600/40 flex flex-col items-center justify-center shadow-sm">
              <span className="text-5xl sm:text-6xl font-serif font-bold text-amber-700/60 select-none">
                3
              </span>
              <span className="text-xs font-bold text-amber-800 uppercase tracking-widest mt-1">
                3rd Place
              </span>
            </div>
          </div>
        </div>

        {/* Podium Base Ground */}
        <div className="w-full h-4 bg-ink/90 rounded-b-xl shadow-md" />
      </div>

      {/* Footer Navigation & Staff Link */}
      <div className="max-w-2xl mx-auto text-center space-y-4 pt-6 border-t border-mist/60 w-full">
        <div className="flex flex-wrap items-center justify-center gap-4 text-xs font-medium text-ink-muted">
          <Link
            to="/leaderboard"
            className="flex items-center gap-1.5 hover:text-ink transition-colors underline underline-offset-4"
          >
            <span>View Full Final Leaderboard</span>
            <ExternalLink className="w-3 h-3" />
          </Link>
          <span>&bull;</span>
          <Link
            to="/staff"
            className="flex items-center gap-1.5 hover:text-signal transition-colors text-ink-muted"
          >
            <Shield className="w-3.5 h-3.5" />
            <span>Staff Portal Access</span>
          </Link>
        </div>

        <p className="text-[11px] text-ink-muted">
          Synapse 2026 &bull; Organized by ISTE &bull; All Rights Reserved
        </p>
      </div>
    </div>
  );
};

export default WinnersPodiumPage;
