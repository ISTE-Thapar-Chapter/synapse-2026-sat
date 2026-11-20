import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { WinnerPodiumItem, WinnersAnnouncement } from '../types/index.js';
import { Shield, Sparkles, ExternalLink } from 'lucide-react';
import { api } from '../services/api.js';

interface WinnersPodiumPageProps {
  winners?: WinnerPodiumItem[];
  announcedAt?: string | null;
}

export const WinnersPodiumPage: React.FC<WinnersPodiumPageProps> = ({
  winners: initialWinners,
  announcedAt: initialAnnouncedAt,
}) => {
  const [podiumWinners, setPodiumWinners] = useState<WinnerPodiumItem[]>(initialWinners || []);
  const [announcedTime, setAnnouncedTime] = useState<string | null>(initialAnnouncedAt || null);
  const [loading, setLoading] = useState<boolean>(!initialWinners || initialWinners.length === 0);

  // Self-fetch if winners not provided or empty
  useEffect(() => {
    if (!initialWinners || initialWinners.length === 0) {
      setLoading(true);
      api
        .get<WinnersAnnouncement>('/leaderboard/winners')
        .then((res) => {
          if (res.winners && res.winners.length > 0) {
            setPodiumWinners(res.winners);
          }
          if (res.announcedAt) {
            setAnnouncedTime(res.announcedAt);
          }
        })
        .catch(console.error)
        .finally(() => setLoading(false));
    } else {
      setPodiumWinners(initialWinners);
      setAnnouncedTime(initialAnnouncedAt || null);
    }
  }, [initialWinners, initialAnnouncedAt]);

  // Extract ranks safely using Number comparison
  const rank1 = podiumWinners.find((w) => Number(w.rank) === 1);
  const rank2 = podiumWinners.find((w) => Number(w.rank) === 2);
  const rank3 = podiumWinners.find((w) => Number(w.rank) === 3);

  const formattedDate = (() => {
    if (!announcedTime) return null;
    try {
      return new Date(announcedTime).toLocaleString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return null;
    }
  })();

  return (
    <div className="min-h-screen bg-paper flex flex-col justify-between py-6 sm:py-10 px-3 sm:px-6 lg:px-8 text-ink selection:bg-signal selection:text-white">
      {/* Top Brand Header */}
      <div className="max-w-4xl mx-auto text-center space-y-2 sm:space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-signal/10 border border-signal/20 text-signal text-xs font-bold uppercase tracking-widest animate-pulse">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Official Results &bull; Synapse 2026</span>
          <Sparkles className="w-3.5 h-3.5" />
        </div>

        <h1 className="text-2xl sm:text-4xl md:text-5xl font-serif font-extrabold tracking-tight text-ink">
          🎉 Grand Finale Winners 🎉
        </h1>
        <p className="text-xs sm:text-sm md:text-base text-ink-muted max-w-xl mx-auto leading-relaxed">
          Celebrating the exceptional engineering, architectural synthesis, and innovative prototypes built during Synapse 2026.
        </p>

        {formattedDate && (
          <p className="text-[10px] sm:text-[11px] font-mono text-ink-muted/80">
            Announced on {formattedDate}
          </p>
        )}
      </div>

      {loading ? (
        <div className="py-20 text-center text-xs text-ink-muted">
          Loading official podium standings...
        </div>
      ) : (
        /* Unified 2 | 1 | 3 Stepped Podium Stage */
        <div className="max-w-4xl w-full mx-auto my-6 sm:my-10">
          {/* Top Floating Confetti & Sparkles */}
          <div className="flex justify-center items-center gap-6 sm:gap-12 text-2xl sm:text-3xl mb-4 select-none opacity-90 animate-pulse">
            <span>✨</span>
            <span>🎊</span>
            <span>🏆</span>
            <span>🎊</span>
            <span>✨</span>
          </div>

          {/* Side-by-Side Podium: 2 (Left) | 1 (Center) | 3 (Right) */}
          <div className="flex items-end justify-center gap-2 sm:gap-4 w-full">
            {/* ========================================================= */}
            {/* RANK 2: SILVER (LEFT) */}
            {/* ========================================================= */}
            <div className="flex-1 flex flex-col items-center min-w-0">
              {/* Winner Card 2 */}
              <div className="w-full bg-white rounded-xl sm:rounded-2xl border-2 border-slate-300 p-2.5 sm:p-4 shadow-lg shadow-slate-200/50 flex flex-col items-center text-center mb-2.5 transform hover:-translate-y-1 transition-transform">
                <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-full bg-slate-100 border-2 border-slate-300 flex items-center justify-center text-xl sm:text-2xl shadow-inner mb-2">
                  🥈
                </div>
                <span className="px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-300 uppercase tracking-wider mb-1.5">
                  1st Runner Up
                </span>
                <h3 className="font-serif font-bold text-xs sm:text-base md:text-lg text-ink leading-tight truncate w-full" title={rank2?.teamName}>
                  {rank2?.teamName || '1st Runner Up'}
                </h3>
                {rank2?.college && (
                  <p className="text-[10px] sm:text-xs text-ink-muted mt-0.5 truncate w-full">{rank2.college}</p>
                )}
                {rank2?.prizeTitle && (
                  <span className="text-[10px] sm:text-xs font-semibold text-slate-600 mt-1.5 block truncate w-full">
                    🌟 {rank2.prizeTitle}
                  </span>
                )}
              </div>

              {/* Podium Pillar 2 (Silver) */}
              <div className="w-full h-36 sm:h-48 md:h-56 bg-gradient-to-t from-slate-300 via-slate-100 to-white rounded-t-xl sm:rounded-t-2xl border-2 border-b-0 border-slate-300 flex flex-col items-center justify-center shadow-md select-none">
                <span className="text-4xl sm:text-6xl md:text-7xl font-serif font-bold text-slate-400">
                  2
                </span>
                <span className="text-[10px] sm:text-xs font-bold text-slate-600 uppercase tracking-widest mt-0.5 sm:mt-1">
                  2nd Place
                </span>
              </div>
            </div>

            {/* ========================================================= */}
            {/* RANK 1: GOLD (CENTER - TALLEST & ELEVATED) */}
            {/* ========================================================= */}
            <div className="flex-1 flex flex-col items-center min-w-0 -mt-4 sm:-mt-8">
              {/* Winner Card 1 */}
              <div className="w-full bg-white rounded-xl sm:rounded-2xl border-2 border-amber-400 p-3 sm:p-5 shadow-xl shadow-amber-300/30 flex flex-col items-center text-center mb-2.5 transform hover:-translate-y-1.5 transition-transform relative overflow-hidden">
                <div className="absolute top-0 right-0 bg-amber-400 text-amber-950 text-[8px] sm:text-[10px] font-extrabold uppercase px-2 sm:px-2.5 py-0.5 rounded-bl-md tracking-wider">
                  👑 Champion
                </div>

                <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-gradient-to-b from-amber-100 to-amber-200 border-2 border-amber-400 flex items-center justify-center text-2xl sm:text-3xl shadow-md mb-2 animate-bounce">
                  🥇
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-[9px] sm:text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300 uppercase tracking-wider mb-1.5">
                  🏆 Winner
                </span>
                <h2 className="font-serif font-extrabold text-sm sm:text-lg md:text-2xl text-ink leading-tight truncate w-full" title={rank1?.teamName}>
                  {rank1?.teamName || 'Grand Champion'}
                </h2>
                {rank1?.college && (
                  <p className="text-[10px] sm:text-xs text-ink-muted mt-0.5 truncate w-full font-medium">{rank1.college}</p>
                )}
                {rank1?.prizeTitle && (
                  <span className="text-[10px] sm:text-xs font-bold text-amber-700 mt-1.5 block truncate w-full">
                    ✨ {rank1.prizeTitle}
                  </span>
                )}
              </div>

              {/* Podium Pillar 1 (Tallest Gold) */}
              <div className="w-full h-52 sm:h-64 md:h-76 bg-gradient-to-t from-amber-300 via-amber-100 to-white rounded-t-xl sm:rounded-t-2xl border-2 border-b-0 border-amber-400 flex flex-col items-center justify-center shadow-lg relative select-none">
                <div className="text-2xl sm:text-4xl absolute -top-4 sm:-top-5">👑</div>
                <span className="text-5xl sm:text-7xl md:text-8xl font-serif font-extrabold text-amber-500">
                  1
                </span>
                <span className="text-[10px] sm:text-xs font-bold text-amber-800 uppercase tracking-widest mt-0.5 sm:mt-1">
                  1st Place
                </span>
              </div>
            </div>

            {/* ========================================================= */}
            {/* RANK 3: BRONZE (RIGHT) */}
            {/* ========================================================= */}
            <div className="flex-1 flex flex-col items-center min-w-0">
              {/* Winner Card 3 */}
              <div className="w-full bg-white rounded-xl sm:rounded-2xl border-2 border-amber-600/40 p-2.5 sm:p-4 shadow-md flex flex-col items-center text-center mb-2.5 transform hover:-translate-y-1 transition-transform">
                <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-full bg-amber-50 border-2 border-amber-600/40 flex items-center justify-center text-xl sm:text-2xl shadow-inner mb-2">
                  🥉
                </div>
                <span className="px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-300 uppercase tracking-wider mb-1.5">
                  2nd Runner Up
                </span>
                <h3 className="font-serif font-bold text-xs sm:text-base md:text-lg text-ink leading-tight truncate w-full" title={rank3?.teamName}>
                  {rank3?.teamName || '2nd Runner Up'}
                </h3>
                {rank3?.college && (
                  <p className="text-[10px] sm:text-xs text-ink-muted mt-0.5 truncate w-full">{rank3.college}</p>
                )}
                {rank3?.prizeTitle && (
                  <span className="text-[10px] sm:text-xs font-semibold text-amber-700 mt-1.5 block truncate w-full">
                    ✨ {rank3.prizeTitle}
                  </span>
                )}
              </div>

              {/* Podium Pillar 3 (Bronze) */}
              <div className="w-full h-28 sm:h-36 md:h-44 bg-gradient-to-t from-amber-200 via-stone-100 to-white rounded-t-xl sm:rounded-t-2xl border-2 border-b-0 border-amber-600/40 flex flex-col items-center justify-center shadow-sm select-none">
                <span className="text-3xl sm:text-5xl md:text-6xl font-serif font-bold text-amber-700/60">
                  3
                </span>
                <span className="text-[10px] sm:text-xs font-bold text-amber-800 uppercase tracking-widest mt-0.5 sm:mt-1">
                  3rd Place
                </span>
              </div>
            </div>
          </div>

          {/* Unified Solid Ground Platform */}
          <div className="w-full h-4 sm:h-6 bg-ink rounded-b-xl sm:rounded-b-2xl shadow-xl border-t border-ink/40" />
        </div>
      )}

      {/* Footer Navigation & Staff Link */}
      <div className="max-w-2xl mx-auto text-center space-y-3 pt-6 border-t border-mist/60 w-full">
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

        <p className="text-[10px] sm:text-[11px] text-ink-muted">
          Synapse 2026 &bull; Organized by ISTE &bull; All Rights Reserved
        </p>
      </div>
    </div>
  );
};

export default WinnersPodiumPage;
