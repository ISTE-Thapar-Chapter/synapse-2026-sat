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
  UserPlus,
  Plus,
  Trash2,
} from 'lucide-react';

export const StaffPortal: React.FC = () => {
  const { user } = useAuth();
  const { activeStage } = useStage();
  const navigate = useNavigate();

  // Role verification
  useEffect(() => {
    if (user && user.role !== 'admin' && user.role !== 'evaluator') {
      navigate('/', { replace: true });
    }
  }, [user, navigate]);

  const isAdmin = user?.role === 'admin';

  const [activeTab, setActiveTab] = useState<
    'evaluations' | 'config' | 'imports' | 'teams' | 'accounts' | 'leaderboard' | 'audit'
  >(isAdmin ? 'config' : 'evaluations');

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

  // Event status control
  const [eventLoading, setEventLoading] = useState(false);

  // Import state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importPreview, setImportPreview] = useState<any>(null);
  const [rawImportRows, setRawImportRows] = useState<any[]>([]);

  // Teams & Participants
  const [teams, setTeams] = useState<Team[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Manual Team Creation
  const [createTeamModal, setCreateTeamModal] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [newLeaderName, setNewLeaderName] = useState('');
  const [newLeaderEmail, setNewLeaderEmail] = useState('');
  const [newCollege, setNewCollege] = useState('');
  const [newMembers, setNewMembers] = useState<Array<{ name: string; email: string }>>([
    { name: '', email: '' },
  ]);
  const [createTeamLoading, setCreateTeamLoading] = useState(false);
  const [createTeamError, setCreateTeamError] = useState<string | null>(null);

  // Delete Team State
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [teamToDelete, setTeamToDelete] = useState<Team | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteTeamError, setDeleteTeamError] = useState<string | null>(null);

  // Manual Account Creation
  const [createAccountModal, setCreateAccountModal] = useState(false);
  const [newAccountName, setNewAccountName] = useState('');
  const [newAccountEmail, setNewAccountEmail] = useState('');
  const [newAccountRole, setNewAccountRole] = useState<'admin' | 'evaluator' | 'public'>('evaluator');
  const [createAccountLoading, setCreateAccountLoading] = useState(false);
  const [createAccountError, setCreateAccountError] = useState<string | null>(null);

  // Evaluation submission error
  const [evalSubmitError, setEvalSubmitError] = useState<string | null>(null);

  // Accounts & Audit
  const [accounts, setAccounts] = useState<any[]>([]);
  const [accountSearch, setAccountSearch] = useState('');
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

    setEvalSubmitError(null);
    if (score < 0 || score > 100) {
      setEvalSubmitError('Score must be between 0 and 100.');
      return;
    }
    if (!feedback.trim() || feedback.trim().length < 5) {
      setEvalSubmitError('Please provide evaluation feedback / remarks (at least 5 characters).');
      return;
    }

    setLoading(true);
    setNotice(null);
    try {
      await api.post('/evaluations/submit', { evaluationId: evalId, score, feedback });
      setNotice({ type: 'success', message: 'Evaluation submitted successfully.' });
      setActiveTarget(null);
      setFeedback('');
      setEvalSubmitError(null);
      await loadQueue();
    } catch (err: any) {
      setEvalSubmitError(err.message || 'Failed to submit evaluation.');
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

  // Admin: Start / Pause Global Event
  const handleStartEvent = async () => {
    setEventLoading(true);
    setNotice(null);
    try {
      const res = await api.post<{ message: string; config: CompetitionConfig }>('/admin/event/start');
      setConfig(res.config);
      setNotice({ type: 'success', message: 'Event successfully started! Participants can now view the dataset and submit responses.' });
    } catch (err: any) {
      setNotice({ type: 'error', message: err.message || 'Failed to start event.' });
    } finally {
      setEventLoading(false);
    }
  };

  const handlePauseEvent = async () => {
    setEventLoading(true);
    setNotice(null);
    try {
      const res = await api.post<{ message: string; config: CompetitionConfig }>('/admin/event/pause');
      setConfig(res.config);
      setNotice({ type: 'success', message: 'Event paused. Datasets and submissions are paused.' });
    } catch (err: any) {
      setNotice({ type: 'error', message: err.message || 'Failed to pause event.' });
    } finally {
      setEventLoading(false);
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

  // Admin: Member Rows for Team Creation
  const handleAddMemberRow = () => {
    setNewMembers([...newMembers, { name: '', email: '' }]);
  };

  const handleRemoveMemberRow = (index: number) => {
    setNewMembers(newMembers.filter((_, i) => i !== index));
  };

  const handleMemberChange = (index: number, field: 'name' | 'email', value: string) => {
    const updated = [...newMembers];
    updated[index][field] = value;
    setNewMembers(updated);
  };

  // Admin: Create Team Manually
  const handleCreateTeamManually = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateTeamError(null);

    if (!newTeamName.trim()) {
      setCreateTeamError('Team name is required.');
      return;
    }
    if (!newLeaderName.trim()) {
      setCreateTeamError('Leader name is required.');
      return;
    }
    if (!newLeaderEmail.trim()) {
      setCreateTeamError('Leader email is required.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newLeaderEmail.trim())) {
      setCreateTeamError('Please provide a valid leader email address.');
      return;
    }

    // Validate and clean member rows
    const cleanedMembers: Array<{ name: string; email: string }> = [];
    const seenEmails = new Set<string>([newLeaderEmail.trim().toLowerCase()]);

    for (let i = 0; i < newMembers.length; i++) {
      const m = newMembers[i];
      const trimmedName = m.name.trim();
      const trimmedEmail = m.email.trim().toLowerCase();

      // Skip row if both name and email are completely empty
      if (!trimmedName && !trimmedEmail) continue;

      if (!trimmedName) {
        setCreateTeamError(`Member #${i + 1} name is required.`);
        return;
      }
      if (!trimmedEmail || !emailRegex.test(trimmedEmail)) {
        setCreateTeamError(`Member #${i + 1} ("${trimmedName}") requires a valid email address.`);
        return;
      }
      if (seenEmails.has(trimmedEmail)) {
        setCreateTeamError(`Duplicate email detected: "${trimmedEmail}". Each member must have a distinct email.`);
        return;
      }
      seenEmails.add(trimmedEmail);
      cleanedMembers.push({ name: trimmedName, email: trimmedEmail });
    }

    setCreateTeamLoading(true);
    try {
      const res = await api.post<any>('/admin/teams/manual', {
        teamName: newTeamName.trim(),
        leaderName: newLeaderName.trim(),
        leaderEmail: newLeaderEmail.trim(),
        college: newCollege.trim() || 'Independent',
        members: cleanedMembers,
      });

      setNotice({
        type: 'success',
        message: `Team "${res.team?.teamName || newTeamName}" and ${res.team?.members?.length || cleanedMembers.length + 1} participant accounts provisioned successfully.`,
      });

      // Refresh data
      const updatedTeams = await api.get<Team[]>('/admin/teams');
      setTeams(updatedTeams);
      const updatedParticipants = await api.get<Participant[]>('/admin/participants');
      setParticipants(updatedParticipants);
      const updatedAccounts = await api.get<any[]>('/admin/accounts');
      setAccounts(updatedAccounts);

      // Reset form & close modal
      setNewTeamName('');
      setNewLeaderName('');
      setNewLeaderEmail('');
      setNewCollege('');
      setNewMembers([{ name: '', email: '' }]);
      setCreateTeamModal(false);
    } catch (err: any) {
      setCreateTeamError(err.message || 'Failed to create team.');
    } finally {
      setCreateTeamLoading(false);
    }
  };

  // Admin: Delete Team
  const handleDeleteTeam = async () => {
    if (!teamToDelete) return;
    setDeleteLoading(true);
    setDeleteTeamError(null);
    try {
      const res = await api.delete<any>(`/admin/teams/${teamToDelete._id}`);
      setNotice({
        type: 'success',
        message: res.message || `Team "${teamToDelete.teamName}" was permanently deleted.`,
      });

      // Refresh data
      const updatedTeams = await api.get<Team[]>('/admin/teams');
      setTeams(updatedTeams);
      const updatedParticipants = await api.get<Participant[]>('/admin/participants');
      setParticipants(updatedParticipants);
      const updatedAccounts = await api.get<any[]>('/admin/accounts');
      setAccounts(updatedAccounts);
      await loadQueue();

      setDeleteModalOpen(false);
      setTeamToDelete(null);
      setDeleteTeamError(null);
    } catch (err: any) {
      setDeleteTeamError(err.message || 'Failed to delete team.');
    } finally {
      setDeleteLoading(false);
    }
  };

  // Admin: Create Evaluator / Admin / Public Account
  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAccountName.trim() || !newAccountEmail.trim()) {
      setCreateAccountError('Please provide both name and a valid email address.');
      return;
    }
    setCreateAccountLoading(true);
    setCreateAccountError(null);
    try {
      await api.post('/admin/accounts', {
        name: newAccountName.trim(),
        email: newAccountEmail.toLowerCase().trim(),
        role: newAccountRole,
      });
      setCreateAccountModal(false);
      setNewAccountName('');
      setNewAccountEmail('');
      setNewAccountRole('evaluator');
      setNotice({
        type: 'success',
        message: `Account for ${newAccountEmail} provisioned successfully with role "${newAccountRole}".`,
      });
      const updated = await api.get<any[]>('/admin/accounts');
      setAccounts(updated);
    } catch (err: any) {
      setCreateAccountError(err.message || 'Failed to provision account.');
    } finally {
      setCreateAccountLoading(false);
    }
  };

  // Admin: Update Account Role
  const handleUpdateRole = async (accountId: string, newRole: string) => {
    try {
      await api.patch(`/admin/accounts/${accountId}/role`, { role: newRole });
      setNotice({ type: 'success', message: 'Account role updated successfully.' });
      const updated = await api.get<any[]>('/admin/accounts');
      setAccounts(updated);
    } catch (err: any) {
      setNotice({ type: 'error', message: err.message || 'Failed to update account role.' });
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
              {user.name} ({user.email}) &bull; Status:{' '}
              {config?.isEventStarted ? (
                <span className="font-semibold text-emerald-700">Event Live & Submissions Open</span>
              ) : (
                <span className="font-semibold text-amber-700">Event Not Started (Submissions Locked)</span>
              )}
            </p>
          </div>

          {isAdmin && (
            <div className="flex items-center gap-3">
              {config?.isEventStarted ? (
                <>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-emerald-50 text-emerald-800 text-xs font-semibold border border-emerald-200">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    Event Live
                  </span>
                  <Button
                    variant="secondary"
                    size="sm"
                    loading={eventLoading}
                    onClick={handlePauseEvent}
                  >
                    Pause Event
                  </Button>
                </>
              ) : (
                <>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-amber-50 text-amber-800 text-xs font-semibold border border-amber-200">
                    Not Started
                  </span>
                  <Button
                    variant="primary"
                    size="sm"
                    loading={eventLoading}
                    onClick={handleStartEvent}
                  >
                    Start Event
                  </Button>
                </>
              )}
            </div>
          )}
        </div>

        {notice && <Alert type={notice.type} className="mt-4">{notice.message}</Alert>}
      </div>

      {/* Staff Navigation Tabs */}
      <div className="border-b border-mist flex gap-2 overflow-x-auto no-scrollbar">
        {isAdmin && (
          <button
            onClick={() => setActiveTab('config')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold whitespace-nowrap border-b-2 transition-colors ${
              activeTab === 'config' ? 'border-signal text-signal' : 'border-transparent text-ink-muted hover:text-ink'
            }`}
          >
            <FileCode className="w-4 h-4" />
            <span>Dataset & Requirements</span>
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
              onClick={() => setActiveTab('teams')}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold whitespace-nowrap border-b-2 transition-colors ${
                activeTab === 'teams' ? 'border-signal text-signal' : 'border-transparent text-ink-muted hover:text-ink'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Teams & Participants</span>
            </button>
            <button
              onClick={() => setActiveTab('accounts')}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold whitespace-nowrap border-b-2 transition-colors ${
                activeTab === 'accounts' ? 'border-signal text-signal' : 'border-transparent text-ink-muted hover:text-ink'
              }`}
            >
              <Shield className="w-4 h-4" />
              <span>Accounts & Roles</span>
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
                <div className="p-4 bg-paper rounded-lg border border-mist space-y-4 text-xs">
                  <div className="font-semibold text-ink uppercase tracking-wider text-[11px] border-b border-mist pb-2">
                    Evaluation Target: Company Methodology & Feature Sets
                  </div>

                  {/* Company Name */}
                  <div>
                    <span className="font-bold text-ink">Target Company / Organization: </span>
                    <span className="text-signal font-semibold">
                      {activeTarget.payload?.companyName || 'Standard Solution Track'}
                    </span>
                  </div>

                  {/* Overall Methodology */}
                  {(activeTarget.payload?.methodologySummary || activeTarget.payload?.generalNotes) && (
                    <div>
                      <span className="font-bold text-ink">Overall Methodology: </span>
                      <p className="mt-1 text-ink bg-white p-2.5 rounded border border-mist leading-relaxed">
                        {activeTarget.payload.methodologySummary || activeTarget.payload.generalNotes}
                      </p>
                    </div>
                  )}

                  {/* Respective Feature Sets */}
                  {Array.isArray(activeTarget.payload?.requirements) && activeTarget.payload.requirements.length > 0 && (
                    <div className="space-y-3 pt-1">
                      <span className="font-bold text-ink uppercase tracking-wider text-[11px]">
                        Respective Feature Sets ({activeTarget.payload.requirements.length})
                      </span>
                      <div className="space-y-2.5">
                        {activeTarget.payload.requirements.map((req: any, idx: number) => (
                          <div key={idx} className="p-3 bg-white rounded border border-mist space-y-1.5">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-ink text-xs">{req.title || `Requirement #${idx + 1}`}</span>
                              {req.link && (
                                <a
                                  href={req.link}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-signal underline text-[11px] inline-flex items-center gap-1"
                                >
                                  <span>Source / Code Link</span>
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              )}
                            </div>
                            <p className="text-ink-muted leading-relaxed whitespace-pre-wrap">{req.response}</p>
                            {req.notes && <div className="text-[11px] text-ink-muted italic">Notes: {req.notes}</div>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Optional Cleaned Dataset Link if available */}
                  {activeTarget.payload?.cleanedDatasetUrl && (
                    <div className="pt-2 border-t border-mist text-[11px] text-ink-muted flex items-center gap-1.5">
                      <span>Cleaned Dataset Reference:</span>
                      <a
                        href={activeTarget.payload.cleanedDatasetUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-signal underline inline-flex items-center gap-1"
                      >
                        {activeTarget.payload.cleanedDatasetUrl}
                        <ExternalLink className="w-2.5 h-2.5" />
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
                      placeholder="Feedback on methodology quality, feature set implementation, and technical validity."
                      className="input-field text-xs"
                    />
                  </div>

                  {evalSubmitError && (
                    <Alert type="error" title="Evaluation Error" className="mt-3">
                      {evalSubmitError}
                    </Alert>
                  )}

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
          <Card title="Submissions Queue" subtitle="Teams ready for evaluation based on submitted company methodologies">
            {targets.length === 0 ? (
              <div className="p-8 text-center text-xs text-ink-muted">No submissions in queue.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr>
                      <th className="table-header">Team Name</th>
                      <th className="table-header">Company Target</th>
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
                        <td className="table-cell text-xs text-ink font-medium">
                          {t.payload?.companyName || 'Enterprise'}
                        </td>
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
          title="Challenge Materials & Requirements Setup"
          subtitle="Configure the official challenge dataset and the 5 vertical challenge tracks"
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
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative max-w-sm flex-1">
              <input
                type="text"
                placeholder="Filter teams..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input-field pl-9 text-xs"
              />
              <Search className="w-4 h-4 text-ink-muted absolute left-3 top-2.5" />
            </div>

            <Button
              variant="primary"
              size="sm"
              icon={<UserPlus className="w-4 h-4" />}
              onClick={() => {
                setCreateTeamError(null);
                setCreateTeamModal(true);
              }}
            >
              Create Team Manually
            </Button>
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
                      <div className="flex items-center gap-2">
                        <Badge variant={t.disqualified ? 'signal' : 'mist'}>{t.disqualified ? 'Disqualified' : 'Active'}</Badge>
                        <button
                          type="button"
                          onClick={() => {
                            setDeleteTeamError(null);
                            setTeamToDelete(t);
                            setDeleteModalOpen(true);
                          }}
                          className="p-1 rounded text-ink-muted hover:text-signal hover:bg-mist transition-colors"
                          title="Delete Team"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
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

      {/* Tab: Accounts & Roles Management */}
      {isAdmin && activeTab === 'accounts' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative max-w-sm flex-1">
              <input
                type="text"
                placeholder="Search accounts by name or email..."
                value={accountSearch}
                onChange={(e) => setAccountSearch(e.target.value)}
                className="input-field pl-9 text-xs"
              />
              <Search className="w-4 h-4 text-ink-muted absolute left-3 top-2.5" />
            </div>

            <Button
              variant="primary"
              size="sm"
              icon={<UserPlus className="w-4 h-4" />}
              onClick={() => {
                setCreateAccountError(null);
                setCreateAccountModal(true);
              }}
            >
              Create Account
            </Button>
          </div>

          <Card
            title={`Accounts & Permissions (${accounts.length})`}
            subtitle="Manage access roles for administrators, evaluators, and participants"
          >
            {accounts.length === 0 ? (
              <div className="p-8 text-center text-xs text-ink-muted">No accounts registered.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr>
                      <th className="table-header">Full Name</th>
                      <th className="table-header">Authorized Google Email</th>
                      <th className="table-header">Current Role</th>
                      <th className="table-header text-right">Change Role</th>
                    </tr>
                  </thead>
                  <tbody>
                    {accounts
                      .filter(
                        (a) =>
                          a.name?.toLowerCase().includes(accountSearch.toLowerCase()) ||
                          a.email?.toLowerCase().includes(accountSearch.toLowerCase())
                      )
                      .map((acc) => (
                        <tr key={acc._id} className="hover:bg-paper/40 border-b border-mist">
                          <td className="table-cell font-semibold text-ink">{acc.name}</td>
                          <td className="table-cell text-xs text-ink-muted font-mono">{acc.email}</td>
                          <td className="table-cell">
                            <Badge
                              variant={
                                acc.role === 'admin'
                                  ? 'signal'
                                  : acc.role === 'evaluator'
                                  ? 'saffron'
                                  : 'mist'
                              }
                            >
                              {acc.role === 'admin'
                                ? 'Administrator'
                                : acc.role === 'evaluator'
                                ? 'Evaluator'
                                : 'Public Participant'}
                            </Badge>
                          </td>
                          <td className="table-cell text-right">
                            <select
                              value={acc.role}
                              onChange={(e) => handleUpdateRole(acc._id, e.target.value)}
                              className="input-field text-xs py-1 px-2 w-36 inline-block"
                            >
                              <option value="evaluator">Evaluator</option>
                              <option value="admin">Administrator</option>
                              <option value="public">Public</option>
                            </select>
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


      {/* Manual Team Creation Modal */}
      <Modal
        isOpen={createTeamModal}
        onClose={() => setCreateTeamModal(false)}
        title="Create Team Manually"
        description="Specify the team name, leader details, and team member names & emails. Team access accounts and member rosters will be created automatically."
        maxWidth="lg"
      >
        <form onSubmit={handleCreateTeamManually} className="space-y-4 text-xs">
          {createTeamError && <Alert type="error">{createTeamError}</Alert>}

          <div>
            <label className="block font-semibold text-ink uppercase mb-1">
              Team Name *
            </label>
            <input
              type="text"
              required
              value={newTeamName}
              onChange={(e) => setNewTeamName(e.target.value)}
              placeholder="e.g. Neural Dynamics"
              className="input-field"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-ink uppercase mb-1">
                Leader Full Name *
              </label>
              <input
                type="text"
                required
                value={newLeaderName}
                onChange={(e) => setNewLeaderName(e.target.value)}
                placeholder="e.g. Alex Johnson"
                className="input-field"
              />
            </div>

            <div>
              <label className="block font-semibold text-ink uppercase mb-1">
                Leader Email (Google Login) *
              </label>
              <input
                type="email"
                required
                value={newLeaderEmail}
                onChange={(e) => setNewLeaderEmail(e.target.value)}
                placeholder="alex.johnson@gmail.com"
                className="input-field"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-ink uppercase mb-1">
              College / Institution
            </label>
            <input
              type="text"
              value={newCollege}
              onChange={(e) => setNewCollege(e.target.value)}
              placeholder="e.g. Stanford University or Independent"
              className="input-field"
            />
          </div>

          {/* Dynamic Team Members Section */}
          <div className="pt-2 border-t border-mist">
            <div className="flex items-center justify-between mb-2">
              <div>
                <span className="font-semibold text-ink uppercase">Team Members</span>
                <span className="text-[11px] text-ink-muted ml-2">(Specify name and email for each member)</span>
              </div>
              <button
                type="button"
                onClick={handleAddMemberRow}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold text-signal hover:bg-mist transition-colors border border-mist"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Member
              </button>
            </div>

            <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1">
              {newMembers.map((member, idx) => (
                <div key={idx} className="flex items-center gap-2 p-2 rounded bg-paper/60 border border-mist">
                  <div className="text-[11px] font-bold text-ink-muted w-5 text-center">
                    #{idx + 1}
                  </div>
                  <input
                    type="text"
                    value={member.name}
                    onChange={(e) => handleMemberChange(idx, 'name', e.target.value)}
                    placeholder="Member full name"
                    className="input-field text-xs flex-1"
                  />
                  <input
                    type="email"
                    value={member.email}
                    onChange={(e) => handleMemberChange(idx, 'email', e.target.value)}
                    placeholder="member@email.com"
                    className="input-field text-xs flex-1"
                  />
                  {newMembers.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveMemberRow(idx)}
                      className="p-1.5 rounded text-ink-muted hover:text-signal hover:bg-white transition-colors"
                      title="Remove member"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <p className="text-[11px] text-ink-muted mt-2">
              Each member's email will be authorized to access the team workspace and submissions.
            </p>
          </div>

          <div className="pt-3 flex justify-end gap-2 border-t border-mist">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setCreateTeamModal(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={createTeamLoading}
              icon={<UserPlus className="w-4 h-4" />}
            >
              Create Team
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Team Confirmation Modal */}
      <Modal
        isOpen={deleteModalOpen}
        onClose={() => {
          setDeleteTeamError(null);
          setDeleteModalOpen(false);
          setTeamToDelete(null);
        }}
        title="Delete Team Permanently"
      >
        <div className="space-y-4 text-xs text-ink leading-relaxed">
          {deleteTeamError && (
            <Alert type="error" title="Delete Failed">
              {deleteTeamError}
            </Alert>
          )}

          <p>
            Are you sure you want to delete <strong className="text-signal">{teamToDelete?.teamName}</strong>?
          </p>
          <div className="p-3 bg-red-50 text-red-900 rounded border border-red-200 space-y-1">
            <p className="font-bold">This permanent action will remove:</p>
            <ul className="list-disc list-inside space-y-0.5 text-[11px]">
              <li>The team profile and leadership mapping</li>
              <li>All participant records and associated account access</li>
              <li>All submissions across all competition rounds</li>
              <li>All evaluation scores and feedback</li>
              <li>Any published leaderboard snapshot entries</li>
            </ul>
          </div>

          <div className="pt-3 flex justify-end gap-2 border-t border-mist">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setDeleteTeamError(null);
                setDeleteModalOpen(false);
                setTeamToDelete(null);
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              loading={deleteLoading}
              icon={<Trash2 className="w-4 h-4" />}
              onClick={handleDeleteTeam}
            >
              Confirm Delete
            </Button>
          </div>
        </div>
      </Modal>

      {/* Create Account Modal */}
      <Modal
        isOpen={createAccountModal}
        onClose={() => setCreateAccountModal(false)}
        title="Create Evaluator or Admin Account"
        description="Specify name, email, and select role. The user can immediately sign in via Google Auth with this email."
      >
        <form onSubmit={handleCreateAccount} className="space-y-4 text-xs">
          {createAccountError && (
            <Alert type="error" title="Error">
              {createAccountError}
            </Alert>
          )}

          <div>
            <label className="block font-semibold text-ink uppercase mb-1">Full Name *</label>
            <input
              type="text"
              required
              value={newAccountName}
              onChange={(e) => setNewAccountName(e.target.value)}
              placeholder="e.g. Dr. Jane Smith"
              className="input-field"
            />
          </div>

          <div>
            <label className="block font-semibold text-ink uppercase mb-1">
              Google Email Address *
            </label>
            <input
              type="email"
              required
              value={newAccountEmail}
              onChange={(e) => setNewAccountEmail(e.target.value)}
              placeholder="e.g. evaluator@university.edu or @gmail.com"
              className="input-field"
            />
            <p className="text-[11px] text-ink-muted mt-1">
              The user must use this Google email address to sign in.
            </p>
          </div>

          <div>
            <label className="block font-semibold text-ink uppercase mb-1">Account Role *</label>
            <select
              value={newAccountRole}
              onChange={(e) => setNewAccountRole(e.target.value as any)}
              className="input-field"
            >
              <option value="evaluator">Evaluator (Evaluates team submissions and gives scores)</option>
              <option value="admin">Administrator (Full portal, event control & team management)</option>
              <option value="public">Public (Team participant / observer)</option>
            </select>
          </div>

          <div className="pt-3 flex justify-end gap-2 border-t border-mist">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setCreateAccountModal(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={createAccountLoading}
              icon={<UserPlus className="w-4 h-4" />}
            >
              Provision Account
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
