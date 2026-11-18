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
  AdminQueueState,
  CompanyPoolItem,
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
  Building2,
  Play,
  Pause,
  SkipForward,
  Clock,
  RotateCw,
  CheckCircle2,
  Edit3,
  Gavel,
  DollarSign,
} from 'lucide-react';

export const StaffPortal: React.FC = () => {
  const { user } = useAuth();
  const { activeStage } = useStage();
  const navigate = useNavigate();

  // Role verification
  useEffect(() => {
    if (user && user.role !== 'admin' && user.role !== 'evaluator' && user.role !== 'mentor') {
      navigate('/', { replace: true });
    }
  }, [user, navigate]);

  const isAdmin = user?.role === 'admin';
  const isMentor = user?.role === 'mentor';
  const isEvaluator = user?.role === 'evaluator';

  const [activeTab, setActiveTab] = useState<
    'mentor' | 'auction' | 'evaluations' | 'config' | 'roundrobin' | 'imports' | 'teams' | 'accounts' | 'leaderboard' | 'audit'
  >(isMentor ? 'mentor' : isAdmin ? 'config' : 'evaluations');

  const [notice, setNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  // Round Robin Queue State
  const [adminQueues, setAdminQueues] = useState<{
    queue1: AdminQueueState | null;
    queue2: AdminQueueState | null;
  }>({ queue1: null, queue2: null });
  const [selectedQueueNum, setSelectedQueueNum] = useState<1 | 2>(1);
  const [roundRobinLoading, setRoundRobinLoading] = useState(false);
  const [configModalOpen, setConfigModalOpen] = useState(false);
  const [editingCompanies, setEditingCompanies] = useState<
    Array<{ id?: string; name: string; description: string }>
  >([]);

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
  const [featureDefs, setFeatureDefs] = useState<Array<{ featureIndex: number; title: string; expectedCompany: string }>>([
    { featureIndex: 0, title: '', expectedCompany: '' },
    { featureIndex: 1, title: '', expectedCompany: '' },
    { featureIndex: 2, title: '', expectedCompany: '' },
    { featureIndex: 3, title: '', expectedCompany: '' },
    { featureIndex: 4, title: '', expectedCompany: '' },
  ]);

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
  const [newAccountRole, setNewAccountRole] = useState<'admin' | 'evaluator' | 'mentor' | 'public'>('mentor');
  const [createAccountLoading, setCreateAccountLoading] = useState(false);
  const [createAccountError, setCreateAccountError] = useState<string | null>(null);

  // Leaderboard release toggle
  const [leaderboardVisible, setLeaderboardVisible] = useState<boolean>(false);
  const [togglingLeaderboard, setTogglingLeaderboard] = useState<boolean>(false);

  // Mentor Workspace State
  const [mentorTeams, setMentorTeams] = useState<any[]>([]);
  const [mentorFinalSubmissions, setMentorFinalSubmissions] = useState<any[]>([]);
  const [activeMentorTeam, setActiveMentorTeam] = useState<any | null>(null);
  const [mentorGrades, setMentorGrades] = useState<Array<{
    featureIndex: number;
    title: string;
    companyName: string;
    marks: number;
    accuracyScore: number;
    confidenceScore: number;
    feedback: string;
  }>>([]);
  const [mentorSubmitting, setMentorSubmitting] = useState<boolean>(false);

  // Quiz Marks & Live Auction State
  const [quizScores, setQuizScores] = useState<any[]>([]);
  const [quizMultiplier, setQuizMultiplier] = useState<number>(100);
  const [savingQuizScores, setSavingQuizScores] = useState<boolean>(false);
  const [liveAuctionState, setLiveAuctionState] = useState<any | null>(null);
  const [auctionItemName, setAuctionItemName] = useState<string>('');
  const [auctionItemDesc, setAuctionItemDesc] = useState<string>('');
  const [auctionBasePrice, setAuctionBasePrice] = useState<number>(50);
  const [auctionActionLoading, setAuctionActionLoading] = useState<boolean>(false);
  const [selectedAssignTeamId, setSelectedAssignTeamId] = useState<string>('');

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
      setLeaderboardVisible(!!cfg.leaderboardVisible);
      setQuizMultiplier(cfg.quizMultiplier || 100);
      const reqs = [...(cfg.requirementTitles || [])];
      while (reqs.length < 5) reqs.push('');
      setReqTitles(reqs.slice(0, 5));

      const existingDefs = cfg.featureDefinitions || [];
      const mergedDefs = [0, 1, 2, 3, 4].map((idx) => {
        const found = existingDefs.find((d) => d.featureIndex === idx);
        return {
          featureIndex: idx,
          title: found?.title || reqs[idx] || '',
          expectedCompany: found?.expectedCompany || '',
        };
      });
      setFeatureDefs(mergedDefs);
    } catch (err) {
      console.error(err);
    }
  };

  // Load Round Robin Queues
  const loadRoundRobinQueues = async (silent = false) => {
    if (!silent) setRoundRobinLoading(true);
    try {
      const data = await api.get<{ queue1: AdminQueueState; queue2: AdminQueueState }>('/round-robin/summary');
      setAdminQueues(data);
    } catch (err) {
      console.error(err);
    } finally {
      if (!silent) setRoundRobinLoading(false);
    }
  };

  const handleInitQueue = async (qNum: 1 | 2) => {
    setLoading(true);
    setNotice(null);
    try {
      const res = await api.post<{ message: string; queue: any }>(`/round-robin/queue/${qNum}/initialize`);
      setNotice({ type: 'success', message: res.message });
      await loadRoundRobinQueues(true);
    } catch (err: any) {
      setNotice({ type: 'error', message: err.message || 'Failed to initialize queue.' });
    } finally {
      setLoading(false);
    }
  };

  const handleStartQueue = async (qNum: 1 | 2) => {
    setLoading(true);
    setNotice(null);
    try {
      const res = await api.post<{ message: string; queue: any }>(`/round-robin/queue/${qNum}/start`);
      setNotice({ type: 'success', message: res.message });
      await loadRoundRobinQueues(true);
    } catch (err: any) {
      setNotice({ type: 'error', message: err.message || 'Failed to start queue.' });
    } finally {
      setLoading(false);
    }
  };

  const handlePauseQueue = async (qNum: 1 | 2) => {
    setLoading(true);
    setNotice(null);
    try {
      const res = await api.post<{ message: string; queue: any }>(`/round-robin/queue/${qNum}/pause`);
      setNotice({ type: 'success', message: res.message });
      await loadRoundRobinQueues(true);
    } catch (err: any) {
      setNotice({ type: 'error', message: err.message || 'Failed to pause queue.' });
    } finally {
      setLoading(false);
    }
  };

  const handleResumeQueue = async (qNum: 1 | 2) => {
    setLoading(true);
    setNotice(null);
    try {
      const res = await api.post<{ message: string; queue: any }>(`/round-robin/queue/${qNum}/resume`);
      setNotice({ type: 'success', message: res.message });
      await loadRoundRobinQueues(true);
    } catch (err: any) {
      setNotice({ type: 'error', message: err.message || 'Failed to resume queue.' });
    } finally {
      setLoading(false);
    }
  };

  const handleEnableQueue = async (qNum: 1 | 2) => {
    setLoading(true);
    setNotice(null);
    try {
      const res = await api.post<{ message: string; queue: any }>(`/round-robin/queue/${qNum}/enable`);
      setNotice({ type: 'success', message: res.message });
      await loadRoundRobinQueues(true);
    } catch (err: any) {
      setNotice({ type: 'error', message: err.message || 'Failed to enable queue.' });
    } finally {
      setLoading(false);
    }
  };

  const handleDisableQueue = async (qNum: 1 | 2) => {
    setLoading(true);
    setNotice(null);
    try {
      const res = await api.post<{ message: string; queue: any }>(`/round-robin/queue/${qNum}/disable`);
      setNotice({ type: 'success', message: res.message });
      await loadRoundRobinQueues(true);
    } catch (err: any) {
      setNotice({ type: 'error', message: err.message || 'Failed to disable queue.' });
    } finally {
      setLoading(false);
    }
  };

  const handleNextTurn = async (qNum: 1 | 2) => {
    setLoading(true);
    setNotice(null);
    try {
      const res = await api.post<{ message: string; queue: any }>(`/round-robin/queue/${qNum}/next-turn`, { skip: true });
      setNotice({ type: 'success', message: res.message });
      await loadRoundRobinQueues(true);
    } catch (err: any) {
      setNotice({ type: 'error', message: err.message || 'Failed to advance turn.' });
    } finally {
      setLoading(false);
    }
  };

  const openConfigCompanies = (qNum: 1 | 2) => {
    setSelectedQueueNum(qNum);
    const currentQ = qNum === 1 ? adminQueues.queue1 : adminQueues.queue2;
    if (currentQ && currentQ.companies) {
      setEditingCompanies(currentQ.companies.map((c) => ({ id: c.id, name: c.name, description: c.description })));
    } else {
      setEditingCompanies([]);
    }
    setConfigModalOpen(true);
  };

  const handleSaveCompanies = async () => {
    setLoading(true);
    setNotice(null);
    try {
      const valid = editingCompanies.filter((c) => c.name.trim().length >= 2 && c.description.trim().length >= 5);
      if (valid.length === 0) {
        throw new Error('Please configure at least one valid company with name and description.');
      }
      const res = await api.put<{ message: string; queue: any }>(`/round-robin/queue/${selectedQueueNum}/companies`, {
        companies: valid,
      });
      setNotice({ type: 'success', message: res.message });
      setConfigModalOpen(false);
      await loadRoundRobinQueues(true);
    } catch (err: any) {
      setNotice({ type: 'error', message: err.message || 'Failed to save companies.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    if (activeTab === 'mentor') {
      loadMentorData();
    } else if (activeTab === 'auction') {
      loadQuizAndAuctionData();
      api.get<Team[]>('/admin/teams').then(setTeams).catch(console.error);
      const interval = setInterval(loadQuizAndAuctionData, 4000);
      return () => clearInterval(interval);
    } else if (activeTab === 'evaluations') {
      loadQueue();
    } else if (activeTab === 'config') {
      loadConfig();
    } else if (activeTab === 'roundrobin') {
      loadRoundRobinQueues();
      const interval = setInterval(() => {
        loadRoundRobinQueues(true);
      }, 3000);
      return () => clearInterval(interval);
    } else if (activeTab === 'teams') {
      api.get<Team[]>('/admin/teams').then(setTeams).catch(console.error);
      api.get<Participant[]>('/admin/participants').then(setParticipants).catch(console.error);
    } else if (activeTab === 'accounts') {
      api.get<any[]>('/admin/accounts').then(setAccounts).catch(console.error);
    } else if (activeTab === 'audit') {
      api.get<AuditLogItem[]>('/admin/audit-logs').then(setAuditLogs).catch(console.error);
    }
  }, [activeTab, user]);

  if (!user || (user.role !== 'admin' && user.role !== 'evaluator' && user.role !== 'mentor')) {
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
      const titles = featureDefs.map((f) => f.title.trim()).filter((t) => t.length > 0);
      const updated = await api.patch<CompetitionConfig>('/admin/config', {
        cleaningDatasetTitle: datasetTitle,
        cleaningDatasetUrl: datasetUrl,
        cleaningDatasetDescription: datasetDesc,
        requirementTitles: titles.length > 0 ? titles : reqTitles.filter((t) => t.trim().length > 0),
        featureDefinitions: featureDefs,
      });
      setConfig(updated);
      setNotice({ type: 'success', message: 'Dataset and feature answer key updated successfully.' });
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

  // Admin: Toggle Leaderboard Visibility
  const handleToggleLeaderboard = async () => {
    setTogglingLeaderboard(true);
    setNotice(null);
    try {
      const res = await api.post<{ message: string; leaderboardVisible: boolean }>('/admin/config/leaderboard-visibility', {});
      setLeaderboardVisible(res.leaderboardVisible);
      setNotice({ type: 'success', message: res.message });
      if (config) {
        setConfig({ ...config, leaderboardVisible: res.leaderboardVisible });
      }
    } catch (err: any) {
      setNotice({ type: 'error', message: err.message || 'Failed to toggle leaderboard visibility.' });
    } finally {
      setTogglingLeaderboard(false);
    }
  };

  // Mentor: Load teams for grading
  const loadMentorData = async () => {
    try {
      const res = await api.get<{ teams: any[] }>('/mentor/teams');
      setMentorTeams(res.teams || []);
      const finalRes = await api.get<{ submissions: any[] }>('/mentor/final-submissions');
      setMentorFinalSubmissions(finalRes.submissions || []);
    } catch (err) {
      console.error('[Mentor] Error loading teams:', err);
    }
  };

  const selectTeamForMentorGrading = (teamItem: any) => {
    setActiveMentorTeam(teamItem);
    const existingMentorGrades = teamItem.mentorEvaluation?.featureGrades || [];

    const grades = (teamItem.features || []).map((f: any, idx: number) => {
      const matched = existingMentorGrades.find((g: any) => g.featureIndex === f.featureIndex || g.featureIndex === idx);
      return {
        featureIndex: f.featureIndex ?? idx,
        title: f.title || `Feature ${idx + 1}`,
        companyName: f.companyName || '',
        marks: matched ? matched.marks : 8,
        accuracyScore: matched ? matched.accuracyScore : 80,
        confidenceScore: matched ? matched.confidenceScore : 85,
        feedback: matched ? matched.feedback || '' : '',
      };
    });

    setMentorGrades(grades);
  };

  const handleMentorGradeChange = (
    index: number,
    field: 'marks' | 'accuracyScore' | 'confidenceScore' | 'feedback',
    val: any
  ) => {
    const updated = [...mentorGrades];
    if (updated[index]) {
      updated[index] = { ...updated[index], [field]: val };
      setMentorGrades(updated);
    }
  };

  const handleSaveMentorGrades = async () => {
    if (!activeMentorTeam) return;
    setMentorSubmitting(true);
    setNotice(null);
    try {
      const payload = {
        teamId: activeMentorTeam.teamId,
        featureGrades: mentorGrades.map((g) => ({
          featureIndex: g.featureIndex,
          companyName: g.companyName,
          marks: Number(g.marks),
          accuracyScore: Number(g.accuracyScore),
          confidenceScore: Number(g.confidenceScore),
          feedback: g.feedback,
        })),
      };

      await api.post('/mentor/grade-features', payload);
      setNotice({ type: 'success', message: `Feature review submitted successfully for ${activeMentorTeam.teamName}!` });
      setActiveMentorTeam(null);
      await loadMentorData();
    } catch (err: any) {
      setNotice({ type: 'error', message: err.message || 'Failed to submit mentor review.' });
    } finally {
      setMentorSubmitting(false);
    }
  };

  // Auction & Quiz Marks: Load data
  const loadQuizAndAuctionData = async () => {
    try {
      const quizRes = await api.get<{ multiplier: number; scores: any[] }>('/auction/staff/quiz-scores');
      setQuizScores(quizRes.scores || []);
      setQuizMultiplier(quizRes.multiplier || 100);

      const auctionRes = await api.get<{ liveAuction: any }>('/auction/live');
      setLiveAuctionState(auctionRes.liveAuction || null);
    } catch (err) {
      console.error('[Auction] Error loading data:', err);
    }
  };

  const handleQuizScoreChange = (teamId: string, marks: number) => {
    setQuizScores((prev) =>
      prev.map((item) =>
        item.teamId === teamId
          ? {
              ...item,
              quizMarks: marks,
              auctionBalance: Math.round(marks * quizMultiplier),
              remainingBalance: Math.max(0, Math.round(marks * quizMultiplier) - (item.spentTokens || 0)),
            }
          : item
      )
    );
  };

  const handleSaveQuizScores = async () => {
    setSavingQuizScores(true);
    setNotice(null);
    try {
      await api.post('/auction/staff/quiz-scores', {
        multiplier: quizMultiplier,
        scores: quizScores.map((s) => ({
          teamId: s.teamId,
          quizMarks: Number(s.quizMarks) || 0,
        })),
      });
      setNotice({ type: 'success', message: 'Quiz marks and team auction balances saved successfully!' });
      await loadQuizAndAuctionData();
    } catch (err: any) {
      setNotice({ type: 'error', message: err.message || 'Failed to save quiz scores.' });
    } finally {
      setSavingQuizScores(false);
    }
  };

  const handleStartAuctionItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auctionItemName.trim()) {
      setNotice({ type: 'error', message: 'Company name is required to start live bidding.' });
      return;
    }
    setAuctionActionLoading(true);
    setNotice(null);
    try {
      const res = await api.post<{ message: string; liveAuction: any }>('/auction/staff/start-item', {
        name: auctionItemName.trim(),
        description: auctionItemDesc.trim(),
        basePrice: Number(auctionBasePrice) || 0,
      });
      setLiveAuctionState(res.liveAuction);
      setAuctionItemName('');
      setAuctionItemDesc('');
      setNotice({ type: 'success', message: res.message });
    } catch (err: any) {
      setNotice({ type: 'error', message: err.message || 'Failed to start auction item.' });
    } finally {
      setAuctionActionLoading(false);
    }
  };

  const handlePauseAuction = async () => {
    setAuctionActionLoading(true);
    setNotice(null);
    try {
      const res = await api.post<{ message: string; liveAuction: any }>('/auction/staff/pause', {});
      setLiveAuctionState(res.liveAuction);
      setNotice({ type: 'success', message: res.message });
    } catch (err: any) {
      setNotice({ type: 'error', message: err.message || 'Failed to pause auction.' });
    } finally {
      setAuctionActionLoading(false);
    }
  };

  const handleFinalizeAuction = async () => {
    setAuctionActionLoading(true);
    setNotice(null);
    try {
      const res = await api.post<{ message: string; liveAuction: any }>('/auction/staff/finalize', {});
      setLiveAuctionState(res.liveAuction);
      setNotice({ type: 'success', message: res.message });
      await loadQuizAndAuctionData();
    } catch (err: any) {
      setNotice({ type: 'error', message: err.message || 'Failed to finalize auction item.' });
    } finally {
      setAuctionActionLoading(false);
    }
  };

  const handleAssignAuctionCompany = async () => {
    if (!selectedAssignTeamId) {
      setNotice({ type: 'error', message: 'Please select a team to assign this company.' });
      return;
    }
    setAuctionActionLoading(true);
    setNotice(null);
    try {
      const res = await api.post<{ message: string; liveAuction: any; assignedTeamName: string }>('/auction/staff/assign', {
        teamId: selectedAssignTeamId,
      });
      setLiveAuctionState(res.liveAuction);
      setNotice({ type: 'success', message: res.message });
      setSelectedAssignTeamId('');
      await loadQuizAndAuctionData();
    } catch (err: any) {
      setNotice({ type: 'error', message: err.message || 'Failed to assign auction company.' });
    } finally {
      setAuctionActionLoading(false);
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
        {/* Mentor Grading Workspace */}
        {(isMentor || isAdmin || isEvaluator) && (
          <button
            onClick={() => setActiveTab('mentor')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold whitespace-nowrap border-b-2 transition-colors ${
              activeTab === 'mentor' ? 'border-signal text-signal' : 'border-transparent text-ink-muted hover:text-ink'
            }`}
          >
            <Award className="w-4 h-4" />
            <span>Mentor Review (5 Feature Sets)</span>
          </button>
        )}

        {/* Live Company Auction */}
        {(isAdmin || isEvaluator) && (
          <button
            onClick={() => setActiveTab('auction')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold whitespace-nowrap border-b-2 transition-colors ${
              activeTab === 'auction' ? 'border-signal text-signal' : 'border-transparent text-ink-muted hover:text-ink'
            }`}
          >
            <Gavel className="w-4 h-4" />
            <span>Live Company Auction</span>
          </button>
        )}

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

        {(isAdmin || isEvaluator) && (
          <button
            onClick={() => setActiveTab('evaluations')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold whitespace-nowrap border-b-2 transition-colors ${
              activeTab === 'evaluations' ? 'border-signal text-signal' : 'border-transparent text-ink-muted hover:text-ink'
            }`}
          >
            <ClipboardCheck className="w-4 h-4" />
            <span>Evaluation Workspace</span>
          </button>
        )}

        <button
          onClick={() => setActiveTab('roundrobin')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold whitespace-nowrap border-b-2 transition-colors ${
            activeTab === 'roundrobin' ? 'border-signal text-signal' : 'border-transparent text-ink-muted hover:text-ink'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Company Allocation (Round Robin)</span>
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

      {/* ========================================================= */}
      {/* TAB: MENTOR REVIEW WORKSPACE */}
      {/* ========================================================= */}
      {(isMentor || isAdmin || isEvaluator) && activeTab === 'mentor' && (
        <div className="space-y-6">
          {activeMentorTeam ? (
            <Card
              title={`Mentor Review: ${activeMentorTeam.teamName}`}
              subtitle="Evaluate the team's identified companies across the 5 feature sets (10 marks each, 50 marks max)"
              action={
                <Button variant="secondary" size="sm" onClick={() => setActiveMentorTeam(null)}>
                  Close Review Panel
                </Button>
              }
            >
              <div className="space-y-6">
                {/* Scoring Header */}
                <div className="p-4 bg-paper rounded-lg border border-mist flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <span className="text-xs text-ink-muted uppercase font-bold tracking-wider">Evaluation Metrics</span>
                    <h3 className="text-lg font-bold text-ink mt-0.5">{activeMentorTeam.teamName}</h3>
                  </div>

                  <div className="flex items-center gap-6 text-xs">
                    <div className="text-center">
                      <span className="text-ink-muted block text-[11px] uppercase font-semibold">Total Marks</span>
                      <span className="font-mono text-xl font-bold text-signal">
                        {mentorGrades.reduce((sum, g) => sum + Number(g.marks || 0), 0)} / 50
                      </span>
                    </div>
                    <div className="text-center">
                      <span className="text-ink-muted block text-[11px] uppercase font-semibold">Avg Accuracy</span>
                      <span className="font-mono text-xl font-bold text-ink">
                        {Math.round(
                          mentorGrades.reduce((sum, g) => sum + Number(g.accuracyScore || 0), 0) /
                            (mentorGrades.length || 1)
                        )}
                        %
                      </span>
                    </div>
                    <div className="text-center">
                      <span className="text-ink-muted block text-[11px] uppercase font-semibold">Avg Confidence</span>
                      <span className="font-mono text-xl font-bold text-ink">
                        {Math.round(
                          mentorGrades.reduce((sum, g) => sum + Number(g.confidenceScore || 0), 0) /
                            (mentorGrades.length || 1)
                        )}
                        %
                      </span>
                    </div>
                  </div>
                </div>

                {/* 5 Feature Cards */}
                <div className="space-y-4">
                  {mentorGrades.map((gradeItem, idx) => (
                    <div key={idx} className="p-4 rounded-lg border border-mist bg-white space-y-3 shadow-xs">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-mist/60 pb-2">
                        <span className="text-xs font-bold text-signal uppercase tracking-wider">
                          Feature {idx + 1}: {gradeItem.title}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-ink-muted">Identified Company:</span>
                          <span className="text-xs font-bold text-ink bg-mist/60 px-2.5 py-1 rounded">
                            {gradeItem.companyName || 'Not Provided'}
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
                        <div>
                          <label className="block text-[11px] font-semibold text-ink uppercase mb-1">
                            Marks (0 - 10) *
                          </label>
                          <input
                            type="number"
                            min={0}
                            max={10}
                            value={gradeItem.marks}
                            onChange={(e) => handleMentorGradeChange(idx, 'marks', Math.min(10, Math.max(0, parseInt(e.target.value, 10) || 0)))}
                            className="input-field text-xs font-mono font-bold"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-ink uppercase mb-1">
                            Accuracy Rating (0 - 100%) *
                          </label>
                          <input
                            type="number"
                            min={0}
                            max={100}
                            value={gradeItem.accuracyScore}
                            onChange={(e) => handleMentorGradeChange(idx, 'accuracyScore', Math.min(100, Math.max(0, parseInt(e.target.value, 10) || 0)))}
                            className="input-field text-xs font-mono"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-ink uppercase mb-1">
                            Confidence Rating (0 - 100%) *
                          </label>
                          <input
                            type="number"
                            min={0}
                            max={100}
                            value={gradeItem.confidenceScore}
                            onChange={(e) => handleMentorGradeChange(idx, 'confidenceScore', Math.min(100, Math.max(0, parseInt(e.target.value, 10) || 0)))}
                            className="input-field text-xs font-mono"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-ink uppercase mb-1">
                          Mentor Feedback & Recommendations (Optional)
                        </label>
                        <input
                          type="text"
                          value={gradeItem.feedback}
                          onChange={(e) => handleMentorGradeChange(idx, 'feedback', e.target.value)}
                          placeholder="Constructive feedback for this feature..."
                          className="input-field text-xs"
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-mist">
                  <Button variant="secondary" onClick={() => setActiveMentorTeam(null)}>
                    Cancel
                  </Button>
                  <Button variant="primary" loading={mentorSubmitting} onClick={handleSaveMentorGrades}>
                    Save & Submit Mentor Review
                  </Button>
                </div>
              </div>
            </Card>
          ) : (
            <div className="space-y-6">
              <Card
                title="Stage 2: 5 Feature Sets Evaluation"
                subtitle="Review identified companies submitted by each team and record mentor grading"
                action={
                  <Button variant="secondary" size="sm" icon={<RotateCw className="w-3.5 h-3.5" />} onClick={loadMentorData}>
                    Refresh Teams
                  </Button>
                }
              >
                {mentorTeams.length === 0 ? (
                  <div className="p-8 text-center text-xs text-ink-muted">
                    No teams currently available for mentor review.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-mist">
                          <th className="table-header">Team Name</th>
                          <th className="table-header">Stage Status</th>
                          <th className="table-header">Companies Identified</th>
                          <th className="table-header">Mentor Review</th>
                          <th className="table-header text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {mentorTeams.map((teamItem) => {
                          const hasReview = !!teamItem.mentorEvaluation;
                          const totalMarks = teamItem.mentorEvaluation?.totalFeatureMarks ?? 0;
                          const compCount = (teamItem.features || []).filter((f: any) => f.companyName && f.companyName.trim().length > 0).length;

                          return (
                            <tr key={teamItem.teamId} className="border-b border-mist hover:bg-paper/40 transition-colors">
                              <td className="table-cell font-bold text-ink">{teamItem.teamName}</td>
                              <td className="table-cell">
                                {teamItem.submissionStatus === 'submitted' ? (
                                  <Badge variant="signal">Submitted & Locked</Badge>
                                ) : teamItem.submissionStatus === 'draft' ? (
                                  <Badge variant="saffron">Draft In Progress</Badge>
                                ) : (
                                  <Badge variant="mist">Not Started</Badge>
                                )}
                              </td>
                              <td className="table-cell font-mono font-medium">
                                {compCount} / 5 Features
                              </td>
                              <td className="table-cell">
                                {hasReview ? (
                                  <span className="font-bold text-signal font-mono">
                                    {totalMarks}/50 Marks ({teamItem.mentorEvaluation.overallAccuracyScore}% Acc)
                                  </span>
                                ) : (
                                  <Badge variant="mist">Pending Review</Badge>
                                )}
                              </td>
                              <td className="table-cell text-right">
                                <Button
                                  variant={hasReview ? 'secondary' : 'primary'}
                                  size="sm"
                                  onClick={() => selectTeamForMentorGrading(teamItem)}
                                >
                                  {hasReview ? 'Edit Grade' : 'Grade Features'}
                                </Button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>

              {/* Stage 5 Final Projects Viewer */}
              <Card
                title="Stage 5: Final Project Deliverables"
                subtitle="Review product pitches, prototypes, and repositories submitted upon completion of company allocation"
              >
                {mentorFinalSubmissions.length === 0 ? (
                  <div className="p-8 text-center text-xs text-ink-muted">
                    No teams have submitted final projects yet. Projects appear once teams acquire two companies and submit their pitch.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {mentorFinalSubmissions.map((sub: any) => (
                      <div key={sub.submissionId} className="p-4 bg-white rounded-lg border border-mist space-y-3 shadow-xs">
                        <div className="flex items-center justify-between border-b border-mist pb-2">
                          <span className="font-bold text-ink text-sm">{sub.teamName}</span>
                          <Badge variant="signal">Final Submitted</Badge>
                        </div>
                        <div>
                          <span className="text-[11px] font-bold text-signal uppercase tracking-wider">Product Name</span>
                          <h4 className="text-base font-bold text-ink mt-0.5">{sub.finalSubmission?.productName || 'Untitled Project'}</h4>
                        </div>
                        <div>
                          <span className="text-[11px] font-semibold text-ink-muted uppercase">Description</span>
                          <p className="text-xs text-ink mt-0.5 leading-relaxed">{sub.finalSubmission?.productDescription || 'No description provided.'}</p>
                        </div>
                        <div className="flex items-center gap-3 pt-2 border-t border-mist/60 text-xs">
                          {sub.finalSubmission?.prototypeUrl && (
                            <a
                              href={sub.finalSubmission.prototypeUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-signal hover:underline flex items-center gap-1 font-semibold"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                              <span>View Prototype / Demo</span>
                            </a>
                          )}
                          {sub.finalSubmission?.githubUrl && (
                            <a
                              href={sub.finalSubmission.githubUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-ink-muted hover:text-ink flex items-center gap-1 font-semibold"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                              <span>GitHub Repository</span>
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB: LIVE COMPANY AUCTION & DIRECT ASSIGNMENT */}
      {/* ========================================================= */}
      {(isAdmin || isEvaluator) && activeTab === 'auction' && (
        <div className="space-y-6">
          <Card
            title="Company Auction Showcase & Assignment"
            subtitle="Showcase companies on the live auction block and assign them directly to participating teams"
          >
            <div className="space-y-6">
              {/* Active Auction Item Status */}
              {liveAuctionState?.activeItem ? (
                <div className="p-6 bg-paper rounded-xl border border-mist space-y-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-mist pb-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge variant={liveAuctionState.status === 'sold' ? 'success' : 'signal'}>
                          {liveAuctionState.status === 'sold' ? 'Assigned' : 'Active Showcase'}
                        </Badge>
                        <h4 className="text-xl font-serif font-bold text-ink">{liveAuctionState.activeItem.name}</h4>
                      </div>
                      <p className="text-xs text-ink-muted mt-1 leading-relaxed max-w-2xl">
                        {liveAuctionState.activeItem.description}
                      </p>
                    </div>

                    <div className="flex items-center gap-4 bg-white px-5 py-3 rounded-lg border border-mist shadow-xs">
                      <div>
                        <span className="text-[10px] text-ink-muted uppercase font-bold block">Initial Bid</span>
                        <span className="text-2xl font-mono font-bold text-signal">
                          {liveAuctionState.activeItem.basePrice || liveAuctionState.currentBid || 0}
                        </span>
                      </div>
                      {liveAuctionState.status === 'sold' && (
                        <div className="border-l border-mist pl-4">
                          <span className="text-[10px] text-emerald-800 uppercase font-bold block">Assigned Team</span>
                          <span className="text-sm font-bold text-emerald-700">
                            {liveAuctionState.highestBidderTeamName || 'Assigned'}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {liveAuctionState.status === 'sold' ? (
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-emerald-50 rounded-lg border border-emerald-200">
                      <div className="flex items-center gap-2 text-xs text-emerald-900 font-medium">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>
                          Company <strong>{liveAuctionState.activeItem.name}</strong> is assigned to team{' '}
                          <strong>{liveAuctionState.highestBidderTeamName}</strong>.
                        </span>
                      </div>
                      <Button
                        variant="primary"
                        size="sm"
                        icon={<Play className="w-3.5 h-3.5" />}
                        onClick={() => {
                          setLiveAuctionState(null);
                        }}
                      >
                        Put Next Company on Block
                      </Button>
                    </div>
                  ) : (
                    <div className="p-4 bg-white rounded-lg border border-mist space-y-4">
                      <h5 className="text-xs font-bold text-ink uppercase tracking-wider">
                        Assign Company to Registered Team
                      </h5>
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                        <div className="flex-1">
                          <select
                            value={selectedAssignTeamId}
                            onChange={(e) => setSelectedAssignTeamId(e.target.value)}
                            className="input-field text-xs w-full font-semibold"
                          >
                            <option value="">-- Select Team to Receive Company --</option>
                            {(teams.length > 0 ? teams : quizScores.map(q => ({ _id: q.teamId, teamName: q.teamName }))).map((tm: any) => (
                              <option key={tm._id || tm.teamId} value={tm._id || tm.teamId}>
                                {tm.teamName} {tm.college ? `(${tm.college})` : ''}
                              </option>
                            ))}
                          </select>
                        </div>

                        <Button
                          variant="primary"
                          loading={auctionActionLoading}
                          icon={<CheckCircle2 className="w-3.5 h-3.5" />}
                          onClick={handleAssignAuctionCompany}
                          disabled={!selectedAssignTeamId}
                        >
                          Assign Company to Selected Team
                        </Button>

                        <Button
                          variant="secondary"
                          onClick={() => setLiveAuctionState(null)}
                        >
                          Cancel / Reset
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <form onSubmit={handleStartAuctionItem} className="p-5 bg-paper rounded-xl border border-mist space-y-4">
                  <h4 className="text-xs font-bold text-ink uppercase tracking-wider">Put a Company on the Block</h4>
                  <p className="text-xs text-ink-muted">
                    Broadcast a company and its initial bid to all participants on the live showcase.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-semibold text-ink uppercase mb-1">Company Name *</label>
                      <input
                        type="text"
                        value={auctionItemName}
                        onChange={(e) => setAuctionItemName(e.target.value)}
                        placeholder="e.g. DeepMind Robotics"
                        className="input-field text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-ink uppercase mb-1">Initial Bid</label>
                      <input
                        type="number"
                        min={0}
                        value={auctionBasePrice}
                        onChange={(e) => setAuctionBasePrice(parseInt(e.target.value, 10) || 0)}
                        className="input-field text-xs font-mono"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-ink uppercase mb-1">Description / Industry Track</label>
                    <input
                      type="text"
                      value={auctionItemDesc}
                      onChange={(e) => setAuctionItemDesc(e.target.value)}
                      placeholder="e.g. Scalable reinforcement learning for autonomous manipulators"
                      className="input-field text-xs"
                    />
                  </div>
                  <div className="flex justify-end pt-2">
                    <Button type="submit" variant="primary" size="sm" loading={auctionActionLoading} icon={<Play className="w-3.5 h-3.5" />}>
                      Showcase on Auction Floor
                    </Button>
                  </div>
                </form>
              )}
            </div>
          </Card>
        </div>
      )}

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
                          <div key={idx} className="p-3 bg-white rounded border border-mist space-y-2">
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
                            {req.companyName && (
                              <div className="text-[11px] font-semibold text-ink">
                                <span className="text-ink-muted font-normal">Target Output Company: </span>
                                <span className="text-signal bg-signal/10 px-2 py-0.5 rounded font-mono">
                                  {req.companyName}
                                </span>
                              </div>
                            )}
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

                {/* Mentor Assessment Summary for Evaluator Guidance */}
                {activeTarget.payload?.mentorEvaluation ? (
                  <div className="p-4 bg-paper rounded-lg border border-mist space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-signal flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Mentor Assessment Summary
                      </span>
                      <span className="text-[11px] text-ink-muted">
                        Evaluator Guide: Award Round 1 Leaderboard score considering mentor marks & accuracy
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="p-3 bg-white rounded border border-mist text-center">
                        <span className="text-[10px] text-ink-muted uppercase block font-semibold">Mentor Marks</span>
                        <span className="text-lg font-bold font-mono text-ink">
                          {activeTarget.payload.mentorEvaluation.totalFeatureMarks ?? activeTarget.payload.mentorEvaluation.totalMarks ?? 0} / 50
                        </span>
                      </div>
                      <div className="p-3 bg-white rounded border border-mist text-center">
                        <span className="text-[10px] text-ink-muted uppercase block font-semibold">Accuracy Score</span>
                        <span className="text-lg font-bold font-mono text-signal">
                          {activeTarget.payload.mentorEvaluation.overallAccuracyScore ?? 0}%
                        </span>
                      </div>
                      <div className="p-3 bg-white rounded border border-mist text-center">
                        <span className="text-[10px] text-ink-muted uppercase block font-semibold">Trust / Confidence</span>
                        <span className="text-lg font-bold font-mono text-emerald-700">
                          {activeTarget.payload.mentorEvaluation.overallConfidenceScore ?? 0}%
                        </span>
                      </div>
                    </div>
                    {activeTarget.payload.mentorEvaluation.feedback && (
                      <div className="text-xs text-ink bg-white p-2.5 rounded border border-mist">
                        <span className="font-semibold text-ink-muted block text-[10px] uppercase">Mentor Feedback:</span>
                        <p className="mt-0.5 leading-relaxed">{activeTarget.payload.mentorEvaluation.feedback}</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-3 bg-amber-50 rounded border border-amber-200 text-xs text-amber-800">
                    Mentor assessment is pending for this submission. Evaluator can set preliminary score or wait for mentor review.
                  </div>
                )}

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-ink uppercase mb-1">
                      Official Round 1 Team Score (0 to 100) *
                    </label>
                    <p className="text-[11px] text-ink-muted mb-2">
                      Official score published to leaderboard based on mentor marks, accuracy, and confidence.
                    </p>
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
                        <td className="table-cell text-xs text-ink font-medium max-w-xs truncate">
                          {Array.isArray(t.payload?.requirements) && t.payload.requirements.some((r: any) => r.companyName)
                            ? t.payload.requirements.map((r: any) => r.companyName).filter(Boolean).join(', ')
                            : t.payload?.companyName || 'Enterprise'}
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

      {/* Tab: Company Allocation (Round Robin) */}
      {activeTab === 'roundrobin' && (
        <div className="space-y-6">
          {/* Queue Selector Subtabs */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-lg border border-mist shadow-sm">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSelectedQueueNum(1)}
                className={`px-4 py-2 rounded-md text-xs font-bold transition-all flex items-center gap-2 ${
                  selectedQueueNum === 1
                    ? 'bg-ink text-white shadow-sm'
                    : 'bg-paper text-ink hover:bg-mist'
                }`}
              >
                <span>Queue 1: Primary Company</span>
                {adminQueues.queue1 && (
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] ${
                      adminQueues.queue1.status === 'active'
                        ? 'bg-emerald-500 text-white animate-pulse'
                        : adminQueues.queue1.status === 'paused'
                        ? 'bg-amber-400 text-ink'
                        : 'bg-mist-dark text-ink-muted'
                    }`}
                  >
                    {adminQueues.queue1.status.toUpperCase()}
                  </span>
                )}
              </button>

              <button
                onClick={() => setSelectedQueueNum(2)}
                className={`px-4 py-2 rounded-md text-xs font-bold transition-all flex items-center gap-2 ${
                  selectedQueueNum === 2
                    ? 'bg-ink text-white shadow-sm'
                    : 'bg-paper text-ink hover:bg-mist'
                }`}
              >
                <span>Queue 2: Secondary Company</span>
                {adminQueues.queue2 && (
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] ${
                      adminQueues.queue2.status === 'active'
                        ? 'bg-emerald-500 text-white animate-pulse'
                        : adminQueues.queue2.status === 'paused'
                        ? 'bg-amber-400 text-ink'
                        : 'bg-mist-dark text-ink-muted'
                    }`}
                  >
                    {adminQueues.queue2.status.toUpperCase()}
                  </span>
                )}
              </button>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                icon={<RotateCw className="w-3.5 h-3.5" />}
                loading={roundRobinLoading}
                onClick={() => loadRoundRobinQueues(false)}
              >
                Refresh Queue State
              </Button>
            </div>
          </div>

          {/* Current Queue Control Panel */}
          {(() => {
            const currentQ = selectedQueueNum === 1 ? adminQueues.queue1 : adminQueues.queue2;
            if (!currentQ) {
              return (
                <div className="p-8 bg-white rounded-lg border border-mist text-center text-xs text-ink-muted">
                  Loading queue information...
                </div>
              );
            }

            const mins = Math.floor(currentQ.remainingSeconds / 60);
            const secs = currentQ.remainingSeconds % 60;
            const timeString = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

            return (
              <div className="space-y-6">
                {/* Active Status & Timer Hero Card */}
                <div className="bg-white rounded-lg border border-mist p-6 shadow-sm space-y-5">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-mist pb-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[11px] font-bold text-signal uppercase tracking-wider">
                          Round Robin Queue #{selectedQueueNum}
                        </span>
                        {currentQ.status === 'active' ? (
                          <Badge variant="signal">Live Turn (Active)</Badge>
                        ) : currentQ.status === 'paused' ? (
                          <Badge variant="saffron">Paused</Badge>
                        ) : currentQ.status === 'completed' ? (
                          <Badge variant="success">Completed</Badge>
                        ) : currentQ.status === 'disabled' ? (
                          <Badge variant="mist">Disabled</Badge>
                        ) : (
                          <Badge variant="outline">Idle</Badge>
                        )}
                      </div>
                      <h3 className="text-lg font-serif font-bold text-ink">{currentQ.title}</h3>
                      <p className="text-xs text-ink-muted mt-0.5">
                        Preference order determined by live leaderboard &bull; Burst time: {currentQ.burstTimeSeconds / 60} minutes (120s) per turn
                      </p>
                    </div>

                    {/* Timer Widget */}
                    <div className="flex items-center gap-4 bg-paper px-4 py-2.5 rounded-lg border border-mist">
                      <Clock className="w-5 h-5 text-signal" />
                      <div>
                        <div className="text-[10px] font-bold uppercase tracking-wider text-ink-muted">
                          {currentQ.status === 'paused' ? 'Paused Timer' : currentQ.status === 'disabled' ? 'Queue Status' : 'Turn Time Remaining'}
                        </div>
                        <div className="font-mono text-xl font-bold text-ink">
                          {currentQ.status === 'disabled' ? 'OFF' : currentQ.status === 'idle' ? '02:00' : timeString}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Active Team Banner */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-paper/70 rounded-lg border border-mist">
                    <div>
                      <span className="text-[11px] font-bold text-ink-muted uppercase">
                        Current Selecting Turn:
                      </span>
                      {currentQ.currentTurnTeam && currentQ.status !== 'disabled' ? (
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-base font-bold text-ink">
                            {currentQ.currentTurnTeam.teamName}
                          </span>
                          <span className="text-xs font-semibold px-2 py-0.5 rounded bg-signal/10 text-signal">
                            Rank #{currentQ.currentTurnTeam.rank} &bull; {currentQ.currentTurnTeam.score} pts
                          </span>
                        </div>
                      ) : (
                        <div className="text-sm font-semibold text-ink-muted mt-0.5">
                          {currentQ.status === 'disabled'
                            ? 'Queue is currently disabled by administrators'
                            : currentQ.status === 'completed'
                            ? 'All teams have completed their selections'
                            : 'No turn active'}
                        </div>
                      )}
                    </div>

                    <div className="text-xs text-ink-muted sm:text-right">
                      <div>Assigned: <strong>{currentQ.selectedTeamsCount}</strong> / {currentQ.totalTeams} Teams</div>
                      <div>Available Companies: <strong>{currentQ.totalCompanies - currentQ.assignedCompaniesCount}</strong> / {currentQ.totalCompanies}</div>
                    </div>
                  </div>

                  {/* Admin Queue Controls */}
                  {isAdmin && (
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                      <div className="flex flex-wrap items-center gap-2">
                        {currentQ.status === 'disabled' ? (
                          <>
                            <Button
                              variant="primary"
                              size="sm"
                              icon={<Play className="w-3.5 h-3.5" />}
                              loading={loading}
                              onClick={() => handleStartQueue(selectedQueueNum)}
                            >
                              Enable & Start
                            </Button>
                            <Button
                              variant="secondary"
                              size="sm"
                              icon={<CheckCircle2 className="w-3.5 h-3.5" />}
                              loading={loading}
                              onClick={() => handleEnableQueue(selectedQueueNum)}
                            >
                              Enable Queue
                            </Button>
                          </>
                        ) : currentQ.status === 'idle' ? (
                          <>
                            <Button
                              variant="primary"
                              size="sm"
                              icon={<Play className="w-3.5 h-3.5" />}
                              loading={loading}
                              onClick={() => handleStartQueue(selectedQueueNum)}
                            >
                              Start Queue
                            </Button>
                            <Button
                              variant="secondary"
                              size="sm"
                              loading={loading}
                              onClick={() => handleDisableQueue(selectedQueueNum)}
                            >
                              Disable Queue
                            </Button>
                          </>
                        ) : currentQ.status === 'active' ? (
                          <>
                            <Button
                              variant="secondary"
                              size="sm"
                              icon={<Pause className="w-3.5 h-3.5" />}
                              loading={loading}
                              onClick={() => handlePauseQueue(selectedQueueNum)}
                            >
                              Pause Queue
                            </Button>
                            <Button
                              variant="secondary"
                              size="sm"
                              loading={loading}
                              onClick={() => handleDisableQueue(selectedQueueNum)}
                            >
                              Disable Queue
                            </Button>
                          </>
                        ) : currentQ.status === 'paused' ? (
                          <>
                            <Button
                              variant="primary"
                              size="sm"
                              icon={<Play className="w-3.5 h-3.5" />}
                              loading={loading}
                              onClick={() => handleResumeQueue(selectedQueueNum)}
                            >
                              Resume Queue
                            </Button>
                            <Button
                              variant="secondary"
                              size="sm"
                              loading={loading}
                              onClick={() => handleDisableQueue(selectedQueueNum)}
                            >
                              Disable Queue
                            </Button>
                          </>
                        ) : (
                          <Button
                            variant="secondary"
                            size="sm"
                            loading={loading}
                            onClick={() => handleDisableQueue(selectedQueueNum)}
                          >
                            Disable Queue
                          </Button>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        {(currentQ.status === 'active' || currentQ.status === 'paused') && (
                          <Button
                            variant="secondary"
                            size="sm"
                            icon={<SkipForward className="w-3.5 h-3.5" />}
                            loading={loading}
                            onClick={() => handleNextTurn(selectedQueueNum)}
                          >
                            Skip / Next Turn
                          </Button>
                        )}

                        <Button
                          variant="secondary"
                          size="sm"
                          icon={<RotateCw className="w-3.5 h-3.5" />}
                          loading={loading}
                          onClick={() => handleInitQueue(selectedQueueNum)}
                        >
                          Initialize from Leaderboard
                        </Button>
                      </div>

                      <Button
                        variant="secondary"
                        size="sm"
                        icon={<Edit3 className="w-3.5 h-3.5" />}
                        onClick={() => openConfigCompanies(selectedQueueNum)}
                      >
                        Configure Companies ({currentQ.companies.length})
                      </Button>
                    </div>
                  )}
                </div>

                {/* Split: Turn Order Table and Company Pool Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Turn Order Table */}
                  <Card
                    title="Ordered Selection Sequence"
                    subtitle={`Teams sorted strictly by leaderboard preference (Total: ${currentQ.teams.length})`}
                  >
                    {currentQ.teams.length === 0 ? (
                      <div className="p-8 text-center text-xs text-ink-muted">
                        Queue has not been initialized. Click "Initialize from Leaderboard" above.
                      </div>
                    ) : (
                      <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
                        <table className="w-full text-left border-collapse">
                          <thead className="sticky top-0 bg-white">
                            <tr>
                              <th className="table-header w-12 text-center">#</th>
                              <th className="table-header">Team</th>
                              <th className="table-header text-right">Score</th>
                              <th className="table-header">Status</th>
                              <th className="table-header">Assigned Company</th>
                            </tr>
                          </thead>
                          <tbody>
                            {currentQ.teams.map((t, idx) => {
                              const isCurrent = currentQ.currentTurnIndex === idx && currentQ.status !== 'completed';
                              return (
                                <tr
                                  key={t.teamId}
                                  className={`border-b border-mist ${
                                    isCurrent ? 'bg-signal/5 font-semibold' : 'hover:bg-paper/40'
                                  }`}
                                >
                                  <td className="table-cell text-center font-mono text-xs">{idx + 1}</td>
                                  <td className="table-cell font-semibold text-xs text-ink">
                                    <div className="flex items-center gap-1.5">
                                      <span>{t.teamName}</span>
                                      {isCurrent && (
                                        <span className="w-2 h-2 rounded-full bg-signal animate-pulse" />
                                      )}
                                    </div>
                                  </td>
                                  <td className="table-cell text-right font-mono text-xs font-bold text-ink">
                                    {t.score}
                                  </td>
                                  <td className="table-cell text-xs">
                                    {t.hasSelected ? (
                                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                        <CheckCircle2 className="w-3 h-3" /> Selected
                                      </span>
                                    ) : isCurrent ? (
                                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 animate-pulse">
                                        Selecting Now
                                      </span>
                                    ) : t.isSkipped ? (
                                      <span className="text-[11px] text-ink-muted">Skipped</span>
                                    ) : (
                                      <span className="text-[11px] text-ink-muted">Waiting</span>
                                    )}
                                  </td>
                                  <td className="table-cell text-xs font-medium text-ink">
                                    {t.selectedCompanyName ? (
                                      <span className="text-signal font-semibold">
                                        {t.selectedCompanyName}
                                      </span>
                                    ) : (
                                      <span className="text-ink-muted italic">—</span>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </Card>

                  {/* Company Pool Cards */}
                  <Card
                    title={`Configured Companies Pool (${currentQ.companies.length})`}
                    subtitle={`Companies available for Queue #${selectedQueueNum}`}
                  >
                    {currentQ.companies.length === 0 ? (
                      <div className="p-8 text-center text-xs text-ink-muted">
                        No companies configured. Click "Configure Companies" to add options.
                      </div>
                    ) : (
                      <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                        {currentQ.companies.map((comp) => (
                          <div
                            key={comp.id}
                            className={`p-3 rounded-lg border transition-all ${
                              comp.isAssigned
                                ? 'bg-paper/40 border-mist opacity-80'
                                : 'bg-white border-mist shadow-xs hover:border-signal/40'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2 mb-1">
                              <h4 className="text-xs font-serif font-bold text-ink">{comp.name}</h4>
                              {comp.isAssigned ? (
                                <Badge variant="signal">Assigned to: {comp.assignedToTeamName}</Badge>
                              ) : (
                                <Badge variant="success">Available</Badge>
                              )}
                            </div>
                            <p className="text-[11px] text-ink-muted leading-relaxed">
                              {comp.description}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </Card>
                </div>
              </div>
            );
          })()}
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
            {/* Leaderboard Visibility Control */}
            <div className="p-4 bg-paper rounded border border-mist flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="text-sm font-bold text-ink">Leaderboard Release to Participants</h4>
                  {leaderboardVisible ? (
                    <Badge variant="signal">Live & Visible to Participants</Badge>
                  ) : (
                    <Badge variant="saffron">Hidden (Scores Masked to 0)</Badge>
                  )}
                </div>
                <p className="text-xs text-ink-muted">
                  {leaderboardVisible
                    ? 'All participants can currently view real-time scores, calculated ranks, and tiebreaker standings.'
                    : 'Scores are currently masked. Participants see 0 score and team names alphabetically until you explicitly release rankings.'}
                </p>
              </div>

              <Button
                variant={leaderboardVisible ? 'secondary' : 'primary'}
                size="sm"
                loading={togglingLeaderboard}
                icon={<Award className="w-3.5 h-3.5" />}
                onClick={handleToggleLeaderboard}
              >
                {leaderboardVisible ? 'Hide Leaderboard (Mask Scores)' : 'Release Leaderboard to Participants'}
              </Button>
            </div>

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
              <div>
                <h4 className="text-sm font-bold text-ink">5 Feature Tracks & Expected Company Answer Keys</h4>
                <p className="text-xs text-ink-muted mt-0.5">
                  Set the feature track titles and correct company answers. System automatically calculates marks upon submission, which mentors can review and adjust.
                </p>
              </div>

              <div className="space-y-3">
                {featureDefs.map((def, idx) => (
                  <div key={idx} className="p-3 bg-white rounded border border-mist space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="w-6 text-xs font-bold text-signal">#{idx + 1}</span>
                      <input
                        type="text"
                        value={def.title}
                        onChange={(e) => {
                          const updated = [...featureDefs];
                          updated[idx] = { ...updated[idx], title: e.target.value };
                          setFeatureDefs(updated);
                          const updatedReqs = [...reqTitles];
                          updatedReqs[idx] = e.target.value;
                          setReqTitles(updatedReqs);
                        }}
                        placeholder={`Feature set ${idx + 1} title (e.g. Behavioral Pattern & Cloud Infrastructure)...`}
                        className="input-field text-xs flex-1"
                      />
                    </div>
                    <div className="flex items-center gap-2 pl-8">
                      <span className="text-[11px] font-semibold text-ink-muted w-32 shrink-0">Expected Company:</span>
                      <input
                        type="text"
                        value={def.expectedCompany}
                        onChange={(e) => {
                          const updated = [...featureDefs];
                          updated[idx] = { ...updated[idx], expectedCompany: e.target.value };
                          setFeatureDefs(updated);
                        }}
                        placeholder={`Correct company answer (e.g. Spotify, Uber, Stripe)...`}
                        className="input-field text-xs flex-1 font-medium text-signal"
                      />
                    </div>
                  </div>
                ))}
              </div>
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
                                  : acc.role === 'mentor'
                                  ? 'navy'
                                  : 'mist'
                              }
                            >
                              {acc.role === 'admin'
                                ? 'Administrator'
                                : acc.role === 'evaluator'
                                ? 'Evaluator'
                                : acc.role === 'mentor'
                                ? 'Mentor'
                                : 'Public Participant'}
                            </Badge>
                          </td>
                          <td className="table-cell text-right">
                            <select
                              value={acc.role}
                              onChange={(e) => handleUpdateRole(acc._id, e.target.value)}
                              className="input-field text-xs py-1 px-2 w-36 inline-block"
                            >
                              <option value="mentor">Mentor</option>
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
        title="Create Staff Account (Mentor, Evaluator, or Admin)"
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
              placeholder="e.g. mentor@university.edu or @gmail.com"
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
              <option value="mentor">Mentor (Reviews 5 feature sets, grades accuracy & confidence)</option>
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

      {/* Modal: Configure Companies */}
      <Modal
        isOpen={configModalOpen}
        onClose={() => setConfigModalOpen(false)}
        title={`Configure Companies for Queue ${selectedQueueNum}`}
      >
        <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
          <p className="text-xs text-ink-muted">
            Configure the distinct pool of company tracks for Queue {selectedQueueNum}. Teams selecting in this queue will choose from these available companies.
          </p>

          <div className="space-y-3">
            {editingCompanies.map((c, idx) => (
              <div key={idx} className="p-3 bg-paper rounded border border-mist space-y-2 relative">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-signal uppercase tracking-wider">
                    Company #{idx + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const updated = [...editingCompanies];
                      updated.splice(idx, 1);
                      setEditingCompanies(updated);
                    }}
                    className="text-red-500 hover:text-red-700 p-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-ink uppercase mb-0.5">Company Name *</label>
                  <input
                    type="text"
                    value={c.name}
                    onChange={(e) => {
                      const updated = [...editingCompanies];
                      updated[idx].name = e.target.value;
                      setEditingCompanies(updated);
                    }}
                    placeholder="e.g. BioGenix Systems"
                    className="input-field text-xs"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-ink uppercase mb-0.5">Description & Track Focus *</label>
                  <textarea
                    rows={2}
                    value={c.description}
                    onChange={(e) => {
                      const updated = [...editingCompanies];
                      updated[idx].description = e.target.value;
                      setEditingCompanies(updated);
                    }}
                    placeholder="Focus area, problem domain, and technical expectations"
                    className="input-field text-xs"
                  />
                </div>
              </div>
            ))}
          </div>

          <Button
            type="button"
            variant="secondary"
            size="sm"
            icon={<Plus className="w-3.5 h-3.5" />}
            onClick={() =>
              setEditingCompanies([
                ...editingCompanies,
                { name: '', description: '' },
              ])
            }
          >
            Add Another Company
          </Button>

          <div className="pt-3 flex justify-end gap-2 border-t border-mist">
            <Button variant="secondary" onClick={() => setConfigModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              loading={loading}
              onClick={handleSaveCompanies}
            >
              Save Companies Pool
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
