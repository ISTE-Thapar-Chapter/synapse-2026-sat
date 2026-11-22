import React, { useEffect, useState } from 'react';
import { api } from '../services/api.js';
import { Card } from '../components/UI/Card.js';
import { Badge } from '../components/UI/Badge.js';
import { LeaderboardEntry } from '../types/index.js';
import { Award, Clock, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export const LeaderboardPage: React.FC = () => {
  const [leaderboard, setLeaderboard] = useState<any>(null);
  const [leaderboardVisible, setLeaderboardVisible] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    api
      .get<{ published: boolean; leaderboardVisible?: boolean; leaderboard: any }>('/leaderboard/published')
      .then((res) => {
        if (res.published) setLeaderboard(res.leaderboard);
        setLeaderboardVisible(!!res.leaderboardVisible);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link to="/" className="inline-flex items-center gap-1.5 text-xs text-ink-muted hover:text-ink">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Event Overview
        </Link>
        <Badge variant={leaderboardVisible ? 'signal' : 'saffron'}>
          {leaderboardVisible ? 'Verified Leaderboard' : 'Standings Masked'}
        </Badge>
      </div>

      {!leaderboardVisible && (
        <div className="p-4 bg-paper rounded-lg border border-mist text-xs text-ink-muted flex items-start gap-3">
          <Award className="w-4 h-4 text-signal shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold text-ink block mb-0.5">Evaluations In Progress</span>
            <p>
              Your evaluation has been recorded by mentors and evaluators. Official scores and rankings are masked and will be unlocked once all reviews are completed.
            </p>
          </div>
        </div>
      )}

      <Card
        title="Official Competition Leaderboard"
        subtitle={
          leaderboardVisible
            ? 'Live standings and verified scores published by competition evaluators'
            : 'Participant rankings are currently masked by competition coordinators'
        }
        action={
          leaderboard && (
            <div className="text-xs text-ink-muted flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              Published: {new Date(leaderboard.publishedAt).toLocaleString()}
            </div>
          )
        }
      >
        {!leaderboard || !leaderboard.entries || leaderboard.entries.length === 0 ? (
          <div className="p-8 text-center text-xs text-ink-muted">
            The competition leaderboard has not yet been published.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr>
                  <th className="table-header w-20 text-center">Rank</th>
                  <th className="table-header">Team Name</th>
                  <th className="table-header text-right w-28">Score</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.entries.map((e: LeaderboardEntry, idx: number) => (
                  <tr key={e.teamId || idx} className="hover:bg-paper/40 border-b border-mist">
                    <td className="table-cell font-bold text-center">
                      {leaderboardVisible ? e.rank : idx + 1}
                    </td>
                    <td className="table-cell font-semibold">{e.teamName}</td>
                    <td className="table-cell text-right font-mono font-bold">
                      {leaderboardVisible ? (
                        <span className="text-signal">{e.score}</span>
                      ) : (
                        <span className="text-ink-muted font-normal text-xs italic">Masked</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};
