import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { useStage } from '../context/StageContext.js';
import { api } from '../services/api.js';
import { Card } from '../components/UI/Card.js';
import { Badge } from '../components/UI/Badge.js';
import { Button } from '../components/UI/Button.js';
import { Alert } from '../components/UI/Alert.js';
import { Modal } from '../components/UI/Modal.js';
import { EmptyState } from '../components/UI/EmptyState.js';
import { Submission, CompanyAssignmentItem } from '../types/index.js';
import {
  ExternalLink,
  Save,
  Send,
  Building,
  Github,
  CheckCircle2,
  Download,
  Layers,
} from 'lucide-react';

export const TeamPortal: React.FC = () => {
  const { user, participant, team, isLeader } = useAuth();
  const { activeStage } = useStage();

  const [submission, setSubmission] = useState<Submission | null>(null);
  const [cleaningDataset, setCleaningDataset] = useState<{
    title: string;
    fileUrl: string;
    description?: string;
  } | null>(null);
  const [hasSubmittedCleaning, setHasSubmittedCleaning] = useState<boolean>(false);
  const [requirements, setRequirements] = useState<string[]>([]);
  const [assignedCompany, setAssignedCompany] = useState<CompanyAssignmentItem | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [confirmSubmitModal, setConfirmSubmitModal] = useState<boolean>(false);

  // Form states
  const [formCleaning, setFormCleaning] = useState({
    cleanedDatasetUrl: '',
    cleaningSummary: '',
    cleaningNotes: '',
  });

  const [formModel, setFormModel] = useState({
    companyName: '',
    approachDescription: '',
    accuracyResults: '',
    githubUrl: '',
  });

  const [formFinal, setFormFinal] = useState({
    title: '',
    productDescription: '',
    sourceUrl: '',
  });

  const loadTeamData = async () => {
    setLoading(true);
    try {
      const data = await api.get<{
        activeStage: string;
        team: any;
        isLeader: boolean;
        submission: Submission | null;
        cleaningDataset: { title: string; fileUrl: string; description?: string } | null;
        hasSubmittedCleaning: boolean;
        requirements: string[];
        assignedCompany: CompanyAssignmentItem | null;
      }>('/submissions/current');

      setSubmission(data.submission);
      setCleaningDataset(data.cleaningDataset || null);
      setHasSubmittedCleaning(!!data.hasSubmittedCleaning);
      setRequirements(data.requirements || []);
      setAssignedCompany(data.assignedCompany || null);

      if (data.submission && data.submission.payload) {
        const p = data.submission.payload;
        if (activeStage === 'cleaning') {
          setFormCleaning({
            cleanedDatasetUrl: p.cleanedDatasetUrl || '',
            cleaningSummary: p.cleaningSummary || '',
            cleaningNotes: p.cleaningNotes || '',
          });
        } else if (activeStage === 'model-training') {
          setFormModel({
            companyName: p.companyName || '',
            approachDescription: p.approachDescription || '',
            accuracyResults: String(p.accuracyResults || ''),
            githubUrl: p.githubUrl || '',
          });
        } else if (activeStage === 'final-submission') {
          setFormFinal({
            title: p.title || '',
            productDescription: p.productDescription || '',
            sourceUrl: p.sourceUrl || '',
          });
        }
      }
    } catch (err: any) {
      console.error('[TeamPortal] Error loading team data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTeamData();
  }, [activeStage]);

  if (!user) {
    return (
      <EmptyState
        title="Sign In Required"
        description="Please sign in with your Google account to access your team workspace."
      />
    );
  }

  if (!team) {
    return (
      <EmptyState
        title="No Team Linked"
        description={`Your account (${user.email}) is not linked to a registered team.`}
      />
    );
  }

  const isLocked = !!submission?.isLocked;
  const canEdit = isLeader && !isLocked && !team.disqualified && !participant?.restricted;

  const handleSaveDraft = async () => {
    setSaving(true);
    setNotice(null);
    try {
      let payload: any = {};
      if (activeStage === 'cleaning') payload = formCleaning;
      else if (activeStage === 'model-training') payload = formModel;
      else if (activeStage === 'final-submission') payload = formFinal;

      const res = await api.put<{ submission: Submission }>('/submissions/draft', { payload });
      setSubmission(res.submission);
      setNotice({ type: 'success', message: 'Draft saved successfully.' });
    } catch (err: any) {
      setNotice({ type: 'error', message: err.message || 'Failed to save draft.' });
    } finally {
      setSaving(false);
    }
  };

  const handleFinalSubmit = async () => {
    setSubmitting(true);
    setNotice(null);
    try {
      let payload: any = {};
      if (activeStage === 'cleaning') payload = formCleaning;
      else if (activeStage === 'model-training') payload = formModel;
      else if (activeStage === 'final-submission') payload = formFinal;

      const res = await api.post<{ submission: Submission }>('/submissions/submit', { payload });
      setSubmission(res.submission);
      setConfirmSubmitModal(false);
      setNotice({ type: 'success', message: 'Submitted successfully.' });
      await loadTeamData();
    } catch (err: any) {
      setNotice({ type: 'error', message: err.message || 'Submission failed validation.' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Team Header Banner */}
      <div className="bg-white rounded-lg border border-mist p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-2xl font-serif font-bold text-ink">{team.teamName}</h1>
              {team.disqualified ? (
                <Badge variant="signal">Disqualified</Badge>
              ) : isLeader ? (
                <Badge variant="saffron">Team Leader</Badge>
              ) : (
                <Badge variant="mist">Team Member</Badge>
              )}
            </div>
            <p className="text-xs text-ink-muted">
              {user.name} ({user.email})
            </p>
          </div>

          <div className="flex items-center gap-2">
            {isLocked ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-mist text-ink text-xs font-semibold border border-mist-dark">
                <CheckCircle2 className="w-3.5 h-3.5 text-signal" />
                Submitted
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-emerald-50 text-emerald-800 text-xs font-semibold border border-emerald-200">
                Active
              </span>
            )}
          </div>
        </div>

        {team.disqualified && (
          <Alert type="error" title="Team Disqualified" className="mt-4">
            This team has been disqualified from the competition.
          </Alert>
        )}

        {participant?.restricted && (
          <Alert type="warning" title="Account Restricted" className="mt-4">
            Your participant account is currently restricted.
          </Alert>
        )}
      </div>

      {notice && (
        <Alert type={notice.type} title={notice.type === 'success' ? 'Success' : 'Error'}>
          {notice.message}
        </Alert>
      )}

      {/* Grid: Roster & Materials */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Team Members List */}
        <Card title="Team Roster" subtitle={`${team.members?.length || 0} members`}>
          <div className="divide-y divide-mist">
            {team.members?.map((m: any) => {
              const isThisMemberLeader =
                team.leaderId === m._id ||
                (typeof team.leaderId === 'object' && team.leaderId !== null && (team.leaderId as any)._id === m._id);
              const isCurrent = m.email?.toLowerCase() === user.email.toLowerCase();

              return (
                <div key={m._id} className="py-2.5 flex items-center justify-between text-xs">
                  <div>
                    <div className="font-medium text-ink flex items-center gap-1.5">
                      <span>{m.firstName} {m.lastName || ''}</span>
                      {isCurrent && <span className="text-[10px] text-signal font-bold">(You)</span>}
                    </div>
                    <div className="text-[11px] text-ink-muted">{m.email} &bull; {m.college}</div>
                  </div>
                  <div>
                    {isThisMemberLeader ? (
                      <Badge variant="saffron" size="sm">Leader</Badge>
                    ) : (
                      <Badge variant="mist" size="sm">Member</Badge>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Challenge Resources */}
        <div className="lg:col-span-2">
          <Card title="Challenge Materials">
            {activeStage === 'registration' ? (
              <div className="p-4 bg-paper rounded border border-mist text-xs text-ink-muted">
                The challenge dataset will become available here once the cleaning challenge begins.
              </div>
            ) : cleaningDataset && cleaningDataset.fileUrl ? (
              <div className="p-4 bg-paper rounded border border-mist space-y-3">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h4 className="text-sm font-bold text-ink">{cleaningDataset.title || 'Uniform Cleaning Dataset'}</h4>
                    {cleaningDataset.description && (
                      <p className="text-xs text-ink-muted mt-1 leading-relaxed">
                        {cleaningDataset.description}
                      </p>
                    )}
                  </div>
                  <a
                    href={cleaningDataset.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-signal text-white text-xs font-semibold hover:bg-signal-hover transition-colors flex-shrink-0"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download Dataset
                  </a>
                </div>
              </div>
            ) : (
              <p className="text-xs text-ink-muted py-4">
                Materials will be provided as each challenge commences.
              </p>
            )}
          </Card>
        </div>
      </div>

      {/* Post-Cleaning Revealed Requirements */}
      {(hasSubmittedCleaning || isLocked || activeStage === 'model-training' || activeStage === 'final-submission') &&
        requirements.length > 0 && (
          <Card
            title="Requirement Tracks"
            subtitle="The 5 specialized vertical tracks unlocked for your team"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {requirements.map((reqTitle, idx) => (
                <div key={idx} className="p-4 bg-paper rounded-lg border border-mist">
                  <div className="text-[11px] font-bold text-signal uppercase tracking-wider mb-1">
                    Track #{idx + 1}
                  </div>
                  <h4 className="text-sm font-semibold text-ink leading-snug">{reqTitle}</h4>
                </div>
              ))}
            </div>
          </Card>
        )}

      {/* Current Challenge Form */}
      {activeStage === 'registration' && (
        <Card title="Registration Confirmed">
          <div className="p-4 bg-paper rounded text-xs text-ink leading-relaxed">
            Your team registration is verified. Submissions will open when the cleaning challenge starts.
          </div>
        </Card>
      )}

      {activeStage === 'cleaning' && (
        <Card
          title="Data Cleaning Submission"
          subtitle="Submit your cleaned dataset link and transformation techniques"
        >
          {isLocked && (
            <div className="p-3 bg-mist-light rounded border border-mist mb-6 flex items-center justify-between text-xs">
              <span className="text-ink">
                Submitted on {new Date(submission?.submittedAt || '').toLocaleString()}.
              </span>
              <Badge variant="signal">Submitted</Badge>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-ink uppercase mb-1">
                Cleaned Dataset URL *
              </label>
              <input
                type="url"
                disabled={!canEdit}
                value={formCleaning.cleanedDatasetUrl}
                onChange={(e) => setFormCleaning({ ...formCleaning, cleanedDatasetUrl: e.target.value })}
                placeholder="https://drive.google.com/... or https://storage.googleapis.com/..."
                className="input-field text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-ink uppercase mb-1">
                Summary of Cleaning Steps *
              </label>
              <textarea
                rows={3}
                disabled={!canEdit}
                value={formCleaning.cleaningSummary}
                onChange={(e) => setFormCleaning({ ...formCleaning, cleaningSummary: e.target.value })}
                placeholder="Key anomaly corrections, outlier handling, and imputation steps."
                className="input-field text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-ink uppercase mb-1">
                Technical Notes & Libraries Used *
              </label>
              <textarea
                rows={4}
                disabled={!canEdit}
                value={formCleaning.cleaningNotes}
                onChange={(e) => setFormCleaning({ ...formCleaning, cleaningNotes: e.target.value })}
                placeholder="Libraries, feature scaling, and normalization steps."
                className="input-field font-mono text-xs"
              />
            </div>

            {canEdit && (
              <div className="pt-4 border-t border-mist flex items-center justify-end gap-3">
                <Button
                  variant="secondary"
                  loading={saving}
                  icon={<Save className="w-4 h-4" />}
                  onClick={handleSaveDraft}
                >
                  Save Draft
                </Button>
                <Button
                  variant="primary"
                  loading={submitting}
                  icon={<Send className="w-4 h-4" />}
                  onClick={() => setConfirmSubmitModal(true)}
                >
                  Submit
                </Button>
              </div>
            )}
          </div>
        </Card>
      )}

      {activeStage === 'cleaning-leaderboard' && (
        <Card title="Cleaning Results" subtitle="Evaluation underway">
          <div className="p-4 bg-paper rounded text-xs text-ink leading-relaxed">
            Cleaning submissions are under review. Visit the{' '}
            <a href="/leaderboard" className="text-signal font-semibold underline">
              Leaderboard
            </a>{' '}
            to view published scores.
          </div>
        </Card>
      )}

      {activeStage === 'model-training' && (
        <Card
          title="Model Training Submission"
          subtitle="Model architecture, validation metric, and repository"
        >
          {isLocked && (
            <div className="p-3 bg-mist-light rounded border border-mist mb-6 flex items-center justify-between text-xs">
              <span className="text-ink">
                Submitted on {new Date(submission?.submittedAt || '').toLocaleString()}.
              </span>
              <Badge variant="signal">Submitted</Badge>
            </div>
          )}

          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-ink uppercase mb-1">
                  Track Title *
                </label>
                <input
                  type="text"
                  disabled={!canEdit}
                  value={formModel.companyName}
                  onChange={(e) => setFormModel({ ...formModel, companyName: e.target.value })}
                  placeholder="Select or enter your challenge track"
                  className="input-field text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink uppercase mb-1">
                  Validation Accuracy / Metric *
                </label>
                <input
                  type="text"
                  disabled={!canEdit}
                  value={formModel.accuracyResults}
                  onChange={(e) => setFormModel({ ...formModel, accuracyResults: e.target.value })}
                  placeholder="e.g. 96.8% F1-Score"
                  className="input-field text-xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-ink uppercase mb-1">
                GitHub Repository URL *
              </label>
              <div className="relative">
                <input
                  type="url"
                  disabled={!canEdit}
                  value={formModel.githubUrl}
                  onChange={(e) => setFormModel({ ...formModel, githubUrl: e.target.value })}
                  placeholder="https://github.com/your-team/synapse-2026-solution"
                  className="input-field pl-9 text-xs"
                />
                <Github className="w-4 h-4 text-ink-muted absolute left-3 top-2.5" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-ink uppercase mb-1">
                Approach Description *
              </label>
              <textarea
                rows={4}
                disabled={!canEdit}
                value={formModel.approachDescription}
                onChange={(e) => setFormModel({ ...formModel, approachDescription: e.target.value })}
                placeholder="Model architecture, hyperparameter selection, and evaluation pipeline."
                className="input-field text-xs"
              />
            </div>

            {canEdit && (
              <div className="pt-4 border-t border-mist flex items-center justify-end gap-3">
                <Button
                  variant="secondary"
                  loading={saving}
                  icon={<Save className="w-4 h-4" />}
                  onClick={handleSaveDraft}
                >
                  Save Draft
                </Button>
                <Button
                  variant="primary"
                  loading={submitting}
                  icon={<Send className="w-4 h-4" />}
                  onClick={() => setConfirmSubmitModal(true)}
                >
                  Submit
                </Button>
              </div>
            )}
          </div>
        </Card>
      )}

      {(activeStage === 'ranking' || activeStage === 'final-submission') && (
        <Card
          title="Organization Placement & Final Deliverable"
          subtitle="Final solution deliverable"
        >
          {assignedCompany && (
            <div className="p-4 bg-signal-light/50 rounded-lg border border-signal/20 mb-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-signal text-white flex items-center justify-center">
                  <Building className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-signal uppercase tracking-wider">
                    Assigned Organization
                  </div>
                  <h3 className="text-lg font-bold text-ink">{assignedCompany.companyName}</h3>
                </div>
              </div>
              <Badge variant="signal">Assigned</Badge>
            </div>
          )}

          {activeStage === 'final-submission' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-ink uppercase mb-1">
                  Product Title *
                </label>
                <input
                  type="text"
                  disabled={!canEdit}
                  value={formFinal.title}
                  onChange={(e) => setFormFinal({ ...formFinal, title: e.target.value })}
                  placeholder="e.g. Adaptive Predictive Engine"
                  className="input-field text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink uppercase mb-1">
                  Product Description *
                </label>
                <textarea
                  rows={4}
                  disabled={!canEdit}
                  value={formFinal.productDescription}
                  onChange={(e) => setFormFinal({ ...formFinal, productDescription: e.target.value })}
                  placeholder="Solution overview and impact for the assigned organization."
                  className="input-field text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink uppercase mb-1">
                  Project or Source Link *
                </label>
                <input
                  type="url"
                  disabled={!canEdit}
                  value={formFinal.sourceUrl}
                  onChange={(e) => setFormFinal({ ...formFinal, sourceUrl: e.target.value })}
                  placeholder="https://github.com/... or https://demo.app"
                  className="input-field text-xs"
                />
              </div>

              {canEdit && (
                <div className="pt-4 border-t border-mist flex items-center justify-end gap-3">
                  <Button
                    variant="secondary"
                    loading={saving}
                    icon={<Save className="w-4 h-4" />}
                    onClick={handleSaveDraft}
                  >
                    Save Draft
                  </Button>
                  <Button
                    variant="primary"
                    loading={submitting}
                    icon={<Send className="w-4 h-4" />}
                    onClick={() => setConfirmSubmitModal(true)}
                  >
                    Submit
                  </Button>
                </div>
              )}
            </div>
          )}
        </Card>
      )}

      {/* Confirmation Modal */}
      <Modal
        isOpen={confirmSubmitModal}
        onClose={() => setConfirmSubmitModal(false)}
        title="Confirm Submission"
      >
        <div className="space-y-4 text-xs text-ink leading-relaxed">
          <p>
            You are submitting on behalf of <strong>{team.teamName}</strong>. Please ensure all values and links are accurate before confirming.
          </p>

          <div className="pt-3 flex items-center justify-end gap-2 border-t border-mist">
            <Button variant="secondary" onClick={() => setConfirmSubmitModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" loading={submitting} onClick={handleFinalSubmit}>
              Submit
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
