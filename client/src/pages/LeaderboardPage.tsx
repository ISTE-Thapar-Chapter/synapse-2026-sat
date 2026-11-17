import React, { useEffect, useState } from 'react';
import { api } from '../services/api.js';
import { Card } from '../components/UI/Card.js';
import { Badge } from '../components/UI/Badge.js';
import { LeaderboardEntry } from '../types/index.js';
import { Award, Clock, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export const LeaderboardPage: React.FC = () => {
  const [leaderboard, setLeaderboard] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    api
      .get<{ published: boolean; leaderboard: any }>('/leaderboard/published')
      .then((res) => {
        if (res.published) setLeaderboard(res.leaderboard);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link to="/" className="inline-flex items-center gap-1.5 text-xs text-ink-muted hover:text-ink">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Event Overview
        </Link>
        <Badge variant="saffron">Verified Leaderboard</Badge>
      </div>

      <Card
        title="Official Cleaning Round Leaderboard"
        subtitle="Immutable scores published by competition administrators"
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
            The cleaning round leaderboard has not yet been published by administrators.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr>
                  <th className="table-header w-16">Rank</th>
                  <th className="table-header">Team Name</th>
                  <th className="table-header">Score</th>
                  <th className="table-header">Tie-break Justification</th>
                  <th className="table-header">Submission Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.entries.map((e: LeaderboardEntry) => (
                  <tr key={e.teamId} className="hover:bg-paper/40">
                    <td className="table-cell font-bold">{e.rank}</td>
                    <td className="table-cell font-semibold">{e.teamName}</td>
                    <td className="table-cell font-mono font-bold text-signal">{e.score} / 100</td>
                    <td className="table-cell text-xs text-ink-muted">{e.tieBreakReason || 'Direct Score'}</td>
                    <td className="table-cell text-xs text-ink-muted">
                      {e.submissionTime ? new Date(e.submissionTime).toLocaleTimeString() : 'N/A'}
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
