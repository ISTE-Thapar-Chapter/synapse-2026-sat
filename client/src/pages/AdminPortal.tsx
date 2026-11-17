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
import { StageIdentifier, Participant, Team, AuditLogItem } from '../types/index.js';
import {
  Shield,
  Layers,
  Upload,
  Users,
  UserPlus,
  FileCheck,
  Award,
  History,
  AlertTriangle,
  CheckCircle2,
  Lock,
  Unlock,
  Building,
  RotateCcw,
  Search,
} from 'lucide-react';

export const AdminPortal: React.FC = () => {
  const { user } = useAuth();
  const { activeStage, gates, allStages, refreshStage, transitionStage } = useStage();

  const [activeTab, setActiveTab] = useState<
    'stages' | 'imports' | 'teams' | 'accounts' | 'datasets' | 'leaderboard' | 'ranking' | 'audit'
  >('stages');

  const [notice, setNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  // Stage transition modal state
  const [transitionModalOpen, setTransitionModalOpen] = useState(false);
  const [targetStage, setTargetStage] = useState<StageIdentifier>('cleaning');
  const [transitionReason, setTransitionReason] = useState('');
  const [forceException, setForceException] = useState(false);

  // Import state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importPreview, setImportPreview] = useState<any>(null);
  const [rawImportRows, setRawImportRows] = useState<any[]>([]);

  // Teams & Participants state
  const [teams, setTeams] = useState<Team[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [participantSearch, setParticipantSearch] = useState('');
  const [reasonModalOpen, setReasonModalOpen] = useState(false);
  const [reasonAction, setReasonAction] = useState<() => Promise<void>>(() => async () => {});
  const [actionReason, setActionReason] = useState('');

  // Manual Team creation
  const [manualTeamModal, setManualTeamModal] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamLeaderEmail, setNewTeamLeaderEmail] = useState('');

  // Accounts state
  const [accounts, setAccounts] = useState<any[]>([]);
  const [newAccountEmail, setNewAccountEmail] = useState('');
  const [newAccountName, setNewAccountName] = useState('');
  const [newAccountRole, setNewAccountRole] = useState<'public' | 'evaluator' | 'admin'>('evaluator');

  // Datasets state
  const [datasets, setDatasets] = useState<any[]>([]);
  const [newDatasetTitle, setNewDatasetTitle] = useState('');
  const [newDatasetUrl, setNewDatasetUrl] = useState('');
  const [newDatasetStage, setNewDatasetStage] = useState<'cleaning' | 'model-training'>('cleaning');

  // Leaderboard & Ranking preview
  const [leaderboardPreview, setLeaderboardPreview] = useState<any>(null);
  const [rankingPreview, setRankingPreview] = useState<any>(null);

  // Audit state
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);

  // Load data based on active tab
  useEffect(() => {
    if (!user || user.role !== 'admin') return;

    if (activeTab === 'teams') {
      api.get<Team[]>('/admin/teams').then(setTeams).catch(console.error);
      api.get<Participant[]>('/admin/participants').then(setParticipants).catch(console.error);
    } else if (activeTab === 'accounts') {
      api.get<any[]>('/admin/accounts').then(setAccounts).catch(console.error);
    } else if (activeTab === 'datasets') {
      api.get<any[]>('/admin/datasets').then(setDatasets).catch(console.error);
    } else if (activeTab === 'leaderboard') {
      api.get<any>('/leaderboard/preview').then(setLeaderboardPreview).catch(console.error);
    } else if (activeTab === 'ranking') {
      api.get<any>('/ranking/preview').then(setRankingPreview).catch(console.error);
    } else if (activeTab === 'audit') {
      api.get<AuditLogItem[]>('/admin/audit-logs').then(setAuditLogs).catch(console.error);
    }
  }, [activeTab, user]);

  if (!user || user.role !== 'admin') {
    return (
      <EmptyState
        title="Administrator Authority Required"
        description="This administrative switchboard is strictly restricted to event directors and system administrators."
      />
    );
  }

  // Handle stage transition
  const handleTransitionSubmit = async () => {
    if (!transitionReason.trim()) {
      setNotice({ type: 'error', message: 'A written reason is required for every stage transition.' });
      return;
    }
    setLoading(true);
    setNotice(null);
    try {
      await transitionStage(targetStage, transitionReason, forceException);
      setTransitionModalOpen(false);
      setTransitionReason('');
      setForceException(false);
      setNotice({ type: 'success', message: `Stage successfully transitioned to '${targetStage}'.` });
    } catch (err: any) {
      setNotice({ type: 'error', message: err.message || 'Stage transition failed.' });
    } finally {
      setLoading(false);
    }
  };

  // Import preview
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
      setNotice({ type: 'success', message: `Parsed ${res.preview.totalRows} rows. Review preview below.` });
    } catch (err: any) {
      setNotice({ type: 'error', message: err.message || 'Failed to parse import file.' });
    } finally {
      setLoading(false);
    }
  };

  // Import confirm
  const handleConfirmImport = async () => {
    if (!rawImportRows || rawImportRows.length === 0) return;
    setLoading(true);
    setNotice(null);
    try {
      const res = await api.post<any>('/admin/imports/confirm', { rows: rawImportRows });
      setNotice({
        type: 'success',
        message: `Import applied: Created ${res.createdParticipants} participants, ${res.createdTeams} teams, and provisioned ${res.provisionedGoogleAccounts || 0} Google Auth identifiers.`,
      });
      setImportPreview(null);
      setRawImportRows([]);
      setSelectedFile(null);
    } catch (err: any) {
      setNotice({ type: 'error', message: err.message || 'Import confirmation failed.' });
    } finally {
      setLoading(false);
    }
  };

  // Toggle restriction with reason
  const promptRestriction = (p: Participant) => {
    setActionReason('');
    setReasonAction(() => async () => {
      await api.patch(`/admin/participants/${p._id}/restrict`, {
        restricted: !p.restricted,
        reason: actionReason,
      });
      const updated = await api.get<Participant[]>('/admin/participants');
      setParticipants(updated);
      setNotice({
        type: 'success',
        message: `Participant ${p.email} ${!p.restricted ? 'restricted' : 'unrestricted'}.`,
      });
    });
    setReasonModalOpen(true);
  };

  // Toggle team disqualification
  const promptDisqualification = (t: Team) => {
    setActionReason('');
    setReasonAction(() => async () => {
      await api.patch(`/admin/teams/${t._id}/disqualify`, {
        disqualified: !t.disqualified,
        reason: actionReason,
      });
      const updated = await api.get<Team[]>('/admin/teams');
      setTeams(updated);
      setNotice({
        type: 'success',
        message: `Team ${t.teamName} ${!t.disqualified ? 'disqualified' : 'reinstated'}.`,
      });
    });
    setReasonModalOpen(true);
  };

  // Create manual team
  const handleCreateManualTeam = async () => {
    if (!newTeamName.trim() || !newTeamLeaderEmail.trim()) {
      setNotice({ type: 'error', message: 'Team name and leader email are required.' });
      return;
    }
    setLoading(true);
    try {
      await api.post('/admin/teams/manual', {
        teamName: newTeamName,
        leaderEmail: newTeamLeaderEmail,
      });
      setManualTeamModal(false);
      setNewTeamName('');
      setNewTeamLeaderEmail('');
      const updatedTeams = await api.get<Team[]>('/admin/teams');
      setTeams(updatedTeams);
      setNotice({ type: 'success', message: 'Team manually created.' });
    } catch (err: any) {
      setNotice({ type: 'error', message: err.message || 'Failed to create team.' });
    } finally {
      setLoading(false);
    }
  };

  // Create account
  const handleCreateAccount = async () => {
    if (!newAccountEmail.trim() || !newAccountName.trim()) {
      setNotice({ type: 'error', message: 'Email and name are required.' });
      return;
    }
    setLoading(true);
    try {
      await api.post('/admin/accounts', {
        name: newAccountName,
        email: newAccountEmail,
        role: newAccountRole,
      });
      setNewAccountEmail('');
      setNewAccountName('');
      const updated = await api.get<any[]>('/admin/accounts');
      setAccounts(updated);
      setNotice({ type: 'success', message: 'Account created successfully.' });
    } catch (err: any) {
      setNotice({ type: 'error', message: err.message || 'Failed to create account.' });
    } finally {
      setLoading(false);
    }
  };

  // Register dataset
  const handleRegisterDataset = async () => {
    if (!newDatasetTitle.trim() || !newDatasetUrl.trim()) {
      setNotice({ type: 'error', message: 'Title and file URL are required.' });
      return;
    }
    setLoading(true);
    try {
      await api.post('/admin/datasets', {
        stage: newDatasetStage,
        title: newDatasetTitle,
        fileUrl: newDatasetUrl,
        isAvailableToAll: true,
      });
      setNewDatasetTitle('');
      setNewDatasetUrl('');
      const updated = await api.get<any[]>('/admin/datasets');
      setDatasets(updated);
      setNotice({ type: 'success', message: 'Dataset reference registered.' });
    } catch (err: any) {
      setNotice({ type: 'error', message: err.message || 'Failed to register dataset.' });
    } finally {
      setLoading(false);
    }
  };

  // Publish Leaderboard
  const handlePublishLeaderboard = async () => {
    setLoading(true);
    try {
      await api.post('/leaderboard/publish', { tieBreakPolicy: 'score_desc_then_time_asc' });
      setNotice({ type: 'success', message: 'Cleaning leaderboard published as immutable snapshot.' });
      api.get<any>('/leaderboard/preview').then(setLeaderboardPreview);
    } catch (err: any) {
      setNotice({ type: 'error', message: err.message || 'Failed to publish leaderboard.' });
    } finally {
      setLoading(false);
    }
  };

  // Publish Company Assignments
  const handlePublishRanking = async () => {
    setLoading(true);
    try {
      await api.post('/ranking/publish', {});
      setNotice({ type: 'success', message: 'Company assignments published as immutable snapshot.' });
      api.get<any>('/ranking/preview').then(setRankingPreview);
    } catch (err: any) {
      setNotice({ type: 'error', message: err.message || 'Failed to publish company assignments.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Admin Header */}
      <div className="bg-white rounded-lg border border-mist p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-2xl font-serif font-bold text-ink">Event Administration</h1>
              <Badge variant="signal">Admin</Badge>
            </div>
            <p className="text-xs text-ink-muted">
              Current Event Stage:{' '}
              <strong className="text-signal uppercase">{activeStage}</strong> &bull; Superuser:{' '}
              <span className="font-semibold text-ink">{user.email}</span>
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="primary"
              icon={<Layers className="w-4 h-4" />}
              onClick={() => {
                setTargetStage(activeStage);
                setTransitionModalOpen(true);
              }}
            >
              Change Event Stage
            </Button>
          </div>
        </div>

        {notice && (
          <Alert type={notice.type} className="mt-4">
            {notice.message}
          </Alert>
        )}
      </div>

      {/* Admin Tabs */}
      <div className="border-b border-mist flex gap-2 overflow-x-auto no-scrollbar">
        {[
          { id: 'stages', label: 'Stage Control & Gates', icon: <Layers className="w-4 h-4" /> },
          { id: 'imports', label: 'Registration Import', icon: <Upload className="w-4 h-4" /> },
          { id: 'teams', label: 'Teams & Participants', icon: <Users className="w-4 h-4" /> },
          { id: 'accounts', label: 'Accounts & Roles', icon: <UserPlus className="w-4 h-4" /> },
          { id: 'datasets', label: 'Datasets', icon: <FileCheck className="w-4 h-4" /> },
          { id: 'leaderboard', label: 'Leaderboard Center', icon: <Award className="w-4 h-4" /> },
          { id: 'ranking', label: 'Company Placements', icon: <Building className="w-4 h-4" /> },
          { id: 'audit', label: 'Audit Trail', icon: <History className="w-4 h-4" /> },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold whitespace-nowrap border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-signal text-signal'
                : 'border-transparent text-ink-muted hover:text-ink hover:border-mist-dark'
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab 1: Stage Control */}
      {activeTab === 'stages' && (
        <div className="space-y-6">
          <Card
            title="Stage Progression"
            subtitle="Current event status and prerequisite checks"
          >
            <div className="p-4 bg-paper rounded-lg border border-mist space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs text-ink-muted uppercase font-semibold">Active Stage Status</div>
                  <h3 className="text-lg font-bold text-ink uppercase mt-0.5">{activeStage}</h3>
                </div>
                <div>
                  {gates?.canAdvance ? (
                    <Badge variant="success">Conditions Met: Ready to Advance</Badge>
                  ) : (
                    <Badge variant="signal">Blockers Detected</Badge>
                  )}
                </div>
              </div>

              {gates?.blockers && gates.blockers.length > 0 ? (
                <div className="space-y-2">
                  <div className="text-xs font-bold text-signal flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4" />
                    Blockers preventing standard advancement:
                  </div>
                  <ul className="list-disc pl-5 text-xs text-ink space-y-1">
                    {gates.blockers.map((b: string, i: number) => (
                      <li key={i}>{b}</li>
                    ))}
                  </ul>
                </div>
              ) : (
                <p className="text-xs text-emerald-800">
                  All prerequisite criteria for the active stage are completed.
                </p>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* Tab 2: Imports */}
      {activeTab === 'imports' && (
        <div className="space-y-6">
          <Card
            title="Import Registrations"
            subtitle="Upload export file (CSV, Excel, or JSON)"
          >
            <div className="p-6 border-2 border-dashed border-mist-dark rounded-lg text-center bg-paper/30">
              <Upload className="w-8 h-8 text-ink-muted mx-auto mb-2" />
              <div className="text-sm font-semibold text-ink mb-1">
                {selectedFile ? selectedFile.name : 'Select or drop an Unstop export file'}
              </div>
              <p className="text-xs text-ink-muted mb-4">
                Synchronizes teams, participants, and links Google accounts.
              </p>
              <label className="btn-primary cursor-pointer text-xs">
                Browse Export File
                <input
                  type="file"
                  accept=".csv,.xlsx,.json"
                  className="hidden"
                  onChange={handleFilePreview}
                />
              </label>
            </div>

            {importPreview && (
              <div className="mt-6 space-y-4">
                <div className="p-4 bg-paper rounded border border-mist">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-bold text-ink">Import Dry-Run Preview</h4>
                    <Button
                      variant="primary"
                      size="sm"
                      loading={loading}
                      onClick={handleConfirmImport}
                    >
                      Confirm & Apply Changes
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs mb-4">
                    <div className="p-2 bg-white rounded border border-mist">
                      <span className="text-ink-muted">Total Rows:</span>
                      <div className="font-bold text-ink">{importPreview.totalRows}</div>
                    </div>
                    <div className="p-2 bg-white rounded border border-mist">
                      <span className="text-emerald-700">New Participants:</span>
                      <div className="font-bold text-emerald-700">{importPreview.participantsToCreate.length}</div>
                    </div>
                    <div className="p-2 bg-white rounded border border-mist">
                      <span className="text-blue-700">New Teams:</span>
                      <div className="font-bold text-blue-700">{importPreview.teamsToCreate.length}</div>
                    </div>
                    <div className="p-2 bg-white rounded border border-mist">
                      <span className="text-amber-700">Google Auth IDs:</span>
                      <div className="font-bold text-amber-700">{importPreview.googleAuthAccountsToProvision?.length || 0}</div>
                    </div>
                    <div className="p-2 bg-white rounded border border-mist">
                      <span className="text-signal">Row Failures:</span>
                      <div className="font-bold text-signal">{importPreview.errors.length}</div>
                    </div>
                  </div>

                  {importPreview.errors.length > 0 && (
                    <div className="mt-4">
                      <h5 className="text-xs font-bold text-signal mb-1">Row-level Validation Errors:</h5>
                      <div className="max-h-40 overflow-y-auto divide-y divide-mist text-xs">
                        {importPreview.errors.map((err: any, idx: number) => (
                          <div key={idx} className="py-1 text-signal">
                            Row #{err.rowNumber}: {err.reason}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Tab 3: Teams & Participants */}
      {activeTab === 'teams' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between gap-4">
            <div className="relative flex-1 max-w-sm">
              <input
                type="text"
                placeholder="Filter participants or teams..."
                value={participantSearch}
                onChange={(e) => setParticipantSearch(e.target.value)}
                className="input-field pl-9"
              />
              <Search className="w-4 h-4 text-ink-muted absolute left-3 top-2.5" />
            </div>

            <Button
              variant="secondary"
              icon={<Users className="w-4 h-4" />}
              onClick={() => setManualTeamModal(true)}
            >
              Create Team Manually
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card title={`Teams (${teams.length})`}>
              <div className="max-h-96 overflow-y-auto divide-y divide-mist text-xs">
                {teams.map((t) => (
                  <div key={t._id} className="py-3 flex items-center justify-between">
                    <div>
                      <div className="font-bold text-ink flex items-center gap-2">
                        <span>{t.teamName}</span>
                        {t.disqualified && <Badge variant="signal" size="sm">Disqualified</Badge>}
                      </div>
                      <div className="text-[11px] text-ink-muted">
                        Members: {t.members?.length || 0} &bull; Leader:{' '}
                        {(t.leaderId as any)?.email || (t.leaderId as any)?.firstName || 'None'}
                      </div>
                    </div>
                    <div>
                      <Button
                        variant={t.disqualified ? 'secondary' : 'danger'}
                        size="sm"
                        onClick={() => promptDisqualification(t)}
                      >
                        {t.disqualified ? 'Reinstate' : 'Disqualify'}
                      </Button>
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
                      p.email.toLowerCase().includes(participantSearch.toLowerCase()) ||
                      p.firstName.toLowerCase().includes(participantSearch.toLowerCase())
                  )
                  .map((p) => (
                    <div key={p._id} className="py-3 flex items-center justify-between">
                      <div>
                        <div className="font-semibold text-ink flex items-center gap-2">
                          <span>{p.firstName} {p.lastName || ''}</span>
                          {p.restricted && <Badge variant="signal" size="sm">Restricted</Badge>}
                        </div>
                        <div className="text-[11px] text-ink-muted">
                          {p.email} &bull; {p.college}
                        </div>
                      </div>
                      <div>
                        <Button
                          variant={p.restricted ? 'secondary' : 'danger'}
                          size="sm"
                          onClick={() => promptRestriction(p)}
                        >
                          {p.restricted ? 'Lift' : 'Restrict'}
                        </Button>
                      </div>
                    </div>
                  ))}
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* Tab 4: Accounts */}
      {activeTab === 'accounts' && (
        <Card title="Application Accounts" subtitle="Manage permissions for public, evaluators, and administrators">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6 p-4 bg-paper rounded border border-mist">
            <div>
              <label className="block text-xs font-semibold text-ink uppercase mb-1">Display Name</label>
              <input
                type="text"
                placeholder="Dr. S. K. Gupta"
                value={newAccountName}
                onChange={(e) => setNewAccountName(e.target.value)}
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink uppercase mb-1">Google Email</label>
              <input
                type="email"
                placeholder="evaluator@university.edu"
                value={newAccountEmail}
                onChange={(e) => setNewAccountEmail(e.target.value)}
                className="input-field"
              />
            </div>
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <label className="block text-xs font-semibold text-ink uppercase mb-1">Role</label>
                <select
                  value={newAccountRole}
                  onChange={(e) => setNewAccountRole(e.target.value as any)}
                  className="input-field"
                >
                  <option value="evaluator">Evaluator</option>
                  <option value="admin">Administrator</option>
                  <option value="public">Public</option>
                </select>
              </div>
              <Button variant="primary" onClick={handleCreateAccount} loading={loading}>
                Create
              </Button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr>
                  <th className="table-header">Name</th>
                  <th className="table-header">Google Email</th>
                  <th className="table-header">Role</th>
                  <th className="table-header">Created</th>
                </tr>
              </thead>
              <tbody>
                {accounts.map((acc) => (
                  <tr key={acc._id} className="hover:bg-paper/40">
                    <td className="table-cell font-semibold">{acc.name}</td>
                    <td className="table-cell font-mono text-xs">{acc.email}</td>
                    <td className="table-cell">
                      <Badge variant={acc.role === 'admin' ? 'signal' : acc.role === 'evaluator' ? 'saffron' : 'mist'}>
                        {acc.role}
                      </Badge>
                    </td>
                    <td className="table-cell text-xs text-ink-muted">
                      {new Date(acc.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Tab 5: Datasets */}
      {activeTab === 'datasets' && (
        <Card title="Competition Datasets" subtitle="Register datasets for cleaning or model training">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-6 p-4 bg-paper rounded border border-mist">
            <div>
              <label className="block text-xs font-semibold text-ink uppercase mb-1">Stage</label>
              <select
                value={newDatasetStage}
                onChange={(e) => setNewDatasetStage(e.target.value as any)}
                className="input-field"
              >
                <option value="cleaning">Cleaning Round</option>
                <option value="model-training">Model Training Round</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink uppercase mb-1">Title</label>
              <input
                type="text"
                placeholder="e.g. Satellite Imagery v2"
                value={newDatasetTitle}
                onChange={(e) => setNewDatasetTitle(e.target.value)}
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink uppercase mb-1">Dataset URL</label>
              <input
                type="url"
                placeholder="https://datasets.iste.org/..."
                value={newDatasetUrl}
                onChange={(e) => setNewDatasetUrl(e.target.value)}
                className="input-field"
              />
            </div>
            <div className="flex items-end">
              <Button variant="primary" onClick={handleRegisterDataset} loading={loading} className="w-full">
                Register Dataset
              </Button>
            </div>
          </div>

          <div className="space-y-3">
            {datasets.map((ds) => (
              <div key={ds._id} className="p-3 bg-paper rounded border border-mist flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-ink text-sm">{ds.title}</span>
                    <Badge variant="mist">{ds.stage}</Badge>
                  </div>
                  <span className="font-mono text-xs text-signal underline break-all">{ds.fileUrl}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Tab 6: Cleaning Leaderboard Publishing */}
      {activeTab === 'leaderboard' && (
        <Card
          title="Cleaning Leaderboard Publishing Center"
          subtitle="Review calculated scores and tie-breaker ordering before creating an immutable published snapshot"
          action={
            <Button
              variant="primary"
              size="sm"
              icon={<Award className="w-4 h-4" />}
              loading={loading}
              onClick={handlePublishLeaderboard}
            >
              Publish Immutable Leaderboard
            </Button>
          }
        >
          {leaderboardPreview ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs text-ink-muted">
                <span>Calculated Source Evaluations: {leaderboardPreview.sourceEvaluationsCount}</span>
                <span>Pending Evaluations: {leaderboardPreview.pendingCount}</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr>
                      <th className="table-header w-16">Rank</th>
                      <th className="table-header">Team Name</th>
                      <th className="table-header">Score</th>
                      <th className="table-header">Tie-break Detail</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaderboardPreview.entries?.map((e: any) => (
                      <tr key={e.teamId} className="hover:bg-paper/40">
                        <td className="table-cell font-bold">{e.rank}</td>
                        <td className="table-cell font-semibold">{e.teamName}</td>
                        <td className="table-cell font-mono font-bold text-signal">{e.score}</td>
                        <td className="table-cell text-xs text-ink-muted">{e.tieBreakReason || 'Direct Score'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="p-6 text-center text-xs text-ink-muted">Calculating preview...</div>
          )}
        </Card>
      )}

      {/* Tab 7: Company Placements */}
      {activeTab === 'ranking' && (
        <Card
          title="Company Assignment & Ranking Desk"
          subtitle="Deterministic round-robin assignment mapping top model performers to 5 partner organizations"
          action={
            <Button
              variant="primary"
              size="sm"
              icon={<Building className="w-4 h-4" />}
              loading={loading}
              onClick={handlePublishRanking}
            >
              Publish Company Placements
            </Button>
          }
        >
          {rankingPreview ? (
            <div className="space-y-4">
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
                    {rankingPreview.preview?.map((p: any) => (
                      <tr key={p.teamId} className="hover:bg-paper/40">
                        <td className="table-cell font-bold">{p.rank}</td>
                        <td className="table-cell font-semibold">{p.teamName}</td>
                        <td className="table-cell">
                          <span className="font-semibold text-signal">{p.companyName}</span>
                        </td>
                        <td className="table-cell text-xs text-ink-muted">#{p.selectionOrder}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="p-6 text-center text-xs text-ink-muted">Calculating preview...</div>
          )}
        </Card>
      )}

      {/* Tab 8: Audit Trail */}
      {activeTab === 'audit' && (
        <Card title="Immutable Audit Trail" subtitle="Chronological log of administrative actions, state changes, and exceptions">
          <div className="max-h-[500px] overflow-y-auto divide-y divide-mist text-xs">
            {auditLogs.map((log) => (
              <div key={log._id} className="py-2.5 flex items-start justify-between gap-4">
                <div>
                  <div className="font-bold text-ink flex items-center gap-2">
                    <span className="font-mono text-signal">{log.action}</span>
                    <span className="text-ink-muted">&bull; {log.entityType}</span>
                  </div>
                  <div className="text-[11px] text-ink-muted mt-0.5">
                    By: <strong className="text-ink">{log.actorEmail}</strong> &bull;{' '}
                    {new Date(log.timestamp).toLocaleString()}
                  </div>
                  {log.reason && (
                    <div className="text-[11px] text-amber-900 bg-amber-50 p-1 rounded mt-1 border border-amber-200">
                      Reason: {log.reason}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Stage Transition Modal */}
      <Modal
        isOpen={transitionModalOpen}
        onClose={() => setTransitionModalOpen(false)}
        title="Transition Competition Stage"
        description="Advance or return the active event stage. This controls public routing and team submission capabilities."
      >
        <div className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-ink uppercase mb-1">Target Stage</label>
            <select
              value={targetStage}
              onChange={(e) => setTargetStage(e.target.value as any)}
              className="input-field"
            >
              {allStages.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-semibold text-ink uppercase mb-1">
              Transition Reason *
            </label>
            <textarea
              rows={3}
              value={transitionReason}
              onChange={(e) => setTransitionReason(e.target.value)}
              placeholder="Reason for stage change..."
              className="input-field"
            />
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="forceException"
              checked={forceException}
              onChange={(e) => setForceException(e.target.checked)}
              className="rounded border-mist-dark text-signal focus:ring-signal"
            />
            <label htmlFor="forceException" className="text-ink font-semibold">
              Override prerequisite checks
            </label>
          </div>

          <div className="pt-4 flex items-center justify-end gap-2 border-t border-mist">
            <Button variant="secondary" onClick={() => setTransitionModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" loading={loading} onClick={handleTransitionSubmit}>
              Confirm Transition
            </Button>
          </div>
        </div>
      </Modal>

      {/* Reason Confirmation Modal for Restrictions / Disqualifications */}
      <Modal
        isOpen={reasonModalOpen}
        onClose={() => setReasonModalOpen(false)}
        title="Administrative Confirmation"
        description="Eligibility-changing actions require an explicit reason recorded in the audit log."
      >
        <div className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-ink uppercase mb-1">
              Reason for this change *
            </label>
            <textarea
              rows={3}
              value={actionReason}
              onChange={(e) => setActionReason(e.target.value)}
              placeholder="Provide reason for disqualification, restriction, or roster change..."
              className="input-field"
            />
          </div>

          <div className="pt-3 flex justify-end gap-2 border-t border-mist">
            <Button variant="secondary" onClick={() => setReasonModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              disabled={!actionReason.trim()}
              onClick={async () => {
                await reasonAction();
                setReasonModalOpen(false);
              }}
            >
              Confirm Change
            </Button>
          </div>
        </div>
      </Modal>

      {/* Manual Team Creation Modal */}
      <Modal
        isOpen={manualTeamModal}
        onClose={() => setManualTeamModal(false)}
        title="Create Team Manually"
      >
        <div className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-ink uppercase mb-1">Team Registered Name *</label>
            <input
              type="text"
              value={newTeamName}
              onChange={(e) => setNewTeamName(e.target.value)}
              placeholder="e.g. Quantum Pioneers"
              className="input-field"
            />
          </div>
          <div>
            <label className="block font-semibold text-ink uppercase mb-1">Team Leader Email *</label>
            <input
              type="email"
              value={newTeamLeaderEmail}
              onChange={(e) => setNewTeamLeaderEmail(e.target.value)}
              placeholder="leader@college.edu"
              className="input-field"
            />
          </div>
          <div className="pt-3 flex justify-end gap-2 border-t border-mist">
            <Button variant="secondary" onClick={() => setManualTeamModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" loading={loading} onClick={handleCreateManualTeam}>
              Create Team
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
