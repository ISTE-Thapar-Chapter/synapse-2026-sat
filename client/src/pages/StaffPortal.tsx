import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.js';
import { useStage } from '../context/StageContext.js';
import { api } from '../services/api.js';
import { Card } from '../components/UI/Card.js';
import { Badge } from '../components/UI/Badge.js';
import { Button } from '../components/UI/Button.js';
import { Alert } from '../components/UI/Alert.js';
import { Modal } from '../components/UI/Modal.js';
import { EmptyState } from '../components/UI/EmptyState.js';
import {
  StageIdentifier,
  EvaluationTarget,
  Team,
  Participant,
  AuditLogItem,
  CompetitionConfig,
} from '../types/index.js';
import {
  ClipboardCheck,
  Shield,
  Layers,
  Upload,
  Users,
  Award,
  History,
  FileCode,
  Send,
  RotateCcw,
  ExternalLink,
  Search,
} from 'lucide-react';

export const StaffPortal: React.FC = () => {
  const { user } = useAuth();
  const { activeStage, allStages, transitionStage } = useStage();
  const navigate = useNavigate();

  // Role verification
  useEffect(() => {
    if (user && user.role !== 'admin' && user.role !== 'evaluator') {
      navigate('/', { replace: true });
    }
  }, [user, navigate]);

  const isAdmin = user?.role === 'admin';

  const [activeTab, setActiveTab] = useState<
    'evaluations' | 'stages' | 'config' | 'imports' | 'teams' | 'accounts' | 'leaderboard' | 'audit'
  >(isAdmin ? 'stages' : 'evaluations');

  const [notice, setNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  // Evaluator state
  const [targets, setTargets] = useState<EvaluationTarget[]>([]);
  const [activeTarget, setActiveTarget] = useState<EvaluationTarget | null>(null);
  const [score, setScore] = useState<number>(85);
  const [feedback, setFeedback] = useState<string>('');

  // Competition Config (Single dataset + 5 Requirements)
  const [config, setConfig] = useState<CompetitionConfig | null>(null);
  const [datasetTitle, setDatasetTitle] = useState('');
  const [datasetUrl, setDatasetUrl] = useState('');
  const [datasetDesc, setDatasetDesc] = useState('');
  const [reqTitles, setReqTitles] = useState<string[]>(['', '', '', '', '']);

  // Admin states
  const [transitionModal, setTransitionModal] = useState(false);
  const [targetStage, setTargetStage] = useState<StageIdentifier>('cleaning');
  const [transitionReason, setTransitionReason] = useState('');

  // Import state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importPreview, setImportPreview] = useState<any>(null);
  const [rawImportRows, setRawImportRows] = useState<any[]>([]);

  // Teams & Participants
  const [teams, setTeams] = useState<Team[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Accounts & Audit
  const [accounts, setAccounts] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);

  // Load Queue for Evaluator
  const loadQueue = async () => {
    try {
      const data = await api.get<{ targets: EvaluationTarget[] }>('/evaluations/queue');
      setTargets(data.targets || []);
      const myActive = (data.targets || []).find((t) => t.leaseStatus === 'leased_to_me');
      if (myActive) {
        setActiveTarget(myActive);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Load Config for Admin
  const loadConfig = async () => {
    try {
      const cfg = await api.get<CompetitionConfig>('/admin/config');
      setConfig(cfg);
      setDatasetTitle(cfg.cleaningDatasetTitle || '');
      setDatasetUrl(cfg.cleaningDatasetUrl || '');
      setDatasetDesc(cfg.cleaningDatasetDescription || '');
      const reqs = [...(cfg.requirementTitles || [])];
      while (reqs.length < 5) reqs.push('');
      setReqTitles(reqs.slice(0, 5));
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (!user) return;
    if (activeTab === 'evaluations') {
      loadQueue();
    } else if (activeTab === 'config') {
      loadConfig();
    } else if (activeTab === 'teams') {
      api.get<Team[]>('/admin/teams').then(setTeams).catch(console.error);
      api.get<Participant[]>('/admin/participants').then(setParticipants).catch(console.error);
    } else if (activeTab === 'accounts') {
      api.get<any[]>('/admin/accounts').then(setAccounts).catch(console.error);
    } else if (activeTab === 'audit') {
      api.get<AuditLogItem[]>('/admin/audit-logs').then(setAuditLogs).catch(console.error);
    }
  }, [activeTab, user]);

  if (!user || (user.role !== 'admin' && user.role !== 'evaluator')) {
    return <EmptyState title="Staff Access Required" description="This area is restricted to staff." />;
  }

  // Evaluator: Acquire target evaluation
  const handleSelectTeamForEvaluation = async (teamId: string) => {
    setLoading(true);
    setNotice(null);
    try {
      const res = await api.post<any>('/evaluations/lease/acquire', { targetTeamId: teamId });
      setActiveTarget(res.evaluation);
      await loadQueue();
    } catch (err: any) {
      setNotice({ type: 'error', message: err.message || 'Unable to open team evaluation.' });
    } finally {
      setLoading(false);
    }
  };

  // Evaluator: Submit Evaluation
  const handleSubmitEvaluation = async () => {
    if (!activeTarget) return;
    const evalId = activeTarget.evaluationId || (activeTarget as any)._id;
    if (!evalId) return;

    if (score < 0 || score > 100) {
      setNotice({ type: 'error', message: 'Score must be between 0 and 100.' });
      return;
    }
    if (!feedback.trim()) {
      setNotice({ type: 'error', message: 'Please provide feedback for this evaluation.' });
      return;
    }

    setLoading(true);
    setNotice(null);
    try {
      await api.post('/evaluations/submit', { evaluationId: evalId, score, feedback });
      setNotice({ type: 'success', message: 'Evaluation submitted successfully.' });
      setActiveTarget(null);
      setFeedback('');
      await loadQueue();
    } catch (err: any) {
      setNotice({ type: 'error', message: err.message || 'Failed to submit evaluation.' });
    } finally {
      setLoading(false);
    }
  };

  // Evaluator: Release target back
  const handleReleaseTarget = async () => {
    if (!activeTarget) return;
    const evalId = activeTarget.evaluationId || (activeTarget as any)._id;
    try {
      await api.post('/evaluations/lease/release', { evaluationId: evalId });
      setActiveTarget(null);
      await loadQueue();
    } catch (err: any) {
      setNotice({ type: 'error', message: err.message || 'Failed to release.' });
    }
  };

  // Admin: Save Dataset & Requirements Config
  const handleSaveConfig = async () => {
    setLoading(true);
    setNotice(null);
    try {
      const updated = await api.patch<CompetitionConfig>('/admin/config', {
        cleaningDatasetTitle: datasetTitle,
        cleaningDatasetUrl: datasetUrl,
        cleaningDatasetDescription: datasetDesc,
        requirementTitles: reqTitles.filter((t) => t.trim().length > 0),
      });
      setConfig(updated);
      setNotice({ type: 'success', message: 'Dataset and requirement tracks updated successfully.' });
    } catch (err: any) {
      setNotice({ type: 'error', message: err.message || 'Failed to update configuration.' });
    } finally {
      setLoading(false);
    }
  };

  // Admin: Transition Stage
  const handleTransitionStage = async () => {
    if (!transitionReason.trim()) {
      setNotice({ type: 'error', message: 'A reason is required to change stages.' });
      return;
    }
    setLoading(true);
    setNotice(null);
    try {
      await transitionStage(targetStage, transitionReason, true);
      setTransitionModal(false);
      setTransitionReason('');
      setNotice({ type: 'success', message: `Stage changed to '${targetStage}'.` });
    } catch (err: any) {
      setNotice({ type: 'error', message: err.message || 'Transition failed.' });
    } finally {
      setLoading(false);
    }
  };

  // Admin: File preview
  const handleFilePreview = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    setSelectedFile(file);

    const formData = new FormData();
    formData.append('file', file);

    setLoading(true);
    setNotice(null);
    try {
      const res = await api.post<any>('/admin/imports/preview', formData);
      setImportPreview(res.preview);
      setRawImportRows(res.rawRows);
    } catch (err: any) {
      setNotice({ type: 'error', message: err.message || 'File parsing failed.' });
    } finally {
      setLoading(false);
    }
  };

  // Admin: Confirm Import
  const handleConfirmImport = async () => {
    if (!rawImportRows || rawImportRows.length === 0) return;
    setLoading(true);
    setNotice(null);
    try {
      const res = await api.post<any>('/admin/imports/confirm', { rows: rawImportRows });
      setNotice({
        type: 'success',
        message: `Import complete: ${res.createdParticipants} participants and ${res.createdTeams} teams synchronized.`,
      });
      setImportPreview(null);
      setRawImportRows([]);
      setSelectedFile(null);
    } catch (err: any) {
      setNotice({ type: 'error', message: err.message || 'Failed to apply import.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Staff Header */}
      <div className="bg-white rounded-lg border border-mist p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-2xl font-serif font-bold text-ink">Staff Workspace</h1>
              <Badge variant={isAdmin ? 'signal' : 'saffron'}>{isAdmin ? 'Administrator' : 'Evaluator'}</Badge>
            </div>
            <p className="text-xs text-ink-muted">
              {user.name} ({user.email}) &bull; Current Phase: <span className="font-semibold text-ink uppercase">{activeStage}</span>
            </p>
          </div>

          {isAdmin && (
            <Button
              variant="primary"
              size="sm"
              icon={<Layers className="w-4 h-4" />}
              onClick={() => {
                setTargetStage(activeStage);
                setTransitionModal(true);
              }}
            >
              Advance / Change Phase
            </Button>
          )}
        </div>

        {notice && <Alert type={notice.type} className="mt-4">{notice.message}</Alert>}
      </div>

      {/* Staff Navigation Tabs */}
      <div className="border-b border-mist flex gap-2 overflow-x-auto no-scrollbar">
        {isAdmin && (
          <button
            onClick={() => setActiveTab('stages')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold whitespace-nowrap border-b-2 transition-colors ${
              activeTab === 'stages' ? 'border-signal text-signal' : 'border-transparent text-ink-muted hover:text-ink'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Phase Control</span>
          </button>
        )}

        <button
          onClick={() => setActiveTab('evaluations')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold whitespace-nowrap border-b-2 transition-colors ${
            activeTab === 'evaluations' ? 'border-signal text-signal' : 'border-transparent text-ink-muted hover:text-ink'
          }`}
        >
          <ClipboardCheck className="w-4 h-4" />
          <span>Evaluation Workspace</span>
        </button>

        {isAdmin && (
          <>
            <button
              onClick={() => setActiveTab('config')}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold whitespace-nowrap border-b-2 transition-colors ${
                activeTab === 'config' ? 'border-signal text-signal' : 'border-transparent text-ink-muted hover:text-ink'
              }`}
            >
              <FileCode className="w-4 h-4" />
              <span>Dataset & Requirements</span>
            </button>
            <button
              onClick={() => setActiveTab('imports')}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold whitespace-nowrap border-b-2 transition-colors ${
                activeTab === 'imports' ? 'border-signal text-signal' : 'border-transparent text-ink-muted hover:text-ink'
              }`}
            >
              <Upload className="w-4 h-4" />
              <span>Registration Import</span>
            </button>
            <button
              onClick={() => setActiveTab('teams')}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold whitespace-nowrap border-b-2 transition-colors ${
                activeTab === 'teams' ? 'border-signal text-signal' : 'border-transparent text-ink-muted hover:text-ink'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Teams & Participants</span>
            </button>
            <button
              onClick={() => setActiveTab('audit')}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold whitespace-nowrap border-b-2 transition-colors ${
                activeTab === 'audit' ? 'border-signal text-signal' : 'border-transparent text-ink-muted hover:text-ink'
              }`}
            >
              <History className="w-4 h-4" />
              <span>Audit Log</span>
            </button>
          </>
        )}
      </div>

      {/* Tab: Evaluation Workspace */}
      {activeTab === 'evaluations' && (
        <div className="space-y-6">
          {/* Active Evaluation Card */}
          {activeTarget && (
            <Card
              title={`Evaluating: ${activeTarget.teamName}`}
              subtitle="Review team submission and input score"
              action={
                <Button variant="secondary" size="sm" icon={<RotateCcw className="w-3.5 h-3.5" />} onClick={handleReleaseTarget}>
                  Return to Queue
                </Button>
              }
            >
              <div className="space-y-6">
                <div className="p-4 bg-paper rounded-lg border border-mist space-y-3 text-xs">
                  <div className="font-semibold text-ink uppercase">Submission Content</div>
                  {activeTarget.payload?.cleanedDatasetUrl && (
                    <div>
                      <span className="font-bold text-ink">Cleaned Dataset Link: </span>
                      <a
                        href={activeTarget.payload.cleanedDatasetUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-signal underline inline-flex items-center gap-1"
                      >
                        {activeTarget.payload.cleanedDatasetUrl}
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  )}
                  {activeTarget.payload?.cleaningSummary && (
                    <div>
                      <span className="font-bold text-ink">Methodology Summary: </span>
                      <p className="mt-1 text-ink">{activeTarget.payload.cleaningSummary}</p>
                    </div>
                  )}
                  {activeTarget.payload?.cleaningNotes && (
                    <div>
                      <span className="font-bold text-ink">Techniques & Code Notes: </span>
                      <pre className="mt-1 p-2 bg-white rounded border border-mist-dark font-mono text-[11px] whitespace-pre-wrap">
                        {activeTarget.payload.cleaningNotes}
                      </pre>
                    </div>
                  )}
                  {activeTarget.payload?.githubUrl && (
                    <div>
                      <span className="font-bold text-ink">GitHub Repository: </span>
                      <a href={activeTarget.payload.githubUrl} target="_blank" rel="noopener noreferrer" className="text-signal underline">
                        {activeTarget.payload.githubUrl}
                      </a>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-ink uppercase mb-1">
                      Score (0 to 100) *
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
                        className="w-20 input-field text-center font-bold text-base"
                      />
                      <span className="text-xs text-ink-muted">/ 100</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-ink uppercase mb-1">
                      Remarks & Feedback *
                    </label>
                    <textarea
                      rows={3}
                      value={feedback}
                      onChange={(e) => setFeedback(e.target.value)}
                      placeholder="Feedback on preprocessing quality, completeness, and documentation."
                      className="input-field text-xs"
                    />
                  </div>

                  <div className="pt-3 border-t border-mist flex justify-end">
                    <Button variant="primary" loading={loading} icon={<Send className="w-4 h-4" />} onClick={handleSubmitEvaluation}>
                      Submit Evaluation
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* Teams Queue */}
          <Card title="Submissions Queue" subtitle="Teams ready for evaluation">
            {targets.length === 0 ? (
              <div className="p-8 text-center text-xs text-ink-muted">No submissions in queue.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr>
                      <th className="table-header">Team Name</th>
                      <th className="table-header">Submitted At</th>
                      <th className="table-header">Status</th>
                      <th className="table-header">Score</th>
                      <th className="table-header">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {targets.map((t) => (
                      <tr key={t.teamId} className="hover:bg-paper/40">
                        <td className="table-cell font-semibold">{t.teamName}</td>
                        <td className="table-cell text-xs text-ink-muted">
                          {t.submittedAt ? new Date(t.submittedAt).toLocaleTimeString() : '—'}
                        </td>
                        <td className="table-cell">
                          {t.leaseStatus === 'completed' ? (
                            <Badge variant="success">Completed</Badge>
                          ) : t.leaseStatus === 'leased_to_me' ? (
                            <Badge variant="saffron">Active</Badge>
                          ) : (
                            <Badge variant="outline">Ready</Badge>
                          )}
                        </td>
                        <td className="table-cell font-mono font-bold">
                          {t.score !== null && t.score !== undefined ? `${t.score}` : '—'}
                        </td>
                        <td className="table-cell">
                          {t.leaseStatus !== 'completed' && !activeTarget && (
                            <Button variant="secondary" size="sm" onClick={() => handleSelectTeamForEvaluation(t.teamId)}>
                              Evaluate
                            </Button>
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
      )}

      {/* Tab: Dataset & 5 Requirements Config */}
      {isAdmin && activeTab === 'config' && (
        <Card
          title="Single Dataset & Requirement Tracks Setup"
          subtitle="Configure the uniform cleaning dataset and the 5 challenge titles revealed after cleaning submission"
          action={
            <Button variant="primary" size="sm" loading={loading} onClick={handleSaveConfig}>
              Save Configuration
            </Button>
          }
        >
          <div className="space-y-6">
            <div className="p-4 bg-paper rounded border border-mist space-y-4">
              <h4 className="text-sm font-bold text-ink">Uniform Cleaning Dataset</h4>
              <p className="text-xs text-ink-muted">
                Every participating team receives this exact dataset link once you start the cleaning stage. It remains completely hidden during registration.
              </p>
              <div>
                <label className="block text-xs font-semibold text-ink uppercase mb-1">Dataset Title</label>
                <input
                  type="text"
                  value={datasetTitle}
                  onChange={(e) => setDatasetTitle(e.target.value)}
                  placeholder="e.g. Satellite Multi-Spectral Imagery v1"
                  className="input-field text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-ink uppercase mb-1">Dataset Download Link (URL)</label>
                <input
                  type="url"
                  value={datasetUrl}
                  onChange={(e) => setDatasetUrl(e.target.value)}
                  placeholder="https://storage.googleapis.com/... or https://r2.dev/..."
                  className="input-field text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-ink uppercase mb-1">Dataset Brief & Instructions</label>
                <textarea
                  rows={2}
                  value={datasetDesc}
                  onChange={(e) => setDatasetDesc(e.target.value)}
                  placeholder="Imputation guidance, noise thresholds, coordinate handling..."
                  className="input-field text-xs"
                />
              </div>
            </div>

            <div className="p-4 bg-paper rounded border border-mist space-y-4">
              <h4 className="text-sm font-bold text-ink">5 Requirement Titles (Revealed Post-Cleaning)</h4>
              <p className="text-xs text-ink-muted">
                These titles are revealed to a team immediately after they submit their cleaned dataset and techniques.
              </p>
              {reqTitles.map((title, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <span className="w-6 text-xs font-bold text-ink-muted">#{idx + 1}</span>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => {
                      const updated = [...reqTitles];
                      updated[idx] = e.target.value;
                      setReqTitles(updated);
                    }}
                    placeholder={`Requirement track ${idx + 1} title...`}
                    className="input-field text-xs flex-1"
                  />
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* Tab: Stage Progression */}
      {isAdmin && activeTab === 'stages' && (
        <Card title="Current Event Phase" subtitle="Manage active stage across the platform">
          <div className="p-6 bg-paper rounded border border-mist flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold text-ink-muted uppercase">Active Phase</div>
              <h3 className="text-2xl font-serif font-bold text-ink uppercase mt-1">{activeStage}</h3>
              <p className="text-xs text-ink-muted mt-1">
                {activeStage === 'registration'
                  ? 'Registration active. Datasets are hidden from teams.'
                  : activeStage === 'cleaning'
                  ? 'Cleaning phase active. The uniform dataset is now visible to all teams.'
                  : 'Competition progressing.'}
              </p>
            </div>
            <Button
              variant="primary"
              onClick={() => {
                setTargetStage(activeStage);
                setTransitionModal(true);
              }}
            >
              Advance / Change Phase
            </Button>
          </div>
        </Card>
      )}

      {/* Tab: Registration Ingest */}
      {isAdmin && activeTab === 'imports' && (
        <Card title="Import Registrations" subtitle="Upload Unstop export file (CSV, Excel, or JSON)">
          <div className="p-6 border-2 border-dashed border-mist-dark rounded-lg text-center bg-paper/30">
            <Upload className="w-8 h-8 text-ink-muted mx-auto mb-2" />
            <div className="text-sm font-semibold text-ink mb-1">
              {selectedFile ? selectedFile.name : 'Select export file'}
            </div>
            <p className="text-xs text-ink-muted mb-4">
              All participant emails in the file are registered as Google Auth identifiers to give them team permissions.
            </p>
            <label className="btn-primary cursor-pointer text-xs">
              Select File
              <input type="file" accept=".csv,.xlsx,.json" className="hidden" onChange={handleFilePreview} />
            </label>
          </div>

          {importPreview && (
            <div className="mt-6 p-4 bg-paper rounded border border-mist space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-ink">Preview: {importPreview.totalRows} Rows Parsed</h4>
                <Button variant="primary" size="sm" loading={loading} onClick={handleConfirmImport}>
                  Confirm & Synchronize
                </Button>
              </div>

              <div className="grid grid-cols-3 gap-3 text-xs">
                <div className="p-2 bg-white rounded border border-mist">
                  <span className="text-ink-muted">New Participants:</span>
                  <div className="font-bold text-emerald-700">{importPreview.participantsToCreate?.length || 0}</div>
                </div>
                <div className="p-2 bg-white rounded border border-mist">
                  <span className="text-ink-muted">New Teams:</span>
                  <div className="font-bold text-blue-700">{importPreview.teamsToCreate?.length || 0}</div>
                </div>
                <div className="p-2 bg-white rounded border border-mist">
                  <span className="text-ink-muted">Google Auth Accounts:</span>
                  <div className="font-bold text-signal">{importPreview.googleAuthAccountsToProvision?.length || 0}</div>
                </div>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Tab: Teams & Participants */}
      {isAdmin && activeTab === 'teams' && (
        <div className="space-y-4">
          <div className="relative max-w-sm">
            <input
              type="text"
              placeholder="Filter teams..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-field pl-9 text-xs"
            />
            <Search className="w-4 h-4 text-ink-muted absolute left-3 top-2.5" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card title={`Registered Teams (${teams.length})`}>
              <div className="max-h-96 overflow-y-auto divide-y divide-mist text-xs">
                {teams
                  .filter((t) => t.teamName.toLowerCase().includes(searchQuery.toLowerCase()))
                  .map((t) => (
                    <div key={t._id} className="py-2.5 flex items-center justify-between">
                      <div>
                        <div className="font-semibold text-ink">{t.teamName}</div>
                        <div className="text-[11px] text-ink-muted">{t.members?.length || 0} members</div>
                      </div>
                      <Badge variant={t.disqualified ? 'signal' : 'mist'}>{t.disqualified ? 'Disqualified' : 'Active'}</Badge>
                    </div>
                  ))}
              </div>
            </Card>

            <Card title={`Participants (${participants.length})`}>
              <div className="max-h-96 overflow-y-auto divide-y divide-mist text-xs">
                {participants
                  .filter(
                    (p) =>
                      p.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      p.firstName.toLowerCase().includes(searchQuery.toLowerCase())
                  )
                  .map((p) => (
                    <div key={p._id} className="py-2.5 flex items-center justify-between">
                      <div>
                        <div className="font-semibold text-ink">{p.firstName} {p.lastName || ''}</div>
                        <div className="text-[11px] text-ink-muted">{p.email} &bull; {p.college}</div>
                      </div>
                      <Badge variant={p.role === 'leader' ? 'saffron' : 'mist'} size="sm">{p.role}</Badge>
                    </div>
                  ))}
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* Tab: Audit Log */}
      {isAdmin && activeTab === 'audit' && (
        <Card title="Audit History">
          <div className="max-h-96 overflow-y-auto divide-y divide-mist text-xs">
            {auditLogs.map((log) => (
              <div key={log._id} className="py-2">
                <div className="font-semibold text-ink flex items-center gap-2">
                  <span className="text-signal">{log.action}</span>
                  <span className="text-ink-muted">&bull; {log.actorEmail}</span>
                </div>
                <div className="text-[11px] text-ink-muted">{new Date(log.timestamp).toLocaleString()}</div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Phase Transition Modal */}
      <Modal isOpen={transitionModal} onClose={() => setTransitionModal(false)} title="Change Competition Phase">
        <div className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-ink uppercase mb-1">Target Phase</label>
            <select value={targetStage} onChange={(e) => setTargetStage(e.target.value as any)} className="input-field">
              {allStages.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-semibold text-ink uppercase mb-1">Reason for Change *</label>
            <textarea
              rows={3}
              value={transitionReason}
              onChange={(e) => setTransitionReason(e.target.value)}
              placeholder="e.g. Registration closed, opening cleaning phase."
              className="input-field"
            />
          </div>

          <div className="pt-3 flex justify-end gap-2 border-t border-mist">
            <Button variant="secondary" onClick={() => setTransitionModal(false)}>Cancel</Button>
            <Button variant="primary" loading={loading} onClick={handleTransitionStage}>Confirm Phase</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
