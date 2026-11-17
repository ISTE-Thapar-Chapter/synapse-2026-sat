import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { api } from '../services/api.js';
import { Card } from '../components/UI/Card.js';
import { Badge } from '../components/UI/Badge.js';
import { Button } from '../components/UI/Button.js';
import { Alert } from '../components/UI/Alert.js';
import { Modal } from '../components/UI/Modal.js';
import { EmptyState } from '../components/UI/EmptyState.js';
import { Submission, LeaderboardEntry } from '../types/index.js';
import {
  Save,
  Send,
  CheckCircle2,
  Download,
  Award,
  Layers,
  Sparkles,
  ExternalLink,
  Lock,
  Clock,
  RotateCw,
} from 'lucide-react';

export const TeamPortal: React.FC = () => {
  const { user, participant, team, isLeader } = useAuth();

  // Navigation / Section State (persisted across page reloads)
  const [activeSection, setActiveSection] = useState<'cleaning' | 'requirements' | 'leaderboard'>('cleaning');

  // Event & Submissions State
  const [isEventStarted, setIsEventStarted] = useState<boolean>(false);
  const [cleaningDataset, setCleaningDataset] = useState<{
    title: string;
    fileUrl: string;
    description?: string;
  } | null>(null);
  const [hasSubmittedCleaning, setHasSubmittedCleaning] = useState<boolean>(false);
  const [hasSubmittedRequirements, setHasSubmittedRequirements] = useState<boolean>(false);
  const [cleaningSubmission, setCleaningSubmission] = useState<Submission | null>(null);
  const [requirementsSubmission, setRequirementsSubmission] = useState<Submission | null>(null);
  const [requirementsList, setRequirementsList] = useState<string[]>([]);

  // Leaderboard data
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState<boolean>(false);

  // Status & Notifications
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Modals & Errors
  const [confirmCleanModal, setConfirmCleanModal] = useState<boolean>(false);
  const [cleanSubmitError, setCleanSubmitError] = useState<string | null>(null);
  const [confirmReqModal, setConfirmReqModal] = useState<boolean>(false);
  const [reqSubmitError, setReqSubmitError] = useState<string | null>(null);

  // Form: Dataset Cleaning
  const [formCleaning, setFormCleaning] = useState({
    cleanedDatasetUrl: '',
    cleaningSummary: '',
    cleaningNotes: '',
  });

  // Form: Five Requirements & Company Methodologies
  const [formRequirements, setFormRequirements] = useState<{
    companyName?: string;
    methodologySummary?: string;
    requirements: Array<{
      title: string;
      companyName: string;
      response: string;
      link: string;
      notes: string;
    }>;
    generalNotes: string;
  }>({
    companyName: '',
    methodologySummary: '',
    requirements: [],
    generalNotes: '',
  });

  const teamId = team?._id || '';

  // -------------------------------------------------------------
  // Data Loading & Auto-sync
  // -------------------------------------------------------------
  const loadTeamData = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const data = await api.get<{
        isEventStarted: boolean;
        team: any;
        isLeader: boolean;
        cleaningDataset: { title: string; fileUrl: string; description?: string } | null;
        hasSubmittedCleaning: boolean;
        hasSubmittedRequirements: boolean;
        cleaningSubmission: Submission | null;
        requirementsSubmission: Submission | null;
        requirements: string[];
      }>('/submissions/current');

      setIsEventStarted(!!data.isEventStarted);
      setCleaningDataset(data.cleaningDataset || null);
      setHasSubmittedCleaning(!!data.hasSubmittedCleaning);
      setHasSubmittedRequirements(!!data.hasSubmittedRequirements);
      setCleaningSubmission(data.cleaningSubmission || null);
      setRequirementsSubmission(data.requirementsSubmission || null);
      setRequirementsList(data.requirements || []);

      // 1. Populate Cleaning Form (backend submitted / draft, or local draft if uncommitted)
      const cleanSub = data.cleaningSubmission;
      const cleanLocked = !!cleanSub?.isLocked;
      const localCleanKey = `synapse_draft_cleaning_${teamId}`;
      const localCleanDraft = localStorage.getItem(localCleanKey);

      if (cleanLocked && cleanSub?.payload) {
        setFormCleaning({
          cleanedDatasetUrl: cleanSub.payload.cleanedDatasetUrl || '',
          cleaningSummary: cleanSub.payload.cleaningSummary || '',
          cleaningNotes: cleanSub.payload.cleaningNotes || '',
        });
        localStorage.removeItem(localCleanKey);
      } else if (localCleanDraft) {
        try {
          const parsed = JSON.parse(localCleanDraft);
          setFormCleaning(parsed);
        } catch {
          if (cleanSub?.payload) {
            setFormCleaning({
              cleanedDatasetUrl: cleanSub.payload.cleanedDatasetUrl || '',
              cleaningSummary: cleanSub.payload.cleaningSummary || '',
              cleaningNotes: cleanSub.payload.cleaningNotes || '',
            });
          }
        }
      } else if (cleanSub?.payload) {
        setFormCleaning({
          cleanedDatasetUrl: cleanSub.payload.cleanedDatasetUrl || '',
          cleaningSummary: cleanSub.payload.cleaningSummary || '',
          cleaningNotes: cleanSub.payload.cleaningNotes || '',
        });
      }

      // 2. Populate Requirements Form
      const reqSub = data.requirementsSubmission;
      const reqLocked = !!reqSub?.isLocked;
      const localReqKey = `synapse_draft_requirements_${teamId}`;
      const localReqDraft = localStorage.getItem(localReqKey);

      const titles = data.requirements || [];
      const initReqRows = (existing: any[] = []) =>
        titles.map((title) => {
          const matched = existing.find((r: any) => r.title === title);
          return {
            title,
            companyName: matched?.companyName || '',
            response: matched?.response || '',
            link: matched?.link || '',
            notes: matched?.notes || '',
          };
        });

      if (reqLocked && reqSub?.payload) {
        const payloadReqs = Array.isArray(reqSub.payload.requirements) ? reqSub.payload.requirements : [];
        setFormRequirements({
          companyName: reqSub.payload.companyName || '',
          methodologySummary: reqSub.payload.methodologySummary || '',
          requirements: initReqRows(payloadReqs),
          generalNotes: reqSub.payload.generalNotes || '',
        });
        localStorage.removeItem(localReqKey);
      } else if (localReqDraft) {
        try {
          const parsed = JSON.parse(localReqDraft);
          setFormRequirements({
            companyName: parsed.companyName || '',
            methodologySummary: parsed.methodologySummary || '',
            requirements: initReqRows(parsed.requirements || []),
            generalNotes: parsed.generalNotes || '',
          });
        } catch {
          if (reqSub?.payload?.requirements) {
            setFormRequirements({
              companyName: reqSub.payload.companyName || '',
              methodologySummary: reqSub.payload.methodologySummary || '',
              requirements: initReqRows(reqSub.payload.requirements),
              generalNotes: reqSub.payload.generalNotes || '',
            });
          } else {
            setFormRequirements({
              companyName: '',
              methodologySummary: '',
              requirements: initReqRows([]),
              generalNotes: '',
            });
          }
        }
      } else if (reqSub?.payload?.requirements) {
        setFormRequirements({
          companyName: reqSub.payload.companyName || '',
          methodologySummary: reqSub.payload.methodologySummary || '',
          requirements: initReqRows(reqSub.payload.requirements),
          generalNotes: reqSub.payload.generalNotes || '',
        });
      } else {
        setFormRequirements({
          companyName: '',
          methodologySummary: '',
          requirements: initReqRows([]),
          generalNotes: '',
        });
      }

      // 3. Restore last previewed section from localStorage
      const savedSection = localStorage.getItem(`synapse_preview_section_${teamId}`) as
        | 'cleaning'
        | 'requirements'
        | 'leaderboard'
        | null;

      if (savedSection) {
        // Validate that savedSection is accessible
        if (savedSection === 'leaderboard' && data.hasSubmittedRequirements) {
          setActiveSection('leaderboard');
        } else if (savedSection === 'requirements' && data.hasSubmittedCleaning) {
          setActiveSection('requirements');
        } else if (savedSection === 'cleaning') {
          setActiveSection('cleaning');
        } else if (data.hasSubmittedRequirements) {
          setActiveSection('leaderboard');
        } else if (data.hasSubmittedCleaning) {
          setActiveSection('requirements');
        } else {
          setActiveSection('cleaning');
        }
      } else {
        // Default to latest unlocked
        if (data.hasSubmittedRequirements) {
          setActiveSection('leaderboard');
        } else if (data.hasSubmittedCleaning) {
          setActiveSection('requirements');
        } else {
          setActiveSection('cleaning');
        }
      }
    } catch (err: any) {
      console.error('[TeamPortal] Error loading team data:', err);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    loadTeamData();
  }, []);

  // Polling for event start if not yet started
  useEffect(() => {
    if (!isEventStarted) {
      const timer = setInterval(() => {
        loadTeamData(true);
      }, 8000);
      return () => clearInterval(timer);
    }
  }, [isEventStarted]);

  // Load Leaderboard when leaderboard section is active
  const loadLeaderboard = async () => {
    setLeaderboardLoading(true);
    try {
      const res = await api.get<{
        leaderboard: {
          entries: LeaderboardEntry[];
        };
      }>('/leaderboard/live');
      if (res.leaderboard && res.leaderboard.entries) {
        setLeaderboard(res.leaderboard.entries);
      }
    } catch (err) {
      console.error('[TeamPortal] Error fetching leaderboard:', err);
    } finally {
      setLeaderboardLoading(false);
    }
  };

  useEffect(() => {
    if (activeSection === 'leaderboard' || hasSubmittedRequirements) {
      loadLeaderboard();
    }
  }, [activeSection, hasSubmittedRequirements]);

  // Handle section switch & persist in localStorage
  const handleSelectSection = (sec: 'cleaning' | 'requirements' | 'leaderboard') => {
    setActiveSection(sec);
    if (teamId) {
      localStorage.setItem(`synapse_preview_section_${teamId}`, sec);
    }
  };

  // Autosave Cleaning Form to localStorage
  const handleCleaningChange = (field: keyof typeof formCleaning, value: string) => {
    const updated = { ...formCleaning, [field]: value };
    setFormCleaning(updated);
    if (teamId && !cleaningSubmission?.isLocked) {
      localStorage.setItem(`synapse_draft_cleaning_${teamId}`, JSON.stringify(updated));
    }
  };

  // Autosave Requirements Form to localStorage
  const handleReqItemChange = (index: number, field: string, value: string) => {
    const updatedReqs = [...formRequirements.requirements];
    if (updatedReqs[index]) {
      updatedReqs[index] = { ...updatedReqs[index], [field]: value };
      const updated = { ...formRequirements, requirements: updatedReqs };
      setFormRequirements(updated);
      if (teamId && !requirementsSubmission?.isLocked) {
        localStorage.setItem(`synapse_draft_requirements_${teamId}`, JSON.stringify(updated));
      }
    }
  };

  const handleReqGeneralNotesChange = (value: string) => {
    const updated = { ...formRequirements, generalNotes: value };
    setFormRequirements(updated);
    if (teamId && !requirementsSubmission?.isLocked) {
      localStorage.setItem(`synapse_draft_requirements_${teamId}`, JSON.stringify(updated));
    }
  };

  const handleReqFieldChange = (
    field: 'companyName' | 'methodologySummary' | 'generalNotes',
    value: string
  ) => {
    const updated = { ...formRequirements, [field]: value };
    setFormRequirements(updated);
    if (teamId && !requirementsSubmission?.isLocked) {
      localStorage.setItem(`synapse_draft_requirements_${teamId}`, JSON.stringify(updated));
    }
  };

  // -------------------------------------------------------------
  // Draft & Submission Handlers
  // -------------------------------------------------------------
  const handleSaveCleaningDraft = async () => {
    setSaving(true);
    setNotice(null);
    try {
      const res = await api.put<{ submission: Submission }>('/submissions/draft', {
        stage: 'cleaning',
        payload: formCleaning,
      });
      setCleaningSubmission(res.submission);
      setNotice({ type: 'success', message: 'Cleaning draft saved successfully.' });
    } catch (err: any) {
      setNotice({ type: 'error', message: err.message || 'Failed to save cleaning draft.' });
    } finally {
      setSaving(false);
    }
  };

  const handleSubmitCleaning = async () => {
    setCleanSubmitError(null);
    if (!formCleaning.cleanedDatasetUrl.trim()) {
      setCleanSubmitError('Please enter a valid Cleaned Dataset URL.');
      return;
    }
    try {
      new URL(formCleaning.cleanedDatasetUrl.trim());
    } catch {
      setCleanSubmitError('The Cleaned Dataset URL must be a valid web link (e.g. https://drive.google.com/...).');
      return;
    }
    if (!formCleaning.cleaningSummary.trim() || formCleaning.cleaningSummary.trim().length < 5) {
      setCleanSubmitError('Please provide a summary of your cleaning steps (at least 5 characters).');
      return;
    }
    if (!formCleaning.cleaningNotes.trim() || formCleaning.cleaningNotes.trim().length < 5) {
      setCleanSubmitError('Please provide technical notes and libraries used (at least 5 characters).');
      return;
    }

    setSubmitting(true);
    setNotice(null);
    try {
      const res = await api.post<{ submission: Submission }>('/submissions/submit', {
        stage: 'cleaning',
        payload: formCleaning,
      });
      setCleaningSubmission(res.submission);
      setHasSubmittedCleaning(true);
      setConfirmCleanModal(false);
      setCleanSubmitError(null);
      localStorage.removeItem(`synapse_draft_cleaning_${teamId}`);
      setNotice({
        type: 'success',
        message: 'Cleaning dataset and methodology submitted successfully! Step 2 unlocked.',
      });
      // Advance to requirements section
      handleSelectSection('requirements');
      await loadTeamData(true);
    } catch (err: any) {
      setCleanSubmitError(err.message || 'Submission failed. Please check your inputs and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveRequirementsDraft = async () => {
    setSaving(true);
    setNotice(null);
    try {
      const payloadToSend = {
        ...formRequirements,
        companyName:
          formRequirements.companyName ||
          formRequirements.requirements.map((r) => r.companyName).filter(Boolean).join(', ') ||
          'Enterprise Solution Track',
      };
      const res = await api.put<{ submission: Submission }>('/submissions/draft', {
        stage: 'requirements',
        payload: payloadToSend,
      });
      setRequirementsSubmission(res.submission);
      setNotice({ type: 'success', message: 'Requirements draft saved successfully.' });
    } catch (err: any) {
      setNotice({ type: 'error', message: err.message || 'Failed to save requirements draft.' });
    } finally {
      setSaving(false);
    }
  };

  const handleSubmitRequirements = async () => {
    setReqSubmitError(null);

    // Validate that each requirement has target company and at least 5 characters response
    for (let i = 0; i < formRequirements.requirements.length; i++) {
      const item = formRequirements.requirements[i];
      if (!item.companyName || !item.companyName.trim() || item.companyName.trim().length < 2) {
        setReqSubmitError(`Please specify the Target Output Company for "${item.title || `Feature #${i + 1}`}".`);
        return;
      }
      if (!item.response || !item.response.trim() || item.response.trim().length < 5) {
        setReqSubmitError(`Please provide a methodology description for "${item.title || `Feature #${i + 1}`}" (at least 5 characters).`);
        return;
      }
    }

    setSubmitting(true);
    setNotice(null);
    try {
      const payloadToSend = {
        ...formRequirements,
        companyName:
          formRequirements.companyName ||
          formRequirements.requirements.map((r) => r.companyName).filter(Boolean).join(', ') ||
          'Enterprise Solution Track',
      };
      const res = await api.post<{ submission: Submission }>('/submissions/submit', {
        stage: 'requirements',
        payload: payloadToSend,
      });
      setRequirementsSubmission(res.submission);
      setHasSubmittedRequirements(true);
      setConfirmReqModal(false);
      setReqSubmitError(null);
      localStorage.removeItem(`synapse_draft_requirements_${teamId}`);
      setNotice({
        type: 'success',
        message: 'All requirements submitted and finalized! Leaderboard unlocked.',
      });
      // Advance to leaderboard section
      handleSelectSection('leaderboard');
      await loadTeamData(true);
      await loadLeaderboard();
    } catch (err: any) {
      setReqSubmitError(err.message || 'Submission failed. Please check your inputs and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // -------------------------------------------------------------
  // Guards & Checks
  // -------------------------------------------------------------
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
        description={`Your account (${user.email}) is not linked to a registered team. Contact staff if you believe this is an error.`}
      />
    );
  }

  const isCleaningLocked = !!cleaningSubmission?.isLocked;
  const isReqLocked = !!requirementsSubmission?.isLocked;
  const canEditCleaning = isLeader && !isCleaningLocked && !team.disqualified && !participant?.restricted;
  const canEditRequirements =
    isLeader && hasSubmittedCleaning && !isReqLocked && !team.disqualified && !participant?.restricted;

  return (
    <div className="space-y-6">
      {/* Team Header */}
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
              {user.name} ({user.email}) &bull; {team.members?.length || 0} Registered Members
            </p>
          </div>

          <div className="flex items-center gap-2">
            {!isEventStarted ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-amber-50 text-amber-800 text-xs font-semibold border border-amber-200">
                <Clock className="w-3.5 h-3.5 text-amber-600 animate-spin" />
                Waiting for Admin Launch
              </span>
            ) : hasSubmittedRequirements ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-emerald-50 text-emerald-800 text-xs font-semibold border border-emerald-200">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                All Submissions Completed
              </span>
            ) : hasSubmittedCleaning ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-blue-50 text-blue-800 text-xs font-semibold border border-blue-200">
                <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                Requirements In Progress
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-signal-light/40 text-signal text-xs font-semibold border border-signal/20">
                Cleaning Active
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

      {/* EVENT NOT STARTED WAITING STATE */}
      {!isEventStarted && (
        <div className="bg-white rounded-lg border border-mist p-10 text-center space-y-4 shadow-sm">
          <div className="w-16 h-16 rounded-full bg-amber-50 border border-amber-200 text-amber-600 mx-auto flex items-center justify-center">
            <Clock className="w-8 h-8" />
          </div>
          <div className="max-w-md mx-auto">
            <h3 className="text-xl font-serif font-bold text-ink">Competition Has Not Started</h3>
            <p className="text-xs text-ink-muted mt-2 leading-relaxed">
              The administrators have not officially launched the event yet. The challenge dataset and submission
              interfaces will unlock automatically once the event begins.
            </p>
          </div>
          <div className="pt-2">
            <Button
              variant="secondary"
              size="sm"
              loading={loading}
              icon={<RotateCw className="w-3.5 h-3.5" />}
              onClick={() => loadTeamData(false)}
            >
              Check Launch Status
            </Button>
          </div>
        </div>
      )}

      {/* EVENT STARTED: SEQUENTIAL STAGE WORKSPACE */}
      {isEventStarted && (
        <div className="space-y-6">
          {/* Sequential Step Navigation Bar */}
          <div className="bg-white rounded-lg border border-mist p-2 flex items-center justify-between gap-2 overflow-x-auto no-scrollbar shadow-sm">
            {/* Step 1 Pill */}
            <button
              onClick={() => handleSelectSection('cleaning')}
              className={`flex-1 min-w-[200px] flex items-center gap-3 p-3 rounded-md text-left transition-all ${
                activeSection === 'cleaning'
                  ? 'bg-ink text-white shadow-sm'
                  : 'hover:bg-paper text-ink'
              }`}
            >
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                  hasSubmittedCleaning
                    ? 'bg-emerald-600 text-white'
                    : activeSection === 'cleaning'
                    ? 'bg-signal text-white'
                    : 'bg-mist text-ink-muted'
                }`}
              >
                {hasSubmittedCleaning ? <CheckCircle2 className="w-4 h-4" /> : '1'}
              </div>
              <div>
                <div className="text-xs font-bold leading-tight">Dataset Cleaning</div>
                <div
                  className={`text-[11px] ${
                    activeSection === 'cleaning' ? 'text-gray-300' : 'text-ink-muted'
                  }`}
                >
                  {hasSubmittedCleaning ? 'Submitted & Locked' : 'Dataset & Techniques'}
                </div>
              </div>
            </button>

            {/* Step 2 Pill */}
            <button
              disabled={!hasSubmittedCleaning}
              onClick={() => handleSelectSection('requirements')}
              className={`flex-1 min-w-[200px] flex items-center gap-3 p-3 rounded-md text-left transition-all ${
                !hasSubmittedCleaning
                  ? 'opacity-50 cursor-not-allowed text-ink-muted'
                  : activeSection === 'requirements'
                  ? 'bg-ink text-white shadow-sm'
                  : 'hover:bg-paper text-ink'
              }`}
            >
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                  hasSubmittedRequirements
                    ? 'bg-emerald-600 text-white'
                    : hasSubmittedCleaning
                    ? activeSection === 'requirements'
                      ? 'bg-signal text-white'
                      : 'bg-mist-dark text-ink'
                    : 'bg-mist text-ink-muted'
                }`}
              >
                {hasSubmittedRequirements ? (
                  <CheckCircle2 className="w-4 h-4" />
                ) : !hasSubmittedCleaning ? (
                  <Lock className="w-3.5 h-3.5" />
                ) : (
                  '2'
                )}
              </div>
              <div>
                <div className="text-xs font-bold leading-tight">The 5 Requirements</div>
                <div
                  className={`text-[11px] ${
                    activeSection === 'requirements' ? 'text-gray-300' : 'text-ink-muted'
                  }`}
                >
                  {!hasSubmittedCleaning
                    ? 'Locked until Step 1 submitted'
                    : hasSubmittedRequirements
                    ? 'Submitted & Locked'
                    : 'Configured tracks'}
                </div>
              </div>
            </button>

            {/* Step 3 Pill */}
            <button
              disabled={!hasSubmittedRequirements}
              onClick={() => handleSelectSection('leaderboard')}
              className={`flex-1 min-w-[200px] flex items-center gap-3 p-3 rounded-md text-left transition-all ${
                !hasSubmittedRequirements
                  ? 'opacity-50 cursor-not-allowed text-ink-muted'
                  : activeSection === 'leaderboard'
                  ? 'bg-ink text-white shadow-sm'
                  : 'hover:bg-paper text-ink'
              }`}
            >
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                  hasSubmittedRequirements
                    ? activeSection === 'leaderboard'
                      ? 'bg-signal text-white'
                      : 'bg-mist-dark text-ink'
                    : 'bg-mist text-ink-muted'
                }`}
              >
                {!hasSubmittedRequirements ? <Lock className="w-3.5 h-3.5" /> : <Award className="w-4 h-4" />}
              </div>
              <div>
                <div className="text-xs font-bold leading-tight">Live Leaderboard</div>
                <div
                  className={`text-[11px] ${
                    activeSection === 'leaderboard' ? 'text-gray-300' : 'text-ink-muted'
                  }`}
                >
                  {!hasSubmittedRequirements ? 'Locked until Step 2 submitted' : 'Team Standings & Scores'}
                </div>
              </div>
            </button>
          </div>

          {/* ========================================================= */}
          {/* SECTION 1: DATASET CLEANING & SUBMISSION */}
          {/* ========================================================= */}
          {activeSection === 'cleaning' && (
            <div className="space-y-6">
              {/* Raw Dataset Download Card */}
              {cleaningDataset && cleaningDataset.fileUrl ? (
                <div className="bg-white rounded-lg border border-mist p-6 shadow-sm">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <div className="text-[11px] font-bold text-signal uppercase tracking-wider mb-1">
                        Official Challenge Dataset
                      </div>
                      <h3 className="text-lg font-serif font-bold text-ink">{cleaningDataset.title}</h3>
                      {cleaningDataset.description && (
                        <p className="text-xs text-ink-muted mt-1 leading-relaxed max-w-2xl">
                          {cleaningDataset.description}
                        </p>
                      )}
                    </div>
                    <a
                      href={cleaningDataset.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-md bg-signal text-white text-xs font-semibold hover:bg-signal-hover transition-colors shadow-sm flex-shrink-0"
                    >
                      <Download className="w-4 h-4" />
                      Download Raw Dataset
                    </a>
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-paper rounded border border-mist text-xs text-ink-muted">
                  Dataset files will be provisioned by administrators shortly.
                </div>
              )}

              {/* Cleaning Submission Form */}
              <Card
                title="Cleaned Dataset & Transformation Methodology"
                subtitle="Submit your cleaned dataset link and transformation summary"
              >
                {isCleaningLocked && (
                  <div className="p-3 bg-mist-light rounded border border-mist mb-6 flex items-center justify-between text-xs">
                    <span className="text-ink">
                      Submitted on{' '}
                      <strong>
                        {cleaningSubmission?.submittedAt
                          ? new Date(cleaningSubmission.submittedAt).toLocaleString()
                          : 'Recorded'}
                      </strong>{' '}
                      &bull; <span className="text-emerald-700 font-semibold">Records are immutable</span>
                    </span>
                    <Badge variant="signal">Submitted & Locked</Badge>
                  </div>
                )}

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-ink uppercase mb-1">
                      Cleaned Dataset URL *
                    </label>
                    <input
                      type="url"
                      disabled={!canEditCleaning}
                      value={formCleaning.cleanedDatasetUrl}
                      onChange={(e) => handleCleaningChange('cleanedDatasetUrl', e.target.value)}
                      placeholder="https://drive.google.com/... or https://storage.googleapis.com/..."
                      className="input-field text-xs"
                    />
                    <p className="text-[11px] text-ink-muted mt-1">
                      Provide a publicly accessible or downloadable URL for evaluators.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-ink uppercase mb-1">
                      Summary of Cleaning Steps *
                    </label>
                    <textarea
                      rows={3}
                      disabled={!canEditCleaning}
                      value={formCleaning.cleaningSummary}
                      onChange={(e) => handleCleaningChange('cleaningSummary', e.target.value)}
                      placeholder="Summarize missing value imputation, outlier detection, coordinate normalization, etc."
                      className="input-field text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-ink uppercase mb-1">
                      Technical Notes, Libraries & Answers *
                    </label>
                    <textarea
                      rows={4}
                      disabled={!canEditCleaning}
                      value={formCleaning.cleaningNotes}
                      onChange={(e) => handleCleaningChange('cleaningNotes', e.target.value)}
                      placeholder="Libraries (e.g. pandas, polars), algorithms applied, and methodology details."
                      className="input-field font-mono text-xs"
                    />
                  </div>

                  {canEditCleaning && (
                    <div className="pt-4 border-t border-mist flex items-center justify-end gap-3">
                      <Button
                        variant="secondary"
                        loading={saving}
                        icon={<Save className="w-4 h-4" />}
                        onClick={handleSaveCleaningDraft}
                      >
                        Save Draft
                      </Button>
                      <Button
                        variant="primary"
                        loading={submitting}
                        icon={<Send className="w-4 h-4" />}
                        onClick={() => {
                          setCleanSubmitError(null);
                          setConfirmCleanModal(true);
                        }}
                      >
                        Submit Cleaning Phase
                      </Button>
                    </div>
                  )}

                  {!isLeader && !isCleaningLocked && (
                    <p className="text-xs text-ink-muted italic text-right">
                      Only the team leader can save drafts and finalize the submission.
                    </p>
                  )}
                </div>
              </Card>
            </div>
          )}

          {/* ========================================================= */}
          {/* SECTION 2: THE FIVE REQUIREMENTS */}
          {/* ========================================================= */}
          {activeSection === 'requirements' && (
            <div className="space-y-6">
              <Card
                title="The Five Requirements"
                subtitle="Configured specialized tracks unlocked following dataset cleaning"
              >
                {isReqLocked && (
                  <div className="p-3 bg-mist-light rounded border border-mist mb-6 flex items-center justify-between text-xs">
                    <span className="text-ink">
                      Submitted on{' '}
                      <strong>
                        {requirementsSubmission?.submittedAt
                          ? new Date(requirementsSubmission.submittedAt).toLocaleString()
                          : 'Recorded'}
                      </strong>{' '}
                      &bull; <span className="text-emerald-700 font-semibold">Records are immutable</span>
                    </span>
                    <Badge variant="signal">Submitted & Locked</Badge>
                  </div>
                )}

                <div className="space-y-6">
                  {formRequirements.requirements.map((reqItem, idx) => (
                    <div key={idx} className="p-4 bg-paper/60 rounded-lg border border-mist space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="text-[11px] font-bold text-signal uppercase tracking-wider">
                          Feature #{idx + 1}
                        </div>
                        {reqItem.companyName.trim().length >= 2 && reqItem.response.trim().length >= 5 && (
                          <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 font-semibold">
                            <CheckCircle2 className="w-3 h-3" /> Ready
                          </span>
                        )}
                      </div>

                      <h4 className="text-sm font-serif font-bold text-ink">{reqItem.title}</h4>

                      <div>
                        <label className="block text-[11px] font-semibold text-ink uppercase mb-1">
                          Target Output Company / Organization *
                        </label>
                        <input
                          type="text"
                          disabled={!canEditRequirements}
                          value={reqItem.companyName}
                          onChange={(e) => handleReqItemChange(idx, 'companyName', e.target.value)}
                          placeholder="e.g. Tesla, SpaceX, Google Health, Novo Nordisk..."
                          className="input-field text-xs"
                        />
                        <p className="text-[11px] text-ink-muted mt-1">
                          Specify the target enterprise or organization for this specific feature.
                        </p>
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-ink uppercase mb-1">
                          Methodology & Solution Description *
                        </label>
                        <textarea
                          rows={3}
                          disabled={!canEditRequirements}
                          value={reqItem.response}
                          onChange={(e) => handleReqItemChange(idx, 'response', e.target.value)}
                          placeholder={`Explain your methodology, architecture, and results for ${reqItem.title}`}
                          className="input-field text-xs"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-semibold text-ink uppercase mb-1">
                            Source / Deliverable Link (Optional)
                          </label>
                          <input
                            type="url"
                            disabled={!canEditRequirements}
                            value={reqItem.link}
                            onChange={(e) => handleReqItemChange(idx, 'link', e.target.value)}
                            placeholder="https://github.com/... or https://drive.google.com/..."
                            className="input-field text-xs"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-ink uppercase mb-1">
                            Additional Notes (Optional)
                          </label>
                          <input
                            type="text"
                            disabled={!canEditRequirements}
                            value={reqItem.notes}
                            onChange={(e) => handleReqItemChange(idx, 'notes', e.target.value)}
                            placeholder="Validation metrics, dependencies, or trade-offs"
                            className="input-field text-xs"
                          />
                        </div>
                      </div>
                    </div>
                  ))}

                  <div>
                    <label className="block text-xs font-semibold text-ink uppercase mb-1">
                      General Project Overview & Repository Notes
                    </label>
                    <textarea
                      rows={3}
                      disabled={!canEditRequirements}
                      value={formRequirements.generalNotes}
                      onChange={(e) => handleReqGeneralNotesChange(e.target.value)}
                      placeholder="Overall project summary, shared dependencies, or instructions for evaluators."
                      className="input-field text-xs"
                    />
                  </div>

                  {canEditRequirements && (
                    <div className="pt-4 border-t border-mist flex items-center justify-end gap-3">
                      <Button
                        variant="secondary"
                        loading={saving}
                        icon={<Save className="w-4 h-4" />}
                        onClick={handleSaveRequirementsDraft}
                      >
                        Save Draft
                      </Button>
                      <Button
                        variant="primary"
                        loading={submitting}
                        icon={<Send className="w-4 h-4" />}
                        onClick={() => {
                          setReqSubmitError(null);
                          setConfirmReqModal(true);
                        }}
                      >
                        Submit All Requirements
                      </Button>
                    </div>
                  )}

                  {!isLeader && !isReqLocked && (
                    <p className="text-xs text-ink-muted italic text-right">
                      Only the team leader can save drafts and finalize the submission.
                    </p>
                  )}
                </div>
              </Card>
            </div>
          )}

          {/* ========================================================= */}
          {/* SECTION 3: LIVE LEADERBOARD */}
          {/* ========================================================= */}
          {activeSection === 'leaderboard' && (
            <Card
              title="Official Competition Leaderboard"
              subtitle="Current team standings and score calculations (Default score 0 for pending evaluations)"
            >
              <div className="flex items-center justify-end pb-3">
                <Button
                  variant="secondary"
                  size="sm"
                  loading={leaderboardLoading}
                  icon={<RotateCw className="w-3.5 h-3.5" />}
                  onClick={loadLeaderboard}
                >
                  Refresh Standings
                </Button>
              </div>

              {leaderboard.length === 0 ? (
                <div className="p-8 text-center text-xs text-ink-muted">
                  No registered teams found on leaderboard.
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
                      {leaderboard.map((entry) => {
                        const isMyTeam = entry.teamId === teamId;
                        return (
                          <tr
                            key={entry.teamId}
                            className={`border-b border-mist transition-colors ${
                              isMyTeam ? 'bg-signal/5 font-semibold' : 'hover:bg-paper/40'
                            }`}
                          >
                            <td className="table-cell font-bold text-center">
                              {entry.rank === 1 ? (
                                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-saffron text-ink text-xs font-bold shadow-sm">
                                  1
                                </span>
                              ) : entry.rank === 2 ? (
                                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-300 text-ink text-xs font-bold shadow-sm">
                                  2
                                </span>
                              ) : entry.rank === 3 ? (
                                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-600/30 text-ink text-xs font-bold shadow-sm">
                                  3
                                </span>
                              ) : (
                                <span className="text-ink-muted">{entry.rank}</span>
                              )}
                            </td>
                            <td className="table-cell">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-ink">{entry.teamName}</span>
                                {isMyTeam && (
                                  <span className="text-[10px] font-bold text-signal uppercase tracking-wider px-1.5 py-0.5 rounded bg-signal-light">
                                    Your Team
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="table-cell text-right font-mono font-bold text-ink">
                              {entry.score ?? 0}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          )}
        </div>
      )}

      {/* Confirmation Modal: Submit Cleaning */}
      <Modal
        isOpen={confirmCleanModal}
        onClose={() => {
          setCleanSubmitError(null);
          setConfirmCleanModal(false);
        }}
        title="Confirm Dataset Cleaning Submission"
      >
        <div className="space-y-4 text-xs text-ink leading-relaxed">
          {cleanSubmitError && (
            <Alert type="error" title="Submission Issue">
              {cleanSubmitError}
            </Alert>
          )}

          <p>
            You are submitting the cleaned dataset link and transformation summary on behalf of{' '}
            <strong>{team.teamName}</strong>.
          </p>
          <div className="p-3 bg-amber-50 text-amber-900 rounded border border-amber-200 text-[11px] space-y-1">
            <p className="font-bold">Important Notice:</p>
            <p>
              Once submitted, your cleaning submission is locked and immutable. This will unlock the Five
              Requirements tracks.
            </p>
          </div>

          <div className="pt-3 flex items-center justify-end gap-2 border-t border-mist">
            <Button
              variant="secondary"
              onClick={() => {
                setCleanSubmitError(null);
                setConfirmCleanModal(false);
              }}
            >
              Cancel
            </Button>
            <Button variant="primary" loading={submitting} onClick={handleSubmitCleaning}>
              Confirm & Submit
            </Button>
          </div>
        </div>
      </Modal>

      {/* Confirmation Modal: Submit Requirements */}
      <Modal
        isOpen={confirmReqModal}
        onClose={() => {
          setReqSubmitError(null);
          setConfirmReqModal(false);
        }}
        title="Confirm Final Requirements Submission"
      >
        <div className="space-y-4 text-xs text-ink leading-relaxed">
          {reqSubmitError && (
            <Alert type="error" title="Submission Issue">
              {reqSubmitError}
            </Alert>
          )}

          <p>
            You are submitting all responses for the Five Requirements on behalf of{' '}
            <strong>{team.teamName}</strong>.
          </p>
          <div className="p-3 bg-red-50 text-red-900 rounded border border-red-200 text-[11px] space-y-1">
            <p className="font-bold">Permanent Finalization:</p>
            <p>
              Once submitted, your entries are completely locked and cannot be edited. Evaluators will grade
              your submissions and the official leaderboard will be updated.
            </p>
          </div>

          <div className="pt-3 flex items-center justify-end gap-2 border-t border-mist">
            <Button
              variant="secondary"
              onClick={() => {
                setReqSubmitError(null);
                setConfirmReqModal(false);
              }}
            >
              Cancel
            </Button>
            <Button variant="primary" loading={submitting} onClick={handleSubmitRequirements}>
              Confirm & Finalize
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
