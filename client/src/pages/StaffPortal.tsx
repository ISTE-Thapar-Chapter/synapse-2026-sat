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
  AuctionCompanyItem,
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
  HelpCircle,
  Save,
  FileQuestion,
  Lock,
  Unlock,
} from 'lucide-react';

export const StaffPortal: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const { activeStage } = useStage();
  const navigate = useNavigate();

  // Role verification
  useEffect(() => {
    if (!authLoading && user && user.role !== 'admin' && user.role !== 'evaluator' && user.role !== 'mentor' && user.role !== 'desk') {
      navigate('/', { replace: true });
    }
  }, [user, authLoading, navigate]);

  const isAdmin = user?.role === 'admin';
  const isMentor = user?.role === 'mentor';
  const isEvaluator = user?.role === 'evaluator';
  const isDesk = user?.role === 'desk';

  const [activeTab, setActiveTab] = useState<
    'mentor' | 'quiz' | 'auction' | 'evaluations' | 'config' | 'roundrobin' | 'imports' | 'teams' | 'accounts' | 'leaderboard' | 'audit'
  >(isDesk ? 'teams' : isMentor ? 'mentor' : isAdmin ? 'config' : 'evaluations');

  useEffect(() => {
    if (isDesk && activeTab !== 'teams') {
      setActiveTab('teams');
    }
  }, [isDesk, activeTab]);

  const isSafeUrl = (url?: string): boolean => !!url && /^https?:\/\//i.test(url.trim());
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
  const [valDatasetTitle, setValDatasetTitle] = useState('');
  const [valDatasetUrl, setValDatasetUrl] = useState('');
  const [valDatasetDesc, setValDatasetDesc] = useState('');
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

  // Edit Team State
  const [editTeamModal, setEditTeamModal] = useState(false);
  const [teamToEdit, setTeamToEdit] = useState<Team | null>(null);
  const [editTeamName, setEditTeamName] = useState('');
  const [editCollege, setEditCollege] = useState('');
  const [editMembers, setEditMembers] = useState<
    Array<{ id?: string; name: string; email: string; isLeader: boolean }>
  >([]);
  const [editTeamLoading, setEditTeamLoading] = useState(false);
  const [editTeamError, setEditTeamError] = useState<string | null>(null);

  // Manual Account Creation
  const [createAccountModal, setCreateAccountModal] = useState(false);
  const [newAccountName, setNewAccountName] = useState('');
  const [newAccountEmail, setNewAccountEmail] = useState('');
  const [newAccountRole, setNewAccountRole] = useState<'admin' | 'evaluator' | 'mentor' | 'desk' | 'public'>('mentor');
  const [createAccountLoading, setCreateAccountLoading] = useState(false);
  const [createAccountError, setCreateAccountError] = useState<string | null>(null);

  // Leaderboard release toggle
  const [leaderboardVisible, setLeaderboardVisible] = useState<boolean>(false);
  const [togglingLeaderboard, setTogglingLeaderboard] = useState<boolean>(false);

  // Mentor Workspace State
  const [mentorTeams, setMentorTeams] = useState<any[]>([]);
  const [mentorFinalSubmissions, setMentorFinalSubmissions] = useState<any[]>([]);
  const [activeMentorTeam, setActiveMentorTeam] = useState<any | null>(null);
  const [mentorAccuracy, setMentorAccuracy] = useState<number>(0);
  const [mentorConfidence, setMentorConfidence] = useState<number>(0);
  const [mentorMarks, setMentorMarks] = useState<number>(0);
  const [mentorFeedbackText, setMentorFeedbackText] = useState<string>('');
  const [mentorValidationReleased, setMentorValidationReleased] = useState<boolean>(false);
  const [togglingDatasetTeamId, setTogglingDatasetTeamId] = useState<string | null>(null);
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

  // Quiz Marks State (Evaluators & Admins)
  const [quizScores, setQuizScores] = useState<any[]>([]);
  const [quizMultiplier, setQuizMultiplier] = useState<number>(100);
  const [savingQuizScores, setSavingQuizScores] = useState<boolean>(false);
  const [savingSingleTeamId, setSavingSingleTeamId] = useState<string | null>(null);
  const [dirtyTeamIds, setDirtyTeamIds] = useState<Set<string>>(new Set());
  const [quizLoading, setQuizLoading] = useState<boolean>(false);
  const [adminQuizStatus, setAdminQuizStatus] = useState<'not_started' | 'active' | 'closed'>('not_started');
  const [statusUpdating, setStatusUpdating] = useState<boolean>(false);
  const [questionsModalOpen, setQuestionsModalOpen] = useState<boolean>(false);
  const [adminQuizQuestions, setAdminQuizQuestions] = useState<any[]>([]);
  const [questionsLoading, setQuestionsLoading] = useState<boolean>(false);
  const [questionsSaving, setQuestionsSaving] = useState<boolean>(false);
  const [quizTokensReleased, setQuizTokensReleased] = useState<boolean>(false);
  const [tokensReleasing, setTokensReleasing] = useState<boolean>(false);

  // Live Auction State (Admin Only)
  const [liveAuctionState, setLiveAuctionState] = useState<any | null>(null);
  const [auctionItemName, setAuctionItemName] = useState<string>('');
  const [auctionItemDesc, setAuctionItemDesc] = useState<string>('');
  const [auctionBasePrice, setAuctionBasePrice] = useState<number>(50);
  const [auctionActionLoading, setAuctionActionLoading] = useState<boolean>(false);
  const [selectedAssignTeamId, setSelectedAssignTeamId] = useState<string>('');

  // Bucket 2 Auction Companies & Assignments State
  const [auctionCompanies, setAuctionCompanies] = useState<AuctionCompanyItem[]>([]);
  const [teamAssignments, setTeamAssignments] = useState<any[]>([]);
  const [newAuctionCompName, setNewAuctionCompName] = useState<string>('');
  const [newAuctionCompDesc, setNewAuctionCompDesc] = useState<string>('');
  const [newAuctionCompPrice, setNewAuctionCompPrice] = useState<number>(50);
  const [reassignModalTeam, setReassignModalTeam] = useState<any | null>(null);
  const [reassignSelectedCompId, setReassignSelectedCompId] = useState<string>('');
  const [editingCompId, setEditingCompId] = useState<string | null>(null);
  const [editCompName, setEditCompName] = useState<string>('');
  const [editCompDesc, setEditCompDesc] = useState<string>('');
  const [editCompPrice, setEditCompPrice] = useState<number>(50);

  // Evaluation submission error
  const [evalSubmitError, setEvalSubmitError] = useState<string | null>(null);

  // Winners Announcement & Podium State (Admin Only)
  const [winnersAnnounced, setWinnersAnnounced] = useState<boolean>(false);
  const [winnerRank1TeamId, setWinnerRank1TeamId] = useState<string>('');
  const [winnerRank2TeamId, setWinnerRank2TeamId] = useState<string>('');
  const [winnerRank3TeamId, setWinnerRank3TeamId] = useState<string>('');
  const [winnerRank1Title, setWinnerRank1Title] = useState<string>('Synapse 2026 Champion');
  const [winnerRank2Title, setWinnerRank2Title] = useState<string>('First Runner Up');
  const [winnerRank3Title, setWinnerRank3Title] = useState<string>('Second Runner Up');
  const [togglingWinners, setTogglingWinners] = useState<boolean>(false);

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
      setValDatasetTitle(cfg.validationDatasetTitle || '');
      setValDatasetUrl(cfg.validationDatasetUrl || '');
      setValDatasetDesc(cfg.validationDatasetDescription || '');
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

      setWinnersAnnounced(!!cfg.winnersAnnouncement?.announced);
      const existingWinners = cfg.winnersAnnouncement?.winners || [];
      const w1 = existingWinners.find((w) => w.rank === 1);
      const w2 = existingWinners.find((w) => w.rank === 2);
      const w3 = existingWinners.find((w) => w.rank === 3);
      if (w1) {
        setWinnerRank1TeamId(w1.teamId);
        setWinnerRank1Title(w1.prizeTitle || 'Synapse 2026 Champion');
      }
      if (w2) {
        setWinnerRank2TeamId(w2.teamId);
        setWinnerRank2Title(w2.prizeTitle || 'First Runner Up');
      }
      if (w3) {
        setWinnerRank3TeamId(w3.teamId);
        setWinnerRank3Title(w3.prizeTitle || 'Second Runner Up');
      }
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
    } else if (activeTab === 'quiz') {
      loadQuizScores();
    } else if (activeTab === 'auction') {
      loadAuctionData();
      api.get<Team[]>('/admin/teams').then(setTeams).catch(console.error);
      const interval = setInterval(loadAuctionData, 4000);
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

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user || (user.role !== 'admin' && user.role !== 'evaluator' && user.role !== 'mentor')) {
    return (
      <EmptyState
        title="Staff Access Required"
        description="This area is restricted to staff (administrators, evaluators, and mentors). Please sign in with an authorized staff account."
        action={
          <Button onClick={() => navigate('/login?staff=true')} variant="primary" size="sm">
            Sign In to Staff Portal
          </Button>
        }
      />
    );
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
        validationDatasetTitle: valDatasetTitle,
        validationDatasetUrl: valDatasetUrl,
        validationDatasetDescription: valDatasetDesc,
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

  // Mentor: Toggle Validation Dataset Access for a team
  const handleToggleValidationDataset = async (teamId: string, released: boolean) => {
    setTogglingDatasetTeamId(teamId);
    setNotice(null);
    try {
      const res = await api.post<{ message: string; validationDatasetReleased: boolean }>(
        `/mentor/teams/${teamId}/validation-dataset`,
        { released }
      );
      setNotice({ type: 'success', message: res.message });
      if (activeMentorTeam && activeMentorTeam.teamId === teamId) {
        setMentorValidationReleased(res.validationDatasetReleased);
      }
      await loadMentorData();
    } catch (err: any) {
      setNotice({ type: 'error', message: err.message || 'Failed to update validation dataset access.' });
    } finally {
      setTogglingDatasetTeamId(null);
    }
  };

  const selectTeamForMentorGrading = (teamItem: any) => {
    setActiveMentorTeam(teamItem);
    const existing = teamItem.mentorEvaluation;
    // Default accuracy and confidence score should be 0, which mentors will fill up
    setMentorAccuracy(existing ? (existing.overallAccuracyScore ?? 0) : 0);
    setMentorConfidence(existing ? (existing.overallConfidenceScore ?? 0) : 0);
    setMentorMarks(existing ? (existing.totalFeatureMarks ?? existing.totalMarks ?? 0) : 0);
    setMentorFeedbackText(existing?.feedback || '');
    setMentorValidationReleased(!!teamItem.validationDatasetReleased);

    const existingMentorGrades = teamItem.mentorEvaluation?.featureGrades || [];
    const grades = (teamItem.features || []).map((f: any, idx: number) => {
      const matched = existingMentorGrades.find((g: any) => g.featureIndex === f.featureIndex || g.featureIndex === idx);
      return {
        featureIndex: f.featureIndex ?? idx,
        title: f.title || `Feature ${idx + 1}`,
        companyName: f.companyName || '',
        marks: matched ? matched.marks : 0,
        accuracyScore: matched ? matched.accuracyScore : 0,
        confidenceScore: matched ? matched.confidenceScore : 0,
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
        marks: Number(mentorMarks || 0),
        accuracyScore: Number(mentorAccuracy || 0),
        confidenceScore: Number(mentorConfidence || 0),
        feedback: mentorFeedbackText,
        releaseValidationDataset: mentorValidationReleased,
      };

      await api.post('/mentor/grade-features', payload);
      setNotice({ type: 'success', message: `Evaluation review submitted successfully for ${activeMentorTeam.teamName}!` });
      setActiveMentorTeam(null);
      await loadMentorData();
    } catch (err: any) {
      setNotice({ type: 'error', message: err.message || 'Failed to submit mentor review.' });
    } finally {
      setMentorSubmitting(false);
    }
  };

  // Quiz Scores: Load data (Evaluators & Admins)
  const loadQuizScores = async (silent = false) => {
    if (!silent) setQuizLoading(true);
    try {
      const quizRes = await api.get<{
        multiplier: number;
        quizStatus?: string;
        quizTokensReleased?: boolean;
        totalQuestions?: number;
        scores: any[];
      }>('/auction/staff/quiz-scores');
      setQuizScores(quizRes.scores || []);
      setQuizMultiplier(quizRes.multiplier || 100);
      if (quizRes.quizStatus) {
        setAdminQuizStatus(quizRes.quizStatus as any);
      }
      if (quizRes.quizTokensReleased !== undefined) {
        setQuizTokensReleased(!!quizRes.quizTokensReleased);
      }
      setDirtyTeamIds(new Set());
    } catch (err) {
      console.error('[Quiz] Error loading scores:', err);
    } finally {
      if (!silent) setQuizLoading(false);
    }
  };

  const handleReleaseTokens = async () => {
    setTokensReleasing(true);
    setNotice(null);
    try {
      const res = await api.post<{ success: boolean; message: string }>('/quiz/admin/release-tokens');
      setQuizTokensReleased(true);
      setNotice({
        type: 'success',
        message: res.message || 'Bidding tokens released to all participating teams successfully!',
      });
      await loadQuizScores(true);
    } catch (err: any) {
      setNotice({ type: 'error', message: err.message || 'Failed to release bidding tokens.' });
    } finally {
      setTokensReleasing(false);
    }
  };

  const handleRevokeTokens = async () => {
    setTokensReleasing(true);
    setNotice(null);
    try {
      const res = await api.post<{ success: boolean; message: string }>('/quiz/admin/revoke-tokens');
      setQuizTokensReleased(false);
      setNotice({
        type: 'success',
        message: res.message || 'Bidding tokens locked/withheld for adjustments.',
      });
      await loadQuizScores(true);
    } catch (err: any) {
      setNotice({ type: 'error', message: err.message || 'Failed to lock bidding tokens.' });
    } finally {
      setTokensReleasing(false);
    }
  };

  const handleUpdateQuizStatus = async (status: 'not_started' | 'active' | 'closed') => {
    setStatusUpdating(true);
    setNotice(null);
    try {
      await api.post('/quiz/admin/status', { status });
      setAdminQuizStatus(status);
      setNotice({
        type: 'success',
        message: `Assessment status updated to: ${
          status === 'active' ? 'Active (accepting participant responses)' : status === 'closed' ? 'Concluded (responses locked)' : 'Not Started'
        }`,
      });
      await loadQuizScores(true);
    } catch (err: any) {
      setNotice({ type: 'error', message: err.message || 'Failed to update assessment status.' });
    } finally {
      setStatusUpdating(false);
    }
  };

  const handleOpenQuestionsModal = async () => {
    setQuestionsModalOpen(true);
    setQuestionsLoading(true);
    try {
      const res = await api.get<{ questions: any[] }>('/quiz/admin/questions');
      setAdminQuizQuestions(res.questions || []);
    } catch (err: any) {
      setNotice({ type: 'error', message: err.message || 'Failed to load questions.' });
    } finally {
      setQuestionsLoading(false);
    }
  };

  const handleSaveQuestions = async () => {
    setQuestionsSaving(true);
    setNotice(null);
    try {
      await api.put('/quiz/admin/questions', { questions: adminQuizQuestions });
      setNotice({ type: 'success', message: 'All assessment questions saved successfully.' });
      setQuestionsModalOpen(false);
    } catch (err: any) {
      setNotice({ type: 'error', message: err.message || 'Failed to save questions.' });
    } finally {
      setQuestionsSaving(false);
    }
  };

  // Live Auction & Company Allocations: Load data (Admins Only)
  const loadAuctionData = async () => {
    try {
      const auctionRes = await api.get<{ liveAuction: any }>('/auction/live');
      setLiveAuctionState(auctionRes.liveAuction || null);

      const compRes = await api.get<{ companies: AuctionCompanyItem[] }>('/auction/companies');
      setAuctionCompanies(compRes.companies || []);

      const assignRes = await api.get<{ assignments: any[] }>('/auction/staff/assignments');
      setTeamAssignments(assignRes.assignments || []);
      loadQuizScores(true);
    } catch (err) {
      console.error('[Auction] Error loading data:', err);
    }
  };

  const handleQuizScoreChange = (teamId: string, marks: number) => {
    setDirtyTeamIds((prev) => new Set(prev).add(teamId));
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

  const handleSaveSingleTeamScore = async (teamId: string) => {
    const item = quizScores.find((s) => s.teamId === teamId);
    if (!item) return;
    setSavingSingleTeamId(teamId);
    setNotice(null);
    try {
      await api.post(`/auction/staff/quiz-score/${teamId}`, {
        quizMarks: Number(item.quizMarks) || 0,
        multiplier: quizMultiplier,
      });
      setDirtyTeamIds((prev) => {
        const next = new Set(prev);
        next.delete(teamId);
        return next;
      });
      setNotice({ type: 'success', message: `Saved quiz score for ${item.teamName} (${item.quizMarks} marks -> ${item.auctionBalance} tokens)` });
    } catch (err: any) {
      setNotice({ type: 'error', message: err.message || `Failed to save score for ${item.teamName}.` });
    } finally {
      setSavingSingleTeamId(null);
    }
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
      setDirtyTeamIds(new Set());
      setNotice({ type: 'success', message: 'All team quiz marks and auction balances saved successfully!' });
      await loadQuizScores(true);
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
      await loadAuctionData();
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
      await loadAuctionData();
    } catch (err: any) {
      setNotice({ type: 'error', message: err.message || 'Failed to assign auction company.' });
    } finally {
      setAuctionActionLoading(false);
    }
  };

  const handleAddAuctionCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAuctionCompName.trim() || !newAuctionCompDesc.trim()) {
      setNotice({ type: 'error', message: 'Name and description are required for the auction company.' });
      return;
    }
    const newComp: AuctionCompanyItem = {
      id: `auc_${Date.now()}`,
      name: newAuctionCompName.trim(),
      description: newAuctionCompDesc.trim(),
      basePrice: Number(newAuctionCompPrice) || 0,
      isAssigned: false,
    };
    const updated = [...auctionCompanies, newComp];
    try {
      await api.put('/auction/companies', { companies: updated });
      setAuctionCompanies(updated);
      setNewAuctionCompName('');
      setNewAuctionCompDesc('');
      setNewAuctionCompPrice(50);
      setNotice({ type: 'success', message: `Added "${newComp.name}" to Bucket 2 auction companies!` });
    } catch (err: any) {
      setNotice({ type: 'error', message: err.message || 'Failed to add auction company.' });
    }
  };

  const handleDeleteAuctionCompany = async (id: string) => {
    const updated = auctionCompanies.filter((c) => c.id !== id);
    try {
      await api.put('/auction/companies', { companies: updated });
      setAuctionCompanies(updated);
      setNotice({ type: 'success', message: 'Auction company removed from Bucket 2.' });
    } catch (err: any) {
      setNotice({ type: 'error', message: err.message || 'Failed to delete auction company.' });
    }
  };

  const handleSaveEditAuctionCompany = async (id: string) => {
    const updated = auctionCompanies.map((c) =>
      c.id === id
        ? {
            ...c,
            name: editCompName.trim() || c.name,
            description: editCompDesc.trim() || c.description,
            basePrice: Number(editCompPrice) || 0,
          }
        : c
    );
    try {
      await api.put('/auction/companies', { companies: updated });
      setAuctionCompanies(updated);
      setEditingCompId(null);
      setNotice({ type: 'success', message: 'Auction company updated successfully!' });
    } catch (err: any) {
      setNotice({ type: 'error', message: err.message || 'Failed to update company.' });
    }
  };

  const handleStartAuctionFromBucket = async (comp: AuctionCompanyItem) => {
    setAuctionActionLoading(true);
    setNotice(null);
    try {
      const res = await api.post<{ message: string; liveAuction: any }>('/auction/staff/start-item', {
        id: comp.id,
        name: comp.name,
        description: comp.description,
        basePrice: comp.basePrice || 0,
      });
      setLiveAuctionState(res.liveAuction);
      setNotice({ type: 'success', message: `Broadcasting "${comp.name}" on the live auction floor!` });
    } catch (err: any) {
      setNotice({ type: 'error', message: err.message || 'Failed to start auction item.' });
    } finally {
      setAuctionActionLoading(false);
    }
  };

  const handleReassignSubmit = async () => {
    if (!reassignModalTeam) return;
    setAuctionActionLoading(true);
    setNotice(null);
    try {
      const res = await api.post<{ message: string }>('/auction/staff/reassign', {
        teamId: reassignModalTeam.teamId,
        companyId: reassignSelectedCompId || null,
      });
      setNotice({ type: 'success', message: res.message });
      setReassignModalTeam(null);
      setReassignSelectedCompId('');
      await loadAuctionData();
    } catch (err: any) {
      setNotice({ type: 'error', message: err.message || 'Failed to update assignment.' });
    } finally {
      setAuctionActionLoading(false);
    }
  };

  const handleUnassignTeamAuction = async (teamId: string) => {
    setAuctionActionLoading(true);
    setNotice(null);
    try {
      const res = await api.post<{ message: string }>('/auction/staff/reassign', {
        teamId,
        companyId: null,
      });
      setNotice({ type: 'success', message: res.message });
      await loadAuctionData();
    } catch (err: any) {
      setNotice({ type: 'error', message: err.message || 'Failed to unassign company.' });
    } finally {
      setAuctionActionLoading(false);
    }
  };

  const handleToggleFinalSubmission = async () => {
    setEventLoading(true);
    setNotice(null);
    try {
      const res = await api.post<{ message: string; finalSubmissionOpen: boolean }>('/admin/config/final-submission-toggle', {
        open: !config?.finalSubmissionOpen,
      });
      if (config) {
        setConfig({ ...config, finalSubmissionOpen: res.finalSubmissionOpen });
      }
      setNotice({ type: 'success', message: res.message });
    } catch (err: any) {
      setNotice({ type: 'error', message: err.message || 'Failed to toggle final submissions.' });
    } finally {
      setEventLoading(false);
    }
  };

  const handleToggleWinnersAnnouncement = async () => {
    setTogglingWinners(true);
    setNotice(null);
    try {
      const willAnnounce = !winnersAnnounced;
      let winnersPayload: any[] = [];
      if (willAnnounce) {
        const teamPool: any[] = teams.length > 0 ? teams : quizScores.map((q) => ({ _id: q.teamId, teamName: q.teamName, college: q.college }));
        const t1: any = teamPool.find((t: any) => (t._id || t.teamId)?.toString() === winnerRank1TeamId) || teamPool[0];
        const t2: any = teamPool.find((t: any) => (t._id || t.teamId)?.toString() === winnerRank2TeamId) || teamPool[1];
        const t3: any = teamPool.find((t: any) => (t._id || t.teamId)?.toString() === winnerRank3TeamId) || teamPool[2];

        if (t1) {
          winnersPayload.push({
            rank: 1,
            teamId: (t1._id || t1.teamId)?.toString(),
            teamName: t1.teamName,
            college: t1.college || '',
            prizeTitle: winnerRank1Title,
          });
        }
        if (t2) {
          winnersPayload.push({
            rank: 2,
            teamId: (t2._id || t2.teamId)?.toString(),
            teamName: t2.teamName,
            college: t2.college || '',
            prizeTitle: winnerRank2Title,
          });
        }
        if (t3) {
          winnersPayload.push({
            rank: 3,
            teamId: (t3._id || t3.teamId)?.toString(),
            teamName: t3.teamName,
            college: t3.college || '',
            prizeTitle: winnerRank3Title,
          });
        }
      }

      const res = await api.post<{ message: string; winnersAnnouncement: any }>('/admin/config/winners-toggle', {
        announced: willAnnounce,
        winners: willAnnounce ? winnersPayload : [],
      });

      setWinnersAnnounced(res.winnersAnnouncement.announced);
      if (config) {
        setConfig({
          ...config,
          winnersAnnouncement: res.winnersAnnouncement,
        });
      }
      setNotice({ type: 'success', message: res.message });
    } catch (err: any) {
      setNotice({ type: 'error', message: err.message || 'Failed to update winners announcement.' });
    } finally {
      setTogglingWinners(false);
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
      if (isAdmin) {
        const updatedAccounts = await api.get<any[]>('/admin/accounts');
        setAccounts(updatedAccounts);
      }

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

  // Staff (Admin/Desk): Open Edit Team Modal
  const handleOpenEditTeamModal = (team: Team) => {
    setTeamToEdit(team);
    setEditTeamName(team.teamName);

    // Default college from members
    const teamCollege = (team.members?.[0] as any)?.college || 'Independent';
    setEditCollege(teamCollege);

    const leaderIdStr =
      typeof team.leaderId === 'string'
        ? team.leaderId
        : (team.leaderId as any)?._id || (team.leaderId as any)?.id;

    const initialMembers: Array<{ id?: string; name: string; email: string; isLeader: boolean }> = (
      team.members || []
    ).map((m: any) => {
      const isLeader =
        (leaderIdStr && String(m._id) === String(leaderIdStr)) || m.role === 'leader';
      const fullName = `${m.firstName || ''} ${m.lastName || ''}`.trim();
      return {
        id: m._id ? String(m._id) : undefined,
        name: fullName,
        email: m.email || '',
        isLeader: Boolean(isLeader),
      };
    });

    if (initialMembers.length === 0) {
      initialMembers.push({ name: '', email: '', isLeader: true });
    } else if (!initialMembers.some((m) => m.isLeader)) {
      initialMembers[0].isLeader = true;
    }

    setEditMembers(initialMembers);
    setEditTeamError(null);
    setEditTeamModal(true);
  };

  // Staff (Admin/Desk): Save Team Edits
  const handleSaveTeamEdits = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamToEdit) return;

    if (!editTeamName.trim()) {
      setEditTeamError('Team name is required.');
      return;
    }

    if (editMembers.length === 0) {
      setEditTeamError('A team must have at least one member.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const seenEmails = new Set<string>();

    for (let i = 0; i < editMembers.length; i++) {
      const m = editMembers[i];
      const trimmedName = m.name.trim();
      const trimmedEmail = m.email.trim().toLowerCase();

      if (!trimmedName) {
        setEditTeamError(`Member #${i + 1} name is required.`);
        return;
      }
      if (!trimmedEmail || !emailRegex.test(trimmedEmail)) {
        setEditTeamError(`Member #${i + 1} ("${trimmedName}") requires a valid email address.`);
        return;
      }
      if (seenEmails.has(trimmedEmail)) {
        setEditTeamError(`Duplicate email detected: "${trimmedEmail}". Each member must have a distinct email.`);
        return;
      }
      seenEmails.add(trimmedEmail);
    }

    const leaderMember = editMembers.find((m) => m.isLeader) || editMembers[0];
    const leaderEmail = leaderMember.email.trim().toLowerCase();

    const payload = {
      teamName: editTeamName.trim(),
      college: editCollege.trim() || 'Independent',
      leaderEmail,
      members: editMembers.map((m) => ({
        id: m.id,
        name: m.name.trim(),
        email: m.email.trim().toLowerCase(),
        role: m.email.trim().toLowerCase() === leaderEmail ? ('leader' as const) : ('member' as const),
        college: editCollege.trim() || 'Independent',
      })),
    };

    setEditTeamLoading(true);
    setEditTeamError(null);

    try {
      const res = await api.put<any>(`/admin/teams/${teamToEdit._id}`, payload);
      setNotice({
        type: 'success',
        message: `Team "${res.team?.teamName || editTeamName}" updated successfully.`,
      });

      // Refresh data
      const updatedTeams = await api.get<Team[]>('/admin/teams');
      setTeams(updatedTeams);
      const updatedParticipants = await api.get<Participant[]>('/admin/participants');
      setParticipants(updatedParticipants);
      if (isAdmin) {
        const updatedAccounts = await api.get<any[]>('/admin/accounts');
        setAccounts(updatedAccounts);
      }

      setEditTeamModal(false);
      setTeamToEdit(null);
    } catch (err: any) {
      setEditTeamError(err.message || 'Failed to update team.');
    } finally {
      setEditTeamLoading(false);
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
      if (isAdmin) {
        const updatedAccounts = await api.get<any[]>('/admin/accounts');
        setAccounts(updatedAccounts);
      }
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

              <div className="flex items-center gap-2 border-l border-mist pl-3">
                <span className="text-[11px] font-semibold text-ink-muted">Stage 5 Final Pitch:</span>
                <Badge variant={config?.finalSubmissionOpen ? 'success' : 'mist'}>
                  {config?.finalSubmissionOpen ? 'Open' : 'Closed'}
                </Badge>
                <Button
                  variant={config?.finalSubmissionOpen ? 'secondary' : 'primary'}
                  size="sm"
                  loading={eventLoading}
                  onClick={handleToggleFinalSubmission}
                >
                  {config?.finalSubmissionOpen ? 'Close Submissions' : 'Enable Final Submissions'}
                </Button>
              </div>
            </div>
          )}
        </div>

        {notice && <Alert type={notice.type} className="mt-4">{notice.message}</Alert>}
      </div>

      {/* Staff Navigation Tabs */}
      <div className="border-b border-mist flex gap-2 overflow-x-auto no-scrollbar">
        {isDesk ? (
          <button
            onClick={() => setActiveTab('teams')}
            className="flex items-center gap-2 px-4 py-2.5 text-xs font-semibold whitespace-nowrap border-b-2 transition-colors border-signal text-signal"
          >
            <Users className="w-4 h-4" />
            <span>Team Registration & Management</span>
          </button>
        ) : (
          <>
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

            {/* Quiz Scores & Budgets (Evaluators & Admins) */}
            {(isAdmin || isEvaluator) && (
              <button
                onClick={() => setActiveTab('quiz')}
                className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold whitespace-nowrap border-b-2 transition-colors ${
                  activeTab === 'quiz' ? 'border-signal text-signal' : 'border-transparent text-ink-muted hover:text-ink'
                }`}
              >
                <HelpCircle className="w-4 h-4" />
                <span>Quiz Scores & Budgets</span>
              </button>
            )}

            {/* Live Company Auction & Allocations (Admins Only) */}
            {isAdmin && (
              <button
                onClick={() => setActiveTab('auction')}
                className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold whitespace-nowrap border-b-2 transition-colors ${
                  activeTab === 'auction' ? 'border-signal text-signal' : 'border-transparent text-ink-muted hover:text-ink'
                }`}
              >
                <Gavel className="w-4 h-4" />
                <span>Live Auction & Company Allocations</span>
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

            {(isAdmin || isEvaluator) && (
              <button
                onClick={() => setActiveTab('roundrobin')}
                className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold whitespace-nowrap border-b-2 transition-colors ${
                  activeTab === 'roundrobin' ? 'border-signal text-signal' : 'border-transparent text-ink-muted hover:text-ink'
                }`}
              >
                <Building2 className="w-4 h-4" />
                <span>Company Allocation (Round Robin)</span>
              </button>
            )}

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
              subtitle="Review cleaned dataset submission, fill Accuracy & Confidence scores, and manage validation dataset access."
              action={
                <Button variant="secondary" size="sm" onClick={() => setActiveMentorTeam(null)}>
                  Close Review Panel
                </Button>
              }
            >
              <div className="space-y-6">
                {/* Cleaned Dataset Submission Card */}
                <div className="p-4 bg-paper rounded-lg border border-mist space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-mist/60 pb-2">
                    <span className="text-xs font-bold text-signal uppercase tracking-wider">
                      Cleaned Dataset Submission
                    </span>
                    {activeMentorTeam.hasSubmittedCleaning ? (
                      <Badge variant="signal">Cleaned Dataset Submitted</Badge>
                    ) : (
                      <Badge variant="mist">Pending Submission</Badge>
                    )}
                  </div>

                  {activeMentorTeam.hasSubmittedCleaning ? (
                    <div className="space-y-2 text-xs">
                      <div className="flex items-center gap-3">
                        <span className="text-ink-muted font-medium">Dataset Link:</span>
                        {activeMentorTeam.cleanedDatasetUrl && isSafeUrl(activeMentorTeam.cleanedDatasetUrl) ? (
                          <a
                            href={activeMentorTeam.cleanedDatasetUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 font-bold text-signal hover:underline"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            Open / Download Submitted Dataset
                          </a>
                        ) : (
                          <span className="text-ink-muted">No valid link provided</span>
                        )}
                      </div>
                      {activeMentorTeam.cleaningNotes && (
                        <div>
                          <span className="text-ink-muted font-medium block mb-1">Cleaning Approach & Notes:</span>
                          <div className="p-3 bg-white rounded border border-mist text-ink leading-relaxed font-sans">
                            {activeMentorTeam.cleaningNotes}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-ink-muted italic">
                      This team has not submitted their cleaned dataset yet.
                    </p>
                  )}
                </div>

                {/* Validation Dataset Access Control */}
                <div className="p-4 bg-paper rounded-lg border border-mist space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-ink uppercase tracking-wider block">
                        Validation Dataset Access Control
                      </span>
                      <p className="text-xs text-ink-muted mt-0.5">
                        The validation dataset download is disabled for teams by default. Enable access once the team's cleaned dataset meets standards.
                      </p>
                    </div>
                    {mentorValidationReleased ? (
                      <Badge variant="signal">
                        <Unlock className="w-3 h-3 mr-1" />
                        Access Enabled
                      </Badge>
                    ) : (
                      <Badge variant="mist">
                        <Lock className="w-3 h-3 mr-1" />
                        Access Disabled (Locked)
                      </Badge>
                    )}
                  </div>

                  <label className="flex items-start gap-3 cursor-pointer p-3 bg-white rounded border border-mist hover:border-signal/40 transition-colors">
                    <input
                      type="checkbox"
                      checked={mentorValidationReleased}
                      onChange={(e) => setMentorValidationReleased(e.target.checked)}
                      className="mt-0.5 h-4 w-4 rounded border-mist text-signal focus:ring-signal"
                    />
                    <div>
                      <span className="text-xs font-bold text-ink">
                        Release Validation Dataset to {activeMentorTeam.teamName}
                      </span>
                      <p className="text-[11px] text-ink-muted mt-0.5">
                        When enabled, this team's "Download Validation Dataset" button unlocks, allowing them to download the validation dataset link.
                      </p>
                    </div>
                  </label>
                </div>

                {/* Scoring Header & Inputs */}
                <div className="p-4 bg-white rounded-lg border border-mist space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-mist/60 pb-2">
                    <span className="text-xs font-bold text-signal uppercase tracking-wider">
                      Mentor Scoring (Default: 0 - Mentor Filled)
                    </span>
                    <div className="flex items-center gap-4 text-xs font-mono font-bold">
                      <span className="text-ink">Acc: {mentorAccuracy}%</span>
                      <span className="text-ink">Conf: {mentorConfidence}%</span>
                      <span className="text-signal">Marks: {mentorMarks} / 50</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-[11px] font-semibold text-ink uppercase mb-1">
                        Accuracy Score (0 - 100%) *
                      </label>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={mentorAccuracy}
                        onChange={(e) =>
                          setMentorAccuracy(Math.min(100, Math.max(0, parseInt(e.target.value, 10) || 0)))
                        }
                        className="input-field text-xs font-mono font-bold"
                      />
                      <span className="text-[10px] text-ink-muted">Defaults to 0% until filled by mentor.</span>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-ink uppercase mb-1">
                        Confidence Score (0 - 100%) *
                      </label>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={mentorConfidence}
                        onChange={(e) =>
                          setMentorConfidence(Math.min(100, Math.max(0, parseInt(e.target.value, 10) || 0)))
                        }
                        className="input-field text-xs font-mono font-bold"
                      />
                      <span className="text-[10px] text-ink-muted">Defaults to 0% until filled by mentor.</span>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-ink uppercase mb-1">
                        Evaluation Marks (0 - 50) *
                      </label>
                      <input
                        type="number"
                        min={0}
                        max={50}
                        value={mentorMarks}
                        onChange={(e) =>
                          setMentorMarks(Math.min(50, Math.max(0, parseInt(e.target.value, 10) || 0)))
                        }
                        className="input-field text-xs font-mono font-bold text-signal"
                      />
                      <span className="text-[10px] text-ink-muted">Total score allocated for this stage.</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-ink uppercase mb-1">
                      Mentor Feedback & Recommendations (Optional)
                    </label>
                    <textarea
                      rows={3}
                      value={mentorFeedbackText}
                      onChange={(e) => setMentorFeedbackText(e.target.value)}
                      placeholder="Feedback on cleaning methodology, anomaly handling, or next steps..."
                      className="input-field text-xs"
                    />
                  </div>
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
                title="Mentor Review & Validation Dataset Management"
                subtitle="Review cleaned dataset submissions, release validation datasets to eligible teams, and submit Accuracy & Confidence scores"
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
                          <th className="table-header">Cleaned Dataset</th>
                          <th className="table-header">Validation Dataset</th>
                          <th className="table-header">Mentor Assessment</th>
                          <th className="table-header text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {mentorTeams.map((teamItem) => {
                          const hasReview = !!teamItem.mentorEvaluation;
                          const totalMarks = teamItem.mentorEvaluation?.totalMarks ?? teamItem.mentorEvaluation?.totalFeatureMarks ?? 0;
                          const accScore = teamItem.mentorEvaluation?.overallAccuracyScore ?? 0;
                          const confScore = teamItem.mentorEvaluation?.overallConfidenceScore ?? 0;
                          const isReleased = !!teamItem.validationDatasetReleased;
                          const isToggling = togglingDatasetTeamId === teamItem.teamId;

                          return (
                            <tr key={teamItem.teamId} className="border-b border-mist hover:bg-paper/40 transition-colors">
                              <td className="table-cell font-bold text-ink">{teamItem.teamName}</td>
                              <td className="table-cell">
                                {teamItem.hasSubmittedCleaning ? (
                                  <div className="flex items-center gap-2">
                                    <Badge variant="signal">Submitted</Badge>
                                    {teamItem.cleanedDatasetUrl && isSafeUrl(teamItem.cleanedDatasetUrl) && (
                                      <a
                                        href={teamItem.cleanedDatasetUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-signal hover:underline font-mono text-[11px] inline-flex items-center gap-1"
                                      >
                                        <ExternalLink className="w-3 h-3" />
                                        View
                                      </a>
                                    )}
                                  </div>
                                ) : (
                                  <Badge variant="mist">Not Submitted</Badge>
                                )}
                              </td>
                              <td className="table-cell">
                                <div className="flex items-center gap-2">
                                  {isReleased ? (
                                    <Badge variant="signal">
                                      <Unlock className="w-3 h-3 mr-1" />
                                      Released
                                    </Badge>
                                  ) : (
                                    <Badge variant="mist">
                                      <Lock className="w-3 h-3 mr-1" />
                                      Disabled
                                    </Badge>
                                  )}
                                  <Button
                                    variant={isReleased ? 'secondary' : 'primary'}
                                    size="sm"
                                    loading={isToggling}
                                    onClick={() => handleToggleValidationDataset(teamItem.teamId, !isReleased)}
                                  >
                                    {isReleased ? 'Revoke Access' : 'Enable Access'}
                                  </Button>
                                </div>
                              </td>
                              <td className="table-cell">
                                {hasReview ? (
                                  <div className="space-y-0.5">
                                    <span className="font-bold text-signal font-mono">
                                      {totalMarks}/50 Marks
                                    </span>
                                    <span className="text-[11px] text-ink-muted block font-mono">
                                      Acc: {accScore}% | Conf: {confScore}%
                                    </span>
                                  </div>
                                ) : (
                                  <Badge variant="mist">Pending Evaluation</Badge>
                                )}
                              </td>
                              <td className="table-cell text-right">
                                <Button
                                  variant={hasReview ? 'secondary' : 'primary'}
                                  size="sm"
                                  onClick={() => selectTeamForMentorGrading(teamItem)}
                                >
                                  {hasReview ? 'Edit Review' : 'Grade & Review'}
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
                          {sub.finalSubmission?.prototypeUrl && isSafeUrl(sub.finalSubmission.prototypeUrl) && (
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
                          {sub.finalSubmission?.githubUrl && isSafeUrl(sub.finalSubmission.githubUrl) && (
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
      {/* TAB: QUIZ SCORES & BIDDING BUDGETS (Evaluators & Admins) */}
      {/* ========================================================= */}
      {(isAdmin || isEvaluator) && activeTab === 'quiz' && (
        <div className="space-y-6">
          {/* Assessment Flow & Status Controller */}
          <Card
            title="Knowledge Assessment Round Controller"
            subtitle="Start the assessment round for participants, conclude submissions, and manage assessment questions."
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 bg-paper rounded-lg border border-mist">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-ink uppercase tracking-wider">Assessment Status:</span>
                  {adminQuizStatus === 'active' ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-signal text-white animate-pulse">
                      <span className="w-1.5 h-1.5 rounded-full bg-white" />
                      Active & Accepting Responses
                    </span>
                  ) : adminQuizStatus === 'closed' ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-700 text-white">
                      <Lock className="w-3 h-3" />
                      Concluded & Responses Locked
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-mist text-ink">
                      Not Started (Hidden from Participants)
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-ink-muted">
                  {adminQuizStatus === 'active'
                    ? 'Participants can now view assessment questions, select options, and submit responses in real time.'
                    : adminQuizStatus === 'closed'
                    ? 'Submissions are closed. Answers are locked. Automatic scores and tie-breaking timestamps have been recorded.'
                    : 'Participants cannot see questions or submit responses until you start the assessment.'}
                </p>
              </div>

              {isAdmin && (
                <div className="flex flex-wrap items-center gap-2">
                  {adminQuizStatus !== 'active' ? (
                    <Button
                      variant="primary"
                      size="sm"
                      loading={statusUpdating}
                      onClick={() => handleUpdateQuizStatus('active')}
                      icon={<Play className="w-3.5 h-3.5" />}
                    >
                      Start Assessment
                    </Button>
                  ) : (
                    <Button
                      variant="danger"
                      size="sm"
                      loading={statusUpdating}
                      onClick={() => handleUpdateQuizStatus('closed')}
                      icon={<Lock className="w-3.5 h-3.5" />}
                    >
                      Conclude Assessment
                    </Button>
                  )}

                  {adminQuizStatus !== 'not_started' && (
                    <Button
                      variant="secondary"
                      size="sm"
                      loading={statusUpdating}
                      onClick={() => handleUpdateQuizStatus('not_started')}
                      icon={<RotateCcw className="w-3.5 h-3.5" />}
                    >
                      Reset Status
                    </Button>
                  )}

                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleOpenQuestionsModal}
                    icon={<FileQuestion className="w-3.5 h-3.5" />}
                  >
                    Manage Questions
                  </Button>
                </div>
              )}
            </div>
          </Card>

          <Card
            title="Team Assessment Scores & Available Bidding Budgets"
            subtitle="Scores are automatically evaluated upon submission and sorted by tie-breaker (earlier submission timestamp). Tokens remain withheld until manually released."
            action={
              <div className="flex flex-wrap items-center gap-2">
                {quizTokensReleased ? (
                  <Button
                    variant="secondary"
                    size="sm"
                    loading={tokensReleasing}
                    onClick={handleRevokeTokens}
                    icon={<Lock className="w-3.5 h-3.5" />}
                  >
                    Freeze / Lock Tokens
                  </Button>
                ) : (
                  <Button
                    variant="primary"
                    size="sm"
                    loading={tokensReleasing}
                    onClick={handleReleaseTokens}
                    icon={<CheckCircle2 className="w-3.5 h-3.5" />}
                  >
                    Release Tokens to Teams
                  </Button>
                )}
                <Button variant="secondary" size="sm" icon={<RotateCw className="w-3.5 h-3.5" />} onClick={() => loadQuizScores()}>
                  Refresh Scores
                </Button>
                <Button variant="primary" size="sm" loading={savingQuizScores} onClick={handleSaveQuizScores} icon={<Save className="w-3.5 h-3.5" />}>
                  Save All Scores
                </Button>
              </div>
            }
          >
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-paper rounded border border-mist">
                <div>
                  <span className="text-xs font-bold text-ink">Bidding Token Distribution Status</span>
                  <p className="text-[11px] text-ink-muted">
                    {quizTokensReleased
                      ? 'Tokens have been distributed to all teams and are active for live bidding.'
                      : 'Tokens are currently WITHHELD. Review marks and adjust tie-breaking below before releasing tokens to participants.'}
                  </p>
                </div>
                <div>
                  {quizTokensReleased ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-600 text-white">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Tokens Released to Teams
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500 text-white">
                      <Lock className="w-3.5 h-3.5" />
                      Tokens Withheld (Pending Release)
                    </span>
                  )}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-paper rounded border border-mist">
                <div>
                  <span className="text-xs font-bold text-ink">Token Rate (Quiz Marks Multiplier)</span>
                  <p className="text-[11px] text-ink-muted">Tokens credited per quiz mark to form the auction bidding balance</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-ink">Rate:</span>
                  <input
                    type="number"
                    min={1}
                    value={quizMultiplier}
                    disabled={!isAdmin}
                    onChange={(e) => setQuizMultiplier(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    className="input-field text-xs font-mono font-bold w-24 text-center disabled:opacity-60"
                  />
                  <span className="text-xs text-ink-muted">Tokens / Mark</span>
                </div>
              </div>

              {quizLoading ? (
                <div className="p-8 text-center text-xs text-ink-muted">Loading quiz scores...</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-mist">
                        <th className="table-header w-12 text-center">Rank</th>
                        <th className="table-header">Team Name</th>
                        <th className="table-header">Submission Time (Tie-Breaker)</th>
                        <th className="table-header w-36">Quiz Score (Marks)</th>
                        <th className="table-header">Auction Tokens</th>
                        <th className="table-header">Spent Tokens</th>
                        <th className="table-header">Available Bidding Amount</th>
                        <th className="table-header text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {quizScores.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="p-8 text-center text-xs text-ink-muted">
                            No participating teams found.
                          </td>
                        </tr>
                      ) : (
                        quizScores.map((item, index) => {
                          const isDirty = dirtyTeamIds.has(item.teamId);
                          const isSavingThis = savingSingleTeamId === item.teamId;
                          return (
                            <tr key={item.teamId} className="border-b border-mist hover:bg-paper/40 transition-colors">
                              <td className="table-cell text-center font-bold text-ink-muted">
                                #{index + 1}
                              </td>
                              <td className="table-cell font-bold text-ink">
                                <div className="flex items-center gap-2">
                                  <span>{item.teamName}</span>
                                  {isDirty && (
                                    <span className="inline-block w-2 h-2 rounded-full bg-amber-500" title="Unsaved changes" />
                                  )}
                                </div>
                              </td>
                              <td className="table-cell">
                                {item.submittedAt ? (
                                  <div>
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-100 text-emerald-800">
                                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                      {new Date(item.submittedAt).toLocaleTimeString([], {
                                        hour: '2-digit',
                                        minute: '2-digit',
                                        second: '2-digit',
                                      })}
                                    </span>
                                  </div>
                                ) : (
                                  <span className="text-[11px] text-ink-muted italic">
                                    Pending Submission
                                  </span>
                                )}
                              </td>
                              <td className="table-cell">
                                <input
                                  type="number"
                                  min={0}
                                  value={item.quizMarks ?? 0}
                                  onChange={(e) => handleQuizScoreChange(item.teamId, Math.max(0, parseInt(e.target.value, 10) || 0))}
                                  className="input-field text-xs font-mono font-bold w-24"
                                />
                              </td>
                              <td className="table-cell font-mono font-bold text-ink">
                                <div>
                                  <span>{item.potentialTokens ?? (item.quizMarks * quizMultiplier)} Tokens</span>
                                  <span
                                    className={`text-[10px] block font-sans font-semibold mt-0.5 ${
                                      item.tokensReleased && quizTokensReleased
                                        ? 'text-emerald-700'
                                        : 'text-amber-700'
                                    }`}
                                  >
                                    {item.tokensReleased && quizTokensReleased ? 'Active / Released' : 'Withheld from Team'}
                                  </span>
                                </div>
                              </td>
                              <td className="table-cell font-mono text-ink-muted">
                                {item.spentTokens || 0} Tokens
                              </td>
                              <td className="table-cell font-mono font-bold text-signal">
                                {item.remainingBalance} Tokens
                              </td>
                              <td className="table-cell text-right">
                                <Button
                                  variant={isDirty ? 'primary' : 'secondary'}
                                  size="sm"
                                  loading={isSavingThis}
                                  onClick={() => handleSaveSingleTeamScore(item.teamId)}
                                >
                                  {isDirty ? 'Save' : 'Saved'}
                                </Button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB: LIVE COMPANY AUCTION & DIRECT ASSIGNMENT (Admins Only) */}
      {/* ========================================================= */}
      {isAdmin && activeTab === 'auction' && (
        <div className="space-y-6">
          {/* Section 1: Live Auction Floor Controller */}
          <Card
            title="Live Auction Floor Controller"
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
                          {(() => {
                            const soldTeam = quizScores.find(
                              (q: any) =>
                                q.teamId?.toString() === liveAuctionState.highestBidderTeamId?.toString() ||
                                q.teamName === liveAuctionState.highestBidderTeamName
                            );
                            const tks = soldTeam ? soldTeam.remainingBalance ?? soldTeam.auctionBalance ?? 0 : null;
                            return (
                              <span className="text-sm font-bold text-emerald-700">
                                {liveAuctionState.highestBidderTeamName || 'Assigned'}
                                {tks !== null && (
                                  <span className="font-mono text-xs font-semibold text-emerald-900 ml-1">
                                    ({tks} Tokens)
                                  </span>
                                )}
                              </span>
                            );
                          })()}
                        </div>
                      )}
                    </div>
                  </div>

                  {liveAuctionState.status === 'sold' ? (
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-emerald-50 rounded-lg border border-emerald-200">
                      <div className="flex items-center gap-2 text-xs text-emerald-900 font-medium">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        {(() => {
                          const soldTeam = quizScores.find(
                            (q: any) =>
                              q.teamId?.toString() === liveAuctionState.highestBidderTeamId?.toString() ||
                              q.teamName === liveAuctionState.highestBidderTeamName
                          );
                          const tks = soldTeam ? soldTeam.remainingBalance ?? soldTeam.auctionBalance ?? 0 : null;
                          return (
                            <span>
                              Company <strong>{liveAuctionState.activeItem.name}</strong> is assigned to team{' '}
                              <strong>{liveAuctionState.highestBidderTeamName}</strong>
                              {tks !== null && (
                                <span className="font-mono font-bold text-emerald-800 ml-1">
                                  ({tks} Tokens)
                                </span>
                              )}.
                            </span>
                          );
                        })()}
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
                            {(() => {
                              const eligible = (
                                teams.length > 0 ? teams : quizScores.map((q) => ({ _id: q.teamId, teamName: q.teamName, college: q.college }))
                              ).filter((tm: any) => {
                                const idStr = (tm._id || tm.teamId)?.toString();
                                const assignment = teamAssignments.find((a: any) => a.teamId?.toString() === idStr);
                                return !assignment || !assignment.auctionCompany || !assignment.auctionCompany.name;
                              });

                              if (eligible.length === 0) {
                                return (
                                  <option value="" disabled>
                                    All teams already have an auction organization assigned
                                  </option>
                                );
                              }

                              return eligible.map((tm: any) => {
                                const idStr = (tm._id || tm.teamId)?.toString();
                                const qScore = quizScores.find((q: any) => q.teamId?.toString() === idStr);
                                const tokenCount = qScore ? (qScore.remainingBalance ?? qScore.auctionBalance ?? 0) : 0;
                                return (
                                  <option key={tm._id || tm.teamId} value={tm._id || tm.teamId}>
                                    {tm.teamName} {tm.college ? `(${tm.college})` : ''} — {tokenCount} Tokens
                                  </option>
                                );
                              });
                            })()}
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
                  <h4 className="text-xs font-bold text-ink uppercase tracking-wider">Broadcast a Company on the Block</h4>
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

          {/* Section 2: Bucket 2 Auction Companies Pool */}
          <Card
            title="Bucket 2: Auction Organizations Pool"
            subtitle="Organizations configured for the live auction floor. Broadcast any organization directly or edit details."
          >
            <div className="space-y-6">
              {/* Form to Add New Company to Bucket 2 */}
              {isAdmin && (
                <form onSubmit={handleAddAuctionCompany} className="p-4 bg-paper rounded-lg border border-mist space-y-3">
                  <h5 className="text-xs font-bold text-ink uppercase tracking-wider">Add Organization to Bucket 2</h5>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[10px] font-semibold text-ink uppercase mb-1">Company Name *</label>
                      <input
                        type="text"
                        value={newAuctionCompName}
                        onChange={(e) => setNewAuctionCompName(e.target.value)}
                        placeholder="e.g. Acme Quantum Labs"
                        className="input-field text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-ink uppercase mb-1">Description *</label>
                      <input
                        type="text"
                        value={newAuctionCompDesc}
                        onChange={(e) => setNewAuctionCompDesc(e.target.value)}
                        placeholder="e.g. Fault-tolerant quantum computing systems"
                        className="input-field text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-ink uppercase mb-1">Initial Bid (Tokens)</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min={0}
                          value={newAuctionCompPrice}
                          onChange={(e) => setNewAuctionCompPrice(parseInt(e.target.value, 10) || 0)}
                          className="input-field text-xs font-mono w-24"
                        />
                        <Button type="submit" variant="primary" size="sm" icon={<Plus className="w-3.5 h-3.5" />}>
                          Add
                        </Button>
                      </div>
                    </div>
                  </div>
                </form>
              )}

              {/* Grid of Bucket 2 Companies */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h5 className="text-xs font-bold text-ink uppercase tracking-wider">
                    Configured Bucket 2 Organizations ({auctionCompanies.length})
                  </h5>
                  <Button variant="secondary" size="sm" icon={<RotateCw className="w-3 h-3" />} onClick={loadAuctionData}>
                    Refresh
                  </Button>
                </div>

                {auctionCompanies.length === 0 ? (
                  <div className="p-8 text-center text-xs text-ink-muted bg-paper rounded border border-mist">
                    No organizations configured in Bucket 2. Add companies above.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {auctionCompanies.map((comp) => (
                      <div
                        key={comp.id}
                        className="p-4 bg-white rounded-lg border border-mist flex flex-col justify-between gap-3 shadow-xs hover:border-mist-dark transition-all"
                      >
                        <div>
                          <div className="flex items-start justify-between gap-2 mb-1.5">
                            <h6 className="font-bold text-sm text-ink">
                              {comp.name}
                            </h6>
                            <Badge variant={comp.isAssigned ? 'success' : 'signal'}>
                              {comp.isAssigned ? 'Assigned' : `Base: ${comp.basePrice}`}
                            </Badge>
                          </div>
                          <p className="text-xs text-ink-muted leading-relaxed line-clamp-3">
                            {comp.description}
                          </p>
                          {comp.isAssigned && comp.assignedToTeamName && (
                            <div className="text-[11px] text-emerald-800 font-semibold mt-2 pt-2 border-t border-mist">
                              {(() => {
                                const qScore = quizScores.find((q: any) => q.teamName?.toLowerCase() === comp.assignedToTeamName?.toLowerCase() || q.teamId?.toString() === comp.assignedToTeamId?.toString());
                                const assign = teamAssignments.find((a: any) => a.teamName?.toLowerCase() === comp.assignedToTeamName?.toLowerCase() || a.teamId?.toString() === comp.assignedToTeamId?.toString());
                                const tks = qScore?.remainingBalance ?? qScore?.auctionBalance ?? assign?.remainingBalance ?? assign?.auctionBalance;
                                return (
                                  <>
                                    Assigned to: {comp.assignedToTeamName}
                                    {tks !== undefined && tks !== null && (
                                      <span className="font-mono text-[10px] font-bold text-signal ml-1">({tks} Tokens)</span>
                                    )}
                                  </>
                                );
                              })()}
                            </div>
                          )}
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-mist text-xs">
                          <span className="font-mono text-ink-muted text-[11px]">{comp.basePrice} Tokens</span>
                          <div className="flex items-center gap-1.5">
                            <Button
                              variant="secondary"
                              size="sm"
                              icon={<Play className="w-3 h-3" />}
                              onClick={() => handleStartAuctionFromBucket(comp)}
                              loading={auctionActionLoading}
                            >
                              Showcase
                            </Button>
                            {isAdmin && (
                              <Button
                                variant="secondary"
                                size="sm"
                                icon={<Trash2 className="w-3 h-3 text-red-500" />}
                                onClick={() => handleDeleteAuctionCompany(comp.id)}
                              />
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </Card>

          {/* Section 3: Team Company Allocations & Assignment Overrides */}
          <Card
            title="Team Company Allocations & Assignment Overrides"
            subtitle="Review which team selected which company across Round 1 and the Live Auction. Admins can change or reassign companies as needed."
          >
            <div className="space-y-4">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-mist">
                      <th className="table-header">Team Name</th>
                      <th className="table-header">Round 1 Organization</th>
                      <th className="table-header">Auction Organization (Bucket 2)</th>
                      <th className="table-header">Winning Price</th>
                      <th className="table-header">Status</th>
                      <th className="table-header text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {teamAssignments.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-xs text-ink-muted">
                          Loading team company assignments...
                        </td>
                      </tr>
                    ) : (
                      teamAssignments.map((tm) => (
                        <tr key={tm.teamId} className="border-b border-mist hover:bg-paper/40 transition-colors">
                          <td className="table-cell font-bold text-ink">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span>{tm.teamName}</span>
                              {(() => {
                                const qScore = quizScores.find((q: any) => q.teamId?.toString() === tm.teamId?.toString());
                                const tks = qScore?.remainingBalance ?? qScore?.auctionBalance ?? tm.remainingBalance ?? tm.auctionBalance;
                                return tks !== undefined && tks !== null ? (
                                  <span className="font-mono text-[11px] font-bold text-signal">
                                    ({tks} Tokens)
                                  </span>
                                ) : null;
                              })()}
                            </div>
                            {tm.college && <div className="text-[10px] font-normal text-ink-muted">{tm.college}</div>}
                          </td>
                          <td className="table-cell">
                            {tm.roundRobinCompany ? (
                              <span className="font-semibold text-ink">{tm.roundRobinCompany.name}</span>
                            ) : (
                              <span className="text-ink-muted italic">Round 1 Pending</span>
                            )}
                          </td>
                          <td className="table-cell">
                            {tm.auctionCompany ? (
                              <span className="font-semibold text-signal">{tm.auctionCompany.name}</span>
                            ) : (
                              <span className="text-ink-muted italic">Not Assigned</span>
                            )}
                          </td>
                          <td className="table-cell font-mono">
                            {tm.auctionCompany?.price ? `${tm.auctionCompany.price} Tokens` : '-'}
                          </td>
                          <td className="table-cell">
                            <Badge variant={tm.hasBothCompanies ? 'success' : 'saffron'}>
                              {tm.hasBothCompanies ? '2 of 2 Secured' : tm.roundRobinCompany || tm.auctionCompany ? '1 of 2 Secured' : 'Pending'}
                            </Badge>
                          </td>
                          <td className="table-cell text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <Button
                                variant="secondary"
                                size="sm"
                                icon={<Edit3 className="w-3 h-3" />}
                                onClick={() => {
                                  setReassignModalTeam(tm);
                                  setReassignSelectedCompId(tm.auctionCompany?.id || '');
                                }}
                              >
                                Change
                              </Button>
                              {tm.auctionCompany && (
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  icon={<Trash2 className="w-3 h-3 text-red-500" />}
                                  onClick={() => handleUnassignTeamAuction(tm.teamId)}
                                />
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </Card>

          {/* Section 5: Stage 5 Final Project Pitch Submission Gate */}
          <Card
            title="Stage 5: Final Project Pitch Submission Gate"
            subtitle="Enable or close final pitch submissions across all participating teams once company auction concludes."
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-paper rounded-lg border border-mist">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-ink uppercase tracking-wider">Current Gate Status:</span>
                  <Badge variant={config?.finalSubmissionOpen ? 'success' : 'mist'}>
                    {config?.finalSubmissionOpen ? 'Final Submissions OPEN' : 'Final Submissions CLOSED'}
                  </Badge>
                </div>
                <p className="text-xs text-ink-muted leading-relaxed max-w-xl">
                  {config?.finalSubmissionOpen
                    ? 'Participants who have acquired both organizations can now submit their final pitch deliverables.'
                    : 'Stage 5 submission is locked. Teams who have both organizations will see "Awaiting Admin Launch".'}
                </p>
              </div>

              <Button
                variant={config?.finalSubmissionOpen ? 'secondary' : 'primary'}
                loading={eventLoading}
                icon={config?.finalSubmissionOpen ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                onClick={handleToggleFinalSubmission}
              >
                {config?.finalSubmissionOpen ? 'Close Final Submissions' : 'Open Final Pitch Submissions'}
              </Button>
            </div>
          </Card>

          {/* Section 6: Grand Finale Winners Announcement & Podium Platform */}
          <Card
            title="Section 6: Grand Finale Winners Announcement & Podium Curtain"
            subtitle="Publish the final Top 3 winners. Once published, all participants and the public are shown the celebratory 2 | 1 | 3 podium page with beautified emojis."
          >
            <div className="space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-paper rounded-lg border border-mist">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-ink uppercase tracking-wider">Podium Curtain Status:</span>
                    <Badge variant={winnersAnnounced ? 'success' : 'mist'}>
                      {winnersAnnounced ? '🎉 Winners Announced (Podium Active)' : 'Normal Portal Active'}
                    </Badge>
                  </div>
                  <p className="text-xs text-ink-muted leading-relaxed max-w-xl">
                    {winnersAnnounced
                      ? 'The 2 | 1 | 3 grand finale podium is currently visible to all participants and public visitors. Staff members continue to access the Staff Portal normally.'
                      : 'Participants and public see their standard workspace views. Announce winners below to present the official podium.'}
                  </p>
                </div>

                <Button
                  variant={winnersAnnounced ? 'secondary' : 'primary'}
                  loading={togglingWinners}
                  icon={winnersAnnounced ? <Pause className="w-3.5 h-3.5" /> : <Award className="w-3.5 h-3.5" />}
                  onClick={handleToggleWinnersAnnouncement}
                >
                  {winnersAnnounced ? 'Hide Winners & Restore Portal' : 'Announce Winners & Reveal Podium 🎉'}
                </Button>
              </div>

              {/* Configure / Select Top 3 Winners */}
              <div className="p-4 bg-white rounded-lg border border-mist space-y-4">
                <h5 className="text-xs font-bold text-ink uppercase tracking-wider">
                  Configure Top 3 Winners (Ranked 2 | 1 | 3)
                </h5>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                  {/* Rank 2 (Left) */}
                  <div className="p-3.5 rounded-lg border-2 border-slate-300 bg-slate-50/50 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-700 flex items-center gap-1.5">
                        <span className="text-base">🥈</span> Rank 2 (1st Runner Up)
                      </span>
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-ink-muted mb-1">Select Team</label>
                      <select
                        value={winnerRank2TeamId}
                        onChange={(e) => setWinnerRank2TeamId(e.target.value)}
                        className="input-field text-xs font-semibold w-full"
                      >
                        <option value="">-- Choose Team for 2nd Place --</option>
                        {(teams.length > 0 ? teams : quizScores.map((q) => ({ _id: q.teamId, teamName: q.teamName }))).map((t: any) => (
                          <option key={t._id || t.teamId} value={t._id || t.teamId}>
                            {t.teamName} {t.college ? `(${t.college})` : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-ink-muted mb-1">Prize / Title</label>
                      <input
                        type="text"
                        value={winnerRank2Title}
                        onChange={(e) => setWinnerRank2Title(e.target.value)}
                        className="input-field text-xs w-full"
                      />
                    </div>
                  </div>

                  {/* Rank 1 (Center) */}
                  <div className="p-3.5 rounded-lg border-2 border-amber-400 bg-amber-50/50 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-amber-900 flex items-center gap-1.5">
                        <span className="text-base">🥇</span> Rank 1 (Champion)
                      </span>
                      <span className="text-xs">👑</span>
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-ink-muted mb-1">Select Team</label>
                      <select
                        value={winnerRank1TeamId}
                        onChange={(e) => setWinnerRank1TeamId(e.target.value)}
                        className="input-field text-xs font-semibold w-full"
                      >
                        <option value="">-- Choose Team for 1st Place --</option>
                        {(teams.length > 0 ? teams : quizScores.map((q) => ({ _id: q.teamId, teamName: q.teamName }))).map((t: any) => (
                          <option key={t._id || t.teamId} value={t._id || t.teamId}>
                            {t.teamName} {t.college ? `(${t.college})` : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-ink-muted mb-1">Prize / Title</label>
                      <input
                        type="text"
                        value={winnerRank1Title}
                        onChange={(e) => setWinnerRank1Title(e.target.value)}
                        className="input-field text-xs w-full"
                      />
                    </div>
                  </div>

                  {/* Rank 3 (Right) */}
                  <div className="p-3.5 rounded-lg border-2 border-amber-600/40 bg-amber-50/20 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-amber-800 flex items-center gap-1.5">
                        <span className="text-base">🥉</span> Rank 3 (2nd Runner Up)
                      </span>
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-ink-muted mb-1">Select Team</label>
                      <select
                        value={winnerRank3TeamId}
                        onChange={(e) => setWinnerRank3TeamId(e.target.value)}
                        className="input-field text-xs font-semibold w-full"
                      >
                        <option value="">-- Choose Team for 3rd Place --</option>
                        {(teams.length > 0 ? teams : quizScores.map((q) => ({ _id: q.teamId, teamName: q.teamName }))).map((t: any) => (
                          <option key={t._id || t.teamId} value={t._id || t.teamId}>
                            {t.teamName} {t.college ? `(${t.college})` : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-ink-muted mb-1">Prize / Title</label>
                      <input
                        type="text"
                        value={winnerRank3Title}
                        onChange={(e) => setWinnerRank3Title(e.target.value)}
                        className="input-field text-xs w-full"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Modal: Reassign Auction Company */}
      {reassignModalTeam && (
        <Modal
          isOpen={!!reassignModalTeam}
          title={(() => {
            const qScore = quizScores.find((q: any) => q.teamId?.toString() === reassignModalTeam.teamId?.toString());
            const tks = qScore?.remainingBalance ?? qScore?.auctionBalance ?? reassignModalTeam.remainingBalance ?? reassignModalTeam.auctionBalance;
            return `Change Auction Organization: ${reassignModalTeam.teamName}${tks !== undefined && tks !== null ? ` (${tks} Tokens)` : ''}`;
          })()}
          onClose={() => setReassignModalTeam(null)}
        >
          <div className="space-y-4 text-xs">
            <p className="text-ink-muted">
              Select an organization from Bucket 2 to allocate to{' '}
              <strong>
                {reassignModalTeam.teamName}
                {(() => {
                  const qScore = quizScores.find((q: any) => q.teamId?.toString() === reassignModalTeam.teamId?.toString());
                  const tks = qScore?.remainingBalance ?? qScore?.auctionBalance ?? reassignModalTeam.remainingBalance ?? reassignModalTeam.auctionBalance;
                  return tks !== undefined && tks !== null ? ` (${tks} Tokens)` : '';
                })()}
              </strong>
              , or clear their current assignment.
            </p>
            <div>
              <label className="block text-[11px] font-semibold text-ink uppercase mb-1">
                Select Auction Organization
              </label>
              <select
                value={reassignSelectedCompId}
                onChange={(e) => setReassignSelectedCompId(e.target.value)}
                className="input-field text-xs font-semibold w-full"
              >
                <option value="">-- Remove / Clear Auction Organization --</option>
                {auctionCompanies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.basePrice} Tokens) {c.isAssigned ? `(Currently held by ${c.assignedToTeamName})` : '(Available)'}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex justify-end gap-2 pt-3 border-t border-mist">
              <Button variant="secondary" onClick={() => setReassignModalTeam(null)}>
                Cancel
              </Button>
              <Button variant="primary" loading={auctionActionLoading} onClick={handleReassignSubmit}>
                Confirm Assignment Change
              </Button>
            </div>
          </div>
        </Modal>
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
                      {isSafeUrl(activeTarget.payload.cleanedDatasetUrl) ? (
                        <a
                          href={activeTarget.payload.cleanedDatasetUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-signal underline inline-flex items-center gap-1"
                        >
                          {activeTarget.payload.cleanedDatasetUrl}
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      ) : (
                        <span className="font-mono text-ink-muted break-all">
                          {activeTarget.payload.cleanedDatasetUrl}
                        </span>
                      )}
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
              <h4 className="text-sm font-bold text-ink">Validation Dataset</h4>
              <p className="text-xs text-ink-muted">
                Configured centrally here. It is locked and disabled for every team by default; mentors explicitly release it to individual teams upon review of their cleaned dataset submission.
              </p>
              <div>
                <label className="block text-xs font-semibold text-ink uppercase mb-1">Validation Dataset Title</label>
                <input
                  type="text"
                  value={valDatasetTitle}
                  onChange={(e) => setValDatasetTitle(e.target.value)}
                  placeholder="e.g. Satellite Ground Truth Validation Set v1"
                  className="input-field text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-ink uppercase mb-1">Validation Dataset Download Link (URL)</label>
                <input
                  type="url"
                  value={valDatasetUrl}
                  onChange={(e) => setValDatasetUrl(e.target.value)}
                  placeholder="https://storage.googleapis.com/... or https://r2.dev/..."
                  className="input-field text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-ink uppercase mb-1">Validation Dataset Brief & Evaluation Notes</label>
                <textarea
                  rows={2}
                  value={valDatasetDesc}
                  onChange={(e) => setValDatasetDesc(e.target.value)}
                  placeholder="Holdout evaluation criteria, accuracy benchmarks, feature format requirements..."
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
      {(isAdmin || isDesk) && activeTab === 'teams' && (
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
                          onClick={() => handleOpenEditTeamModal(t)}
                          className="p-1 rounded text-ink-muted hover:text-ink hover:bg-mist transition-colors"
                          title="Edit Team"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        {isAdmin && (
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
                        )}
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
                                  : acc.role === 'desk'
                                  ? 'success'
                                  : 'mist'
                              }
                            >
                              {acc.role === 'admin'
                                ? 'Administrator'
                                : acc.role === 'evaluator'
                                ? 'Evaluator'
                                : acc.role === 'mentor'
                                ? 'Mentor'
                                : acc.role === 'desk'
                                ? 'Registration Desk'
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
                              <option value="desk">Registration Desk</option>
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


      {/* Edit Team Modal */}
      <Modal
        isOpen={editTeamModal}
        onClose={() => {
          setEditTeamModal(false);
          setTeamToEdit(null);
        }}
        title="Edit Team Details"
        description="Update team name, institution/college, and manage team members and leader assignment."
        maxWidth="lg"
      >
        <form onSubmit={handleSaveTeamEdits} className="space-y-4 text-xs">
          {editTeamError && <Alert type="error">{editTeamError}</Alert>}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-ink uppercase mb-1">
                Team Name *
              </label>
              <input
                type="text"
                required
                value={editTeamName}
                onChange={(e) => setEditTeamName(e.target.value)}
                placeholder="e.g. Neural Dynamics"
                className="input-field"
              />
            </div>
            <div>
              <label className="block font-semibold text-ink uppercase mb-1">
                College / Institution
              </label>
              <input
                type="text"
                value={editCollege}
                onChange={(e) => setEditCollege(e.target.value)}
                placeholder="e.g. IIT Bombay / Independent"
                className="input-field"
              />
            </div>
          </div>

          <div className="pt-2 border-t border-mist">
            <div className="flex items-center justify-between mb-2">
              <label className="block font-semibold text-ink uppercase">
                Team Members ({editMembers.length})
              </label>
              <span className="text-[11px] text-ink-muted">
                Select one member as Team Leader
              </span>
            </div>

            <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
              {editMembers.map((m, idx) => (
                <div
                  key={idx}
                  className={`p-3 rounded-lg border transition-all ${
                    m.isLeader
                      ? 'border-signal/40 bg-signal-light/10'
                      : 'border-mist bg-paper/30'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="font-semibold text-ink flex items-center gap-2">
                      Member #{idx + 1}
                      {m.isLeader && (
                        <Badge variant="signal" size="sm">
                          Team Leader
                        </Badge>
                      )}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setEditMembers(
                            editMembers.map((mem, i) => ({
                              ...mem,
                              isLeader: i === idx,
                            }))
                          );
                        }}
                        className={`text-[11px] px-2 py-0.5 rounded font-medium transition-colors ${
                          m.isLeader
                            ? 'bg-signal text-white'
                            : 'bg-mist text-ink-muted hover:text-ink hover:bg-mist-dark/30'
                        }`}
                      >
                        {m.isLeader ? 'Leader' : 'Make Leader'}
                      </button>

                      {editMembers.length > 1 && (
                        <button
                          type="button"
                          onClick={() => {
                            const updated = editMembers.filter((_, i) => i !== idx);
                            if (m.isLeader && updated.length > 0) {
                              updated[0].isLeader = true;
                            }
                            setEditMembers(updated);
                          }}
                          className="p-1 rounded text-ink-muted hover:text-signal hover:bg-mist transition-colors"
                          title="Remove Member"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <input
                        type="text"
                        required
                        value={m.name}
                        onChange={(e) => {
                          const updated = [...editMembers];
                          updated[idx].name = e.target.value;
                          setEditMembers(updated);
                        }}
                        placeholder="Full Name *"
                        className="input-field text-xs py-1.5"
                      />
                    </div>
                    <div>
                      <input
                        type="email"
                        required
                        value={m.email}
                        onChange={(e) => {
                          const updated = [...editMembers];
                          updated[idx].email = e.target.value;
                          setEditMembers(updated);
                        }}
                        placeholder="Google Account Email *"
                        className="input-field text-xs py-1.5"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() => {
                setEditMembers([
                  ...editMembers,
                  { name: '', email: '', isLeader: editMembers.length === 0 },
                ]);
              }}
              className="mt-3 text-xs font-semibold text-signal hover:text-signal-dark flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Member
            </button>
          </div>

          <div className="pt-3 flex justify-end gap-2 border-t border-mist">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setEditTeamModal(false);
                setTeamToEdit(null);
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={editTeamLoading}
              icon={<Save className="w-4 h-4" />}
            >
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>

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
              <option value="desk">Registration Desk (Onboard teams & manage rosters)</option>
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

      {/* Assessment Questions Management Modal (Admin Only) */}
      <Modal
        isOpen={questionsModalOpen}
        onClose={() => setQuestionsModalOpen(false)}
        title={`Assessment Questions Editor (${adminQuizQuestions.length} Questions)`}
      >
        <div className="space-y-4">
          <p className="text-xs text-ink-muted">
            Configure questions, answer options, and secret answer keys. Correct answers are strictly evaluated on the backend and never exposed to participants.
          </p>

          {questionsLoading ? (
            <div className="p-8 text-center text-xs text-ink-muted">Loading questions...</div>
          ) : (
            <div className="max-h-[65vh] overflow-y-auto space-y-4 pr-1">
              {adminQuizQuestions.map((q, qIdx) => (
                <div key={qIdx} className="p-3.5 bg-paper rounded-lg border border-mist space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-signal">
                      Question #{qIdx + 1} (ID: {q.id || qIdx + 1})
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const updated = adminQuizQuestions.filter((_, idx) => idx !== qIdx);
                        setAdminQuizQuestions(updated);
                      }}
                      className="text-red-500 hover:text-red-700 p-1 text-xs inline-flex items-center gap-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Remove</span>
                    </button>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-ink uppercase mb-0.5">
                      Question Prompt *
                    </label>
                    <textarea
                      rows={2}
                      value={q.question || ''}
                      onChange={(e) => {
                        const updated = [...adminQuizQuestions];
                        updated[qIdx].question = e.target.value;
                        setAdminQuizQuestions(updated);
                      }}
                      placeholder="Enter the question text"
                      className="input-field text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-ink uppercase mb-0.5">
                      Optional Image URL
                    </label>
                    <input
                      type="text"
                      value={q.image || ''}
                      onChange={(e) => {
                        const updated = [...adminQuizQuestions];
                        updated[qIdx].image = e.target.value;
                        setAdminQuizQuestions(updated);
                      }}
                      placeholder="https://example.com/diagram.png"
                      className="input-field text-xs font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-ink uppercase mb-1">
                      Options & Correct Answer Selection
                    </label>
                    <div className="space-y-2">
                      {(q.options || ['', '', '', '']).map((opt: string, optIdx: number) => {
                        const isCorrect = q.correct === optIdx;
                        return (
                          <div key={optIdx} className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                const updated = [...adminQuizQuestions];
                                updated[qIdx].correct = optIdx;
                                updated[qIdx].type = 'multiple_choice';
                                setAdminQuizQuestions(updated);
                              }}
                              className={`px-2.5 py-1 rounded text-[11px] font-bold border transition-colors ${
                                isCorrect
                                  ? 'bg-emerald-600 text-white border-emerald-600'
                                  : 'bg-white text-ink border-mist hover:border-ink-muted'
                              }`}
                              title={isCorrect ? 'Correct option' : 'Click to set as correct option'}
                            >
                              {String.fromCharCode(65 + optIdx)}
                              {isCorrect ? ' ✓' : ''}
                            </button>
                            <input
                              type="text"
                              value={opt}
                              onChange={(e) => {
                                const updated = [...adminQuizQuestions];
                                const opts = [...(updated[qIdx].options || [])];
                                opts[optIdx] = e.target.value;
                                updated[qIdx].options = opts;
                                setAdminQuizQuestions(updated);
                              }}
                              placeholder={`Option ${String.fromCharCode(65 + optIdx)} text`}
                              className={`input-field text-xs flex-1 ${
                                isCorrect ? 'border-emerald-500 bg-emerald-50/30' : ''
                              }`}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1 text-[11px]">
                    <div className="flex items-center gap-2">
                      <span className="text-ink-muted">Type:</span>
                      <button
                        type="button"
                        onClick={() => {
                          const updated = [...adminQuizQuestions];
                          if (updated[qIdx].type === 'poll') {
                            updated[qIdx].type = 'multiple_choice';
                            updated[qIdx].correct = 0;
                          } else {
                            updated[qIdx].type = 'poll';
                            updated[qIdx].correct = null;
                          }
                          setAdminQuizQuestions(updated);
                        }}
                        className="px-2 py-0.5 rounded text-[10px] font-bold border border-mist bg-white hover:bg-mist text-ink"
                      >
                        {q.type === 'poll' ? 'Feedback / Poll (No wrong answer)' : 'Graded Question'}
                      </button>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className="text-ink-muted">Points:</span>
                      <input
                        type="number"
                        min={1}
                        value={q.points || 1}
                        onChange={(e) => {
                          const updated = [...adminQuizQuestions];
                          updated[qIdx].points = Math.max(1, parseInt(e.target.value, 10) || 1);
                          setAdminQuizQuestions(updated);
                        }}
                        className="input-field text-xs w-16 text-center font-mono"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-t border-mist">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              icon={<Plus className="w-3.5 h-3.5" />}
              onClick={() => {
                const nextId =
                  adminQuizQuestions.length > 0
                    ? Math.max(...adminQuizQuestions.map((q) => q.id || 0)) + 1
                    : 1;
                setAdminQuizQuestions([
                  ...adminQuizQuestions,
                  {
                    id: nextId,
                    question: '',
                    options: ['', '', '', ''],
                    correct: 0,
                    image: '',
                    type: 'multiple_choice',
                    points: 1,
                  },
                ]);
              }}
            >
              Add New Question
            </Button>

            <div className="flex items-center gap-2 justify-end">
              <Button variant="secondary" onClick={() => setQuestionsModalOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                loading={questionsSaving}
                onClick={handleSaveQuestions}
                icon={<Save className="w-3.5 h-3.5" />}
              >
                Save All Questions
              </Button>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};
