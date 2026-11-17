import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { useStage } from '../context/StageContext.js';
import { api } from '../services/api.js';
import { Card } from '../components/UI/Card.js';
import { Badge } from '../components/UI/Badge.js';
import { Button } from '../components/UI/Button.js';
import { Alert } from '../components/UI/Alert.js';
import { EmptyState } from '../components/UI/EmptyState.js';
import { EvaluationTarget } from '../types/index.js';
import {
  ClipboardCheck,
  Clock,
  Lock,
  Unlock,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Send,
} from 'lucide-react';

export const EvaluatorPortal: React.FC = () => {
  const { user } = useAuth();
  const { activeStage } = useStage();

  const [targets, setTargets] = useState<EvaluationTarget[]>([]);
  const [activeTarget, setActiveTarget] = useState<EvaluationTarget | null>(null);
  const [score, setScore] = useState<number>(85);
  const [feedback, setFeedback] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(0);

  const loadQueue = async () => {
    setLoading(true);
    try {
      const data = await api.get<{
        activeStage: string;
        evaluatorEmail: string;
        targets: EvaluationTarget[];
      }>('/evaluations/queue');

      setTargets(data.targets || []);

      // Check if any target is leased to current user
      const myLease = (data.targets || []).find((t) => t.leaseStatus === 'leased_to_me');
      if (myLease) {
        setActiveTarget(myLease);
        setTimeLeft(myLease.leaseExpiresInSec || 900);
      } else {
        setActiveTarget(null);
      }
    } catch (err: any) {
      console.error('[EvaluatorPortal] Queue fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQueue();
  }, [activeStage]);

  // Countdown timer for active lease
  useEffect(() => {
    if (!activeTarget || timeLeft <= 0) return;
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          loadQueue();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [activeTarget, timeLeft]);

  if (!user || (user.role !== 'evaluator' && user.role !== 'admin')) {
    return (
      <EmptyState
        title="Evaluator Access Required"
        description="This evaluation portal is reserved for designated academic and industry evaluators."
      />
    );
  }

  const handleAcquireLease = async (targetTeamId?: string) => {
    setActionLoading(true);
    setNotice(null);
    try {
      const res = await api.post<any>('/evaluations/lease/acquire', { targetTeamId });
      setNotice({ type: 'success', message: 'Target acquired. 15 minutes allocated for evaluation.' });
      await loadQueue();
    } catch (err: any) {
      setNotice({ type: 'error', message: err.message || 'Unable to open target for evaluation.' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleReleaseLease = async () => {
    if (!activeTarget?.evaluationId) return;
    setActionLoading(true);
    setNotice(null);
    try {
      await api.post('/evaluations/lease/release', { evaluationId: activeTarget.evaluationId });
      setActiveTarget(null);
      setNotice({ type: 'success', message: 'Target released back to queue.' });
      await loadQueue();
    } catch (err: any) {
      setNotice({ type: 'error', message: err.message || 'Failed to release target.' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleSubmitEvaluation = async () => {
    if (!activeTarget?.evaluationId) return;
    if (score < 0 || score > 100) {
      setNotice({ type: 'error', message: 'Score must be between 0 and 100.' });
      return;
    }
    if (!feedback.trim() || feedback.length < 5) {
      setNotice({ type: 'error', message: 'Please provide constructive evaluation feedback (at least 5 characters).' });
      return;
    }

    setActionLoading(true);
    setNotice(null);
    try {
      await api.post('/evaluations/submit', {
        evaluationId: activeTarget.evaluationId,
        score,
        feedback,
      });
      setNotice({ type: 'success', message: 'Evaluation submitted successfully.' });
      setActiveTarget(null);
      setFeedback('');
      await loadQueue();
    } catch (err: any) {
      setNotice({ type: 'error', message: err.message || 'Failed to submit evaluation.' });
    } finally {
      setActionLoading(false);
    }
  };

  const formatTimer = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const s = sec % 60;
    return `${mins}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg border border-mist p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-2xl font-serif font-bold text-ink">Evaluation Workspace</h1>
              <Badge variant="saffron">Evaluator Desk</Badge>
            </div>
            <p className="text-xs text-ink-muted">
              Active Evaluation Round:{' '}
              <strong className="text-ink uppercase">{activeStage}</strong> &bull; Signed in as:{' '}
              <span className="text-ink font-semibold">{user.email}</span>
            </p>
          </div>

          <div>
            {!activeTarget && (
              <Button
                variant="primary"
                loading={actionLoading}
                icon={<ClipboardCheck className="w-4 h-4" />}
                onClick={() => handleAcquireLease()}
              >
                Acquire Next Available Target
              </Button>
            )}
          </div>
        </div>

        {notice && (
          <Alert type={notice.type} className="mt-4">
            {notice.message}
          </Alert>
        )}
      </div>

      {/* Active Evaluation Card */}
      {activeTarget && (
        <Card
          title={`Evaluation: ${activeTarget.teamName}`}
          subtitle="Review and score submission"
          action={
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-amber-50 text-amber-900 rounded border border-amber-300 text-xs font-mono font-bold">
                <Clock className="w-3.5 h-3.5 text-amber-700" />
                Time Remaining: {formatTimer(timeLeft)}
              </span>
              <Button
                variant="secondary"
                size="sm"
                icon={<RotateCcw className="w-3.5 h-3.5" />}
                loading={actionLoading}
                onClick={handleReleaseLease}
              >
                Release to Queue
              </Button>
            </div>
          }
        >
          <div className="space-y-6">
            {/* Target Submission Details */}
            <div className="p-4 bg-paper rounded-lg border border-mist space-y-3">
              <div className="text-xs font-semibold text-ink-muted uppercase">Submission Overview</div>

              {activeStage === 'cleaning' && (
                <div className="space-y-2 text-xs">
                  <div>
                    <span className="font-bold text-ink">Dataset URL: </span>
                    <a
                      href={activeTarget.payload?.cleanedDatasetUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-signal underline break-all inline-flex items-center gap-1"
                    >
                      {activeTarget.payload?.cleanedDatasetUrl}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                  <div>
                    <span className="font-bold text-ink">Cleaning Summary: </span>
                    <p className="mt-1 text-ink">{activeTarget.payload?.cleaningSummary}</p>
                  </div>
                  <div>
                    <span className="font-bold text-ink">Methodology & Notes: </span>
                    <pre className="mt-1 p-2 bg-white rounded border border-mist-dark font-mono text-[11px] whitespace-pre-wrap text-ink">
                      {activeTarget.payload?.cleaningNotes}
                    </pre>
                  </div>
                </div>
              )}

              {activeStage === 'model-training' && (
                <div className="space-y-2 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <span className="font-bold text-ink">Target Company: </span>
                      <span>{activeTarget.payload?.companyName}</span>
                    </div>
                    <div>
                      <span className="font-bold text-ink">Claimed Accuracy: </span>
                      <span className="font-semibold text-signal">{activeTarget.payload?.accuracyResults}</span>
                    </div>
                  </div>
                  <div>
                    <span className="font-bold text-ink">GitHub Repository: </span>
                    <a
                      href={activeTarget.payload?.githubUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-signal underline break-all inline-flex items-center gap-1"
                    >
                      {activeTarget.payload?.githubUrl}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                  <div>
                    <span className="font-bold text-ink">Approach Description: </span>
                    <p className="mt-1 text-ink leading-relaxed">{activeTarget.payload?.approachDescription}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Evaluation Grading Inputs */}
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-ink uppercase mb-1">
                  Evaluation Score (0 to 100) *
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={score}
                    onChange={(e) => setScore(Number(e.target.value))}
                    className="w-64 accent-signal"
                  />
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={score}
                    onChange={(e) => setScore(Number(e.target.value))}
                    className="w-24 input-field text-center font-bold font-mono text-base"
                  />
                  <span className="text-xs text-ink-muted">/ 100 points</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink uppercase mb-1">
                  Evaluator Feedback & Justification *
                </label>
                <textarea
                  rows={4}
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="Record constructive technical critique, verification of data integrity, and justification of assigned points."
                  className="input-field"
                />
              </div>

              <div className="pt-4 border-t border-mist flex justify-end">
                <Button
                  variant="primary"
                  loading={actionLoading}
                  icon={<Send className="w-4 h-4" />}
                  onClick={handleSubmitEvaluation}
                >
                  Submit Evaluation
                </Button>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Targets Queue Table */}
      <Card
        title="Evaluation Queue"
        subtitle={`All submitted targets for ${activeStage}`}
      >
        {targets.length === 0 ? (
          <div className="p-8 text-center text-xs text-ink-muted">
            No submissions in queue for evaluation in this stage.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr>
                  <th className="table-header">Team Name</th>
                  <th className="table-header">Submission Time</th>
                  <th className="table-header">Status</th>
                  <th className="table-header">Score</th>
                  <th className="table-header">Action</th>
                </tr>
              </thead>
              <tbody>
                {targets.map((t) => (
                  <tr key={t.teamId} className="hover:bg-paper/40">
                    <td className="table-cell font-semibold text-ink">{t.teamName}</td>
                    <td className="table-cell text-xs text-ink-muted">
                      {t.submittedAt ? new Date(t.submittedAt).toLocaleTimeString() : 'N/A'}
                    </td>
                    <td className="table-cell">
                      {t.leaseStatus === 'completed' ? (
                        <Badge variant="success">Completed</Badge>
                      ) : t.leaseStatus === 'leased_to_me' ? (
                        <Badge variant="saffron">Leased by You</Badge>
                      ) : t.leaseStatus === 'locked_by_other' ? (
                        <Badge variant="signal">Locked by Other</Badge>
                      ) : (
                        <Badge variant="outline">Available</Badge>
                      )}
                    </td>
                    <td className="table-cell font-mono font-bold">
                      {t.score !== null && t.score !== undefined ? `${t.score} / 100` : '—'}
                    </td>
                    <td className="table-cell">
                      {t.leaseStatus === 'available' && !activeTarget && (
                        <Button
                          variant="secondary"
                          size="sm"
                          loading={actionLoading}
                          onClick={() => handleAcquireLease(t.teamId)}
                        >
                          Acquire
                        </Button>
                      )}
                      {t.leaseStatus === 'leased_to_me' && (
                        <span className="text-xs font-semibold text-saffron">Active in workspace</span>
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
