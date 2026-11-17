import React, { useEffect, useState } from 'react';
import { api } from '../services/api.js';
import { Card } from '../components/UI/Card.js';
import { Badge } from '../components/UI/Badge.js';
import { CompanyAssignmentItem } from '../types/index.js';
import { Building, Clock, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export const RankingPage: React.FC = () => {
  const [rankingData, setRankingData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    api
      .get<{ published: boolean; assignments: any }>('/ranking/published')
      .then((res) => {
        if (res.published) setRankingData(res.assignments);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link to="/" className="inline-flex items-center gap-1.5 text-xs text-ink-muted hover:text-ink">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Event Overview
        </Link>
        <Badge variant="signal">Published Assignments</Badge>
      </div>

      <Card
        title="Official Company Assignments"
        subtitle="Deterministic round-robin assignment mapping top model performers to 5 partner organizations"
        action={
          rankingData && (
            <div className="text-xs text-ink-muted flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              Published: {new Date(rankingData.publishedAt).toLocaleString()}
            </div>
          )
        }
      >
        {!rankingData || !rankingData.assignments || rankingData.assignments.length === 0 ? (
          <div className="p-8 text-center text-xs text-ink-muted">
            Company assignments have not yet been published by administrators.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr>
                  <th className="table-header w-16">Rank</th>
                  <th className="table-header">Team Name</th>
                  <th className="table-header">Assigned Organization</th>
                  <th className="table-header">Selection Order</th>
                </tr>
              </thead>
              <tbody>
                {rankingData.assignments.map((item: CompanyAssignmentItem) => (
                  <tr key={item.teamId} className="hover:bg-paper/40">
                    <td className="table-cell font-bold">{item.rank}</td>
                    <td className="table-cell font-semibold text-ink">{item.teamName}</td>
                    <td className="table-cell">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-signal-light text-signal text-xs font-semibold border border-signal/20">
                        <Building className="w-3.5 h-3.5" />
                        {item.companyName}
                      </span>
                    </td>
                    <td className="table-cell text-xs text-ink-muted">#{item.selectionOrder}</td>
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
