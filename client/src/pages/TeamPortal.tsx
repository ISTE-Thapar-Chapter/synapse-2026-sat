import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { api } from '../services/api.js';
import { Card } from '../components/UI/Card.js';
import { Badge } from '../components/UI/Badge.js';
import { Button } from '../components/UI/Button.js';
import { Alert } from '../components/UI/Alert.js';
import { Modal } from '../components/UI/Modal.js';
import { EmptyState } from '../components/UI/EmptyState.js';
import {
  Submission,
  LeaderboardEntry,
  ParticipantRoundRobinState,
  CompanyPoolItem,
  TeamAuctionBalance,
} from '../types/index.js';
import { LiveAuctionViewer } from '../components/Auction/LiveAuctionViewer.js';
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
  Building2,
  Gavel,
} from 'lucide-react';

export const TeamPortal: React.FC = () => {
  const { user, participant, team, isLeader } = useAuth();

  // Navigation / Section State (persisted across page reloads)
  const [activeSection, setActiveSection] = useState<
    'cleaning' | 'requirements' | 'leaderboard' | 'companies' | 'final'
  >('cleaning');

  // Company selection subtabs: Queue 1 (Round Robin), Live Auction floor, or Queue 2
  const [companySubTab, setCompanySubTab] = useState<'queue1' | 'auction' | 'queue2'>('queue1');
  const [teamBalance, setTeamBalance] = useState<TeamAuctionBalance | null>(null);
  const [assignedCompanies, setAssignedCompanies] = useState<Array<{ id: string; name: string; description: string; source: string }>>([]);
  const [hasSelectedTwoCompanies, setHasSelectedTwoCompanies] = useState<boolean>(false);

  // Final Project Pitch State
  const [finalSubmission, setFinalSubmission] = useState<Submission | null>(null);
  const [hasSubmittedFinal, setHasSubmittedFinal] = useState<boolean>(false);
  const [confirmFinalModal, setConfirmFinalModal] = useState<boolean>(false);
  const [finalSubmitError, setFinalSubmitError] = useState<string | null>(null);
  const [formFinal, setFormFinal] = useState({
    productName: '',
    productDescription: '',
    prototypeUrl: '',
    githubUrl: '',
  });

  // Round Robin State
  const [roundRobinStatus, setRoundRobinStatus] = useState<ParticipantRoundRobinState | null>(null);
  const [activeQueueTab, setActiveQueueTab] = useState<1 | 2>(1);
  const [selectedCompanyToConfirm, setSelectedCompanyToConfirm] = useState<{
    queueNumber: 1 | 2;
    company: CompanyPoolItem;
  } | null>(null);
  const [companySelecting, setCompanySelecting] = useState<boolean>(false);
  const [companySelectError, setCompanySelectError] = useState<string | null>(null);

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

  // Form: Dataset Cleaning & Architecture Links
  const [formCleaning, setFormCleaning] = useState({
    cleanedDatasetUrl: '',
    datasetUrl: '',
    psbUrl: '',
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
        hasSubmittedFinal?: boolean;
        cleaningSubmission: Submission | null;
        requirementsSubmission: Submission | null;
        finalSubmission: Submission | null;
        requirements: string[];
        assignedCompanies?: Array<{ id: string; name: string; description: string; source: string }>;
        hasSelectedTwoCompanies?: boolean;
      }>('/submissions/current');

      setIsEventStarted(!!data.isEventStarted);
      setCleaningDataset(data.cleaningDataset || null);
      setHasSubmittedCleaning(!!data.hasSubmittedCleaning);
      setHasSubmittedRequirements(!!data.hasSubmittedRequirements);
      setHasSubmittedFinal(!!data.hasSubmittedFinal);
      setCleaningSubmission(data.cleaningSubmission || null);
      setRequirementsSubmission(data.requirementsSubmission || null);
      setFinalSubmission(data.finalSubmission || null);
      setRequirementsList(data.requirements || []);
      setAssignedCompanies(data.assignedCompanies || []);
      setHasSelectedTwoCompanies(!!data.hasSelectedTwoCompanies);

      // Load team auction balance
      api.get<TeamAuctionBalance>('/auction/my-balance').then(setTeamBalance).catch(console.error);

      // 1. Populate Cleaning Form (backend submitted / draft, or local draft if uncommitted)
      const cleanSub = data.cleaningSubmission;
      const cleanLocked = !!cleanSub?.isLocked;
      const localCleanKey = `synapse_draft_cleaning_${teamId}`;
      const localCleanDraft = localStorage.getItem(localCleanKey);

      if (cleanLocked && cleanSub?.payload) {
        setFormCleaning({
          cleanedDatasetUrl: cleanSub.payload.cleanedDatasetUrl || cleanSub.payload.datasetUrl || '',
          datasetUrl: cleanSub.payload.datasetUrl || cleanSub.payload.cleanedDatasetUrl || '',
          psbUrl: cleanSub.payload.psbUrl || '',
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
              cleanedDatasetUrl: cleanSub.payload.cleanedDatasetUrl || cleanSub.payload.datasetUrl || '',
              datasetUrl: cleanSub.payload.datasetUrl || cleanSub.payload.cleanedDatasetUrl || '',
              psbUrl: cleanSub.payload.psbUrl || '',
              cleaningSummary: cleanSub.payload.cleaningSummary || '',
              cleaningNotes: cleanSub.payload.cleaningNotes || '',
            });
          }
        }
      } else if (cleanSub?.payload) {
        setFormCleaning({
          cleanedDatasetUrl: cleanSub.payload.cleanedDatasetUrl || cleanSub.payload.datasetUrl || '',
          datasetUrl: cleanSub.payload.datasetUrl || cleanSub.payload.cleanedDatasetUrl || '',
          psbUrl: cleanSub.payload.psbUrl || '',
          cleaningSummary: cleanSub.payload.cleaningSummary || '',
          cleaningNotes: cleanSub.payload.cleaningNotes || '',
        });
      }

      // Populate Final Project Form if available
      const finSub = data.finalSubmission;
      const finPayload = finSub?.payload?.finalSubmission || finSub?.payload || {};
      if (finSub?.isLocked && finPayload) {
        setFormFinal({
          productName: finPayload.productName || finPayload.title || '',
          productDescription: finPayload.productDescription || '',
          prototypeUrl: finPayload.prototypeUrl || finPayload.sourceUrl || '',
          githubUrl: finPayload.githubUrl || '',
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
        | 'companies'
        | null;

      if (savedSection) {
        // Validate that savedSection is accessible
        if (savedSection === 'companies') {
          setActiveSection('companies');
        } else if (savedSection === 'leaderboard' && data.hasSubmittedRequirements) {
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

  // Load Round Robin Status
  const loadRoundRobinStatus = async (silent = false) => {
    try {
      const data = await api.get<ParticipantRoundRobinState>('/round-robin/my-status');
      setRoundRobinStatus(data);
    } catch (err) {
      // Ignore 404/silent on load
    }
  };

  const handleSelectCompany = async (queueNumber: 1 | 2, companyId: string) => {
    setCompanySelecting(true);
    setCompanySelectError(null);
    try {
      const res = await api.post<{ message: string; assignedCompany: any }>(
        `/round-robin/queue/${queueNumber}/select`,
        { companyId }
      );
      setNotice({ type: 'success', message: res.message });
      setSelectedCompanyToConfirm(null);
      await loadRoundRobinStatus(true);
      await loadTeamData(true);
    } catch (err: any) {
      setCompanySelectError(err.message || 'Failed to select company.');
    } finally {
      setCompanySelecting(false);
    }
  };

  useEffect(() => {
    if (activeSection === 'leaderboard' || hasSubmittedRequirements) {
      loadLeaderboard();
    }
  }, [activeSection, hasSubmittedRequirements]);

  useEffect(() => {
    if (!teamId) return;
    loadRoundRobinStatus();
    const interval = setInterval(() => {
      loadRoundRobinStatus(true);
    }, 3000);
    return () => clearInterval(interval);
  }, [teamId]);

  // Handle section switch & persist in localStorage
  const handleSelectSection = (sec: 'cleaning' | 'requirements' | 'leaderboard' | 'companies' | 'final') => {
    setActiveSection(sec);
    if (teamId) {
      localStorage.setItem(`synapse_preview_section_${teamId}`, sec);
    }
  };

  const handleSaveFinalDraft = async () => {
    setSaving(true);
    setNotice(null);
    try {
      const res = await api.put<{ submission: Submission }>('/submissions/draft', {
        stage: 'final-submission',
        payload: {
          finalSubmission: formFinal,
        },
      });
      setFinalSubmission(res.submission);
      setNotice({ type: 'success', message: 'Final project draft saved successfully.' });
    } catch (err: any) {
      setNotice({ type: 'error', message: err.message || 'Failed to save draft.' });
    } finally {
      setSaving(false);
    }
  };

  const handleFinalSubmit = async () => {
    setFinalSubmitError(null);
    if (!formFinal.productName.trim()) {
      setFinalSubmitError('Please enter a product name.');
      return;
    }
    if (!formFinal.productDescription.trim() || formFinal.productDescription.trim().length < 10) {
      setFinalSubmitError('Please provide a product description (at least 10 characters).');
      return;
    }
    if (!formFinal.prototypeUrl.trim()) {
      setFinalSubmitError('Please provide a valid web link for your prototype or pitch demonstration.');
      return;
    }
    try {
      new URL(formFinal.prototypeUrl.trim());
    } catch {
      setFinalSubmitError('Prototype link must be a valid web link (e.g. starting with https://).');
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.post<{ submission: Submission }>('/submissions/submit', {
        stage: 'final-submission',
        payload: {
          finalSubmission: formFinal,
        },
      });
      setFinalSubmission(res.submission);
      setHasSubmittedFinal(true);
      setConfirmFinalModal(false);
      setNotice({ type: 'success', message: 'Final project submitted successfully! Challenge completed.' });
    } catch (err: any) {
      setFinalSubmitError(err.message || 'Failed to submit final project.');
    } finally {
      setSubmitting(false);
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
    const datasetUrl = (formCleaning.cleanedDatasetUrl || formCleaning.datasetUrl || '').trim();
    if (!datasetUrl) {
      setCleanSubmitError('Please provide a valid Cleaned Dataset web link.');
      return;
    }
    try {
      new URL(datasetUrl);
    } catch {
      setCleanSubmitError('The Cleaned Dataset link must be a valid web link (e.g. starting with https://).');
      return;
    }

    if (!formCleaning.psbUrl.trim()) {
      setCleanSubmitError('Please provide a valid web link to your architecture or .psb file.');
      return;
    }
    try {
      new URL(formCleaning.psbUrl.trim());
    } catch {
      setCleanSubmitError('The architecture / .psb link must be a valid web link (e.g. starting with https://).');
      return;
    }

    setSubmitting(true);
    setNotice(null);
    try {
      const payloadToSend = {
        ...formCleaning,
        cleanedDatasetUrl: datasetUrl,
        datasetUrl: datasetUrl,
      };
      const res = await api.post<{ submission: Submission }>('/submissions/submit', {
        stage: 'cleaning',
        payload: payloadToSend,
      });
      setCleaningSubmission(res.submission);
      setHasSubmittedCleaning(true);
      setConfirmCleanModal(false);
      setCleanSubmitError(null);
      localStorage.removeItem(`synapse_draft_cleaning_${teamId}`);
      setNotice({
        type: 'success',
        message: 'Dataset and architecture links submitted successfully! Step 2 unlocked.',
      });
      // Advance to requirements section
      handleSelectSection('requirements');
      await loadTeamData(true);
    } catch (err: any) {
      setCleanSubmitError(err.message || 'Submission failed. Please check your links and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveRequirementsDraft = async () => {
    setSaving(true);
    setNotice(null);
    try {
      const payloadToSend = {
        features: formRequirements.requirements.map((r, i) => ({
          featureIndex: i,
          title: r.title,
          companyName: (r.companyName || '').trim(),
        })),
        requirements: formRequirements.requirements,
      };
      const res = await api.put<{ submission: Submission }>('/submissions/draft', {
        stage: 'requirements',
        payload: payloadToSend,
      });
      setRequirementsSubmission(res.submission);
      setNotice({ type: 'success', message: 'Feature company names draft saved successfully.' });
    } catch (err: any) {
      setNotice({ type: 'error', message: err.message || 'Failed to save draft.' });
    } finally {
      setSaving(false);
    }
  };

  const handleSubmitRequirements = async () => {
    setReqSubmitError(null);

    // Validate that each feature set has an identified company name
    const missing = formRequirements.requirements.find(
      (r) => !r.companyName || r.companyName.trim().length < 2
    );
    if (missing) {
      setReqSubmitError(`Please specify the identified company name for "${missing.title}".`);
      return;
    }

    setSubmitting(true);
    setNotice(null);
    try {
      const payloadToSend = {
        features: formRequirements.requirements.map((r, i) => ({
          featureIndex: i,
          title: r.title,
          companyName: r.companyName.trim(),
        })),
        requirements: formRequirements.requirements,
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
        message: 'Feature identifications submitted successfully! Awaiting mentor review.',
      });
      handleSelectSection('leaderboard');
      await loadTeamData(true);
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
          {/* Persistent Assigned Companies Banner */}
          {roundRobinStatus &&
            (roundRobinStatus.queue1.myAssignment || roundRobinStatus.queue2.myAssignment) && (
              <div className="bg-white rounded-lg border border-mist p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-signal mb-1">
                    Official Company Allocation
                  </div>
                  <div className="flex flex-wrap items-center gap-4 text-xs">
                    <div>
                      <span className="text-ink-muted">Company 1 (Queue 1): </span>
                      <strong className="text-ink">
                        {roundRobinStatus.queue1.myAssignment?.companyName || 'Selection in progress'}
                      </strong>
                    </div>
                    <span className="text-mist-dark">&bull;</span>
                    <div>
                      <span className="text-ink-muted">Company 2 (Queue 2): </span>
                      <strong className="text-ink">
                        {roundRobinStatus.queue2.myAssignment?.companyName || 'Selection in progress'}
                      </strong>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => handleSelectSection('companies')}
                  className="text-xs font-semibold text-signal hover:underline flex items-center gap-1"
                >
                  <span>View Round Robin Details</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
              </div>
            )}

          {/* Sequential Step Navigation Bar */}
          <div className="bg-white rounded-lg border border-mist p-2 flex items-center justify-between gap-2 overflow-x-auto no-scrollbar shadow-sm">
            {/* Step 1 Pill */}
            <button
              onClick={() => handleSelectSection('cleaning')}
              className={`flex-1 min-w-[180px] flex items-center gap-3 p-3 rounded-md text-left transition-all ${
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
              className={`flex-1 min-w-[180px] flex items-center gap-3 p-3 rounded-md text-left transition-all ${
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
              className={`flex-1 min-w-[180px] flex items-center gap-3 p-3 rounded-md text-left transition-all ${
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

            {/* Step 4 Pill: Company Allocation */}
            <button
              onClick={() => handleSelectSection('companies')}
              className={`flex-1 min-w-[180px] flex items-center gap-3 p-3 rounded-md text-left transition-all ${
                activeSection === 'companies'
                  ? 'bg-ink text-white shadow-sm'
                  : 'hover:bg-paper text-ink'
              }`}
            >
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                  roundRobinStatus?.queue1.myAssignment && roundRobinStatus?.queue2.myAssignment
                    ? 'bg-emerald-600 text-white'
                    : roundRobinStatus?.queue1.isMyTurn || roundRobinStatus?.queue2.isMyTurn
                    ? 'bg-signal text-white animate-pulse'
                    : activeSection === 'companies'
                    ? 'bg-signal text-white'
                    : 'bg-mist text-ink-muted'
                }`}
              >
                {roundRobinStatus?.queue1.myAssignment && roundRobinStatus?.queue2.myAssignment ? (
                  <CheckCircle2 className="w-4 h-4" />
                ) : (
                  <Building2 className="w-3.5 h-3.5" />
                )}
              </div>
              <div>
                <div className="text-xs font-bold leading-tight">Company Allocation</div>
                <div
                  className={`text-[11px] ${
                    activeSection === 'companies' ? 'text-gray-300' : 'text-ink-muted'
                  }`}
                >
                  {hasSelectedTwoCompanies
                    ? '2 Companies Assigned'
                    : roundRobinStatus?.queue1.isMyTurn || roundRobinStatus?.queue2.isMyTurn
                    ? 'Your Turn to Pick!'
                    : 'Round 1 & Live Auction'}
                </div>
              </div>
            </button>

            {/* Step 5 Pill: Final Project Pitch */}
            <button
              disabled={!hasSelectedTwoCompanies && !hasSubmittedFinal}
              onClick={() => handleSelectSection('final')}
              className={`flex-1 min-w-[180px] flex items-center gap-3 p-3 rounded-md text-left transition-all ${
                !hasSelectedTwoCompanies && !hasSubmittedFinal
                  ? 'opacity-50 cursor-not-allowed text-ink-muted'
                  : activeSection === 'final'
                  ? 'bg-ink text-white shadow-sm'
                  : 'hover:bg-paper text-ink'
              }`}
            >
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                  hasSubmittedFinal
                    ? 'bg-emerald-600 text-white'
                    : hasSelectedTwoCompanies
                    ? activeSection === 'final'
                      ? 'bg-signal text-white'
                      : 'bg-mist-dark text-ink'
                    : 'bg-mist text-ink-muted'
                }`}
              >
                {hasSubmittedFinal ? (
                  <CheckCircle2 className="w-4 h-4" />
                ) : !hasSelectedTwoCompanies ? (
                  <Lock className="w-3.5 h-3.5" />
                ) : (
                  '5'
                )}
              </div>
              <div>
                <div className="text-xs font-bold leading-tight">Final Project Pitch</div>
                <div
                  className={`text-[11px] ${
                    activeSection === 'final' ? 'text-gray-300' : 'text-ink-muted'
                  }`}
                >
                  {hasSubmittedFinal
                    ? 'Submitted & Complete'
                    : !hasSelectedTwoCompanies
                    ? 'Requires 2 Companies'
                    : 'Ready for Pitch Submission'}
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
                title="Stage 1: Cleaned Dataset & Architecture Deliverables"
                subtitle="Submit your cleaned dataset link and architecture pipeline link"
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
                      Cleaned Dataset Link *
                    </label>
                    <input
                      type="url"
                      disabled={!canEditCleaning}
                      value={formCleaning.cleanedDatasetUrl}
                      onChange={(e) => handleCleaningChange('cleanedDatasetUrl', e.target.value)}
                      placeholder="https://drive.google.com/... or https://kaggle.com/..."
                      className="input-field text-xs"
                    />
                    <p className="text-[11px] text-ink-muted mt-1">
                      Provide a shareable cloud storage link to your cleaned dataset file.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-ink uppercase mb-1">
                      Architecture / Pipeline Design File Link (.psb / diagram) *
                    </label>
                    <input
                      type="url"
                      disabled={!canEditCleaning}
                      value={formCleaning.psbUrl}
                      onChange={(e) => handleCleaningChange('psbUrl', e.target.value)}
                      placeholder="https://drive.google.com/... or https://dropbox.com/..."
                      className="input-field text-xs"
                    />
                    <p className="text-[11px] text-ink-muted mt-1">
                      Provide a shareable cloud link to your .psb or architecture design deliverable.
                    </p>
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
          {/* SECTION 2: THE 5 FEATURE SETS */}
          {/* ========================================================= */}
          {activeSection === 'requirements' && (
            <div className="space-y-6">
              <Card
                title="Stage 2: Feature Identification (5 Features)"
                subtitle="Identify the corresponding target organization for each of the 5 specialized challenge tracks"
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

                {/* Mentor Evaluation Summary Banner if Graded */}
                {(() => {
                  const mentorEvaluation = requirementsSubmission?.payload?.mentorEvaluation;
                  if (!mentorEvaluation) return null;

                  return (
                    <div className="p-4 bg-paper rounded-lg border border-mist flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-bold text-signal uppercase tracking-wider">
                            Mentor Review Received
                          </span>
                          <Badge variant="signal">Graded</Badge>
                        </div>
                        <p className="text-xs text-ink-muted">
                          Reviewed by {mentorEvaluation.mentorName} on {new Date(mentorEvaluation.gradedAt).toLocaleDateString()}
                        </p>
                      </div>

                      <div className="flex items-center gap-6 text-xs bg-white px-4 py-2.5 rounded-md border border-mist shadow-xs">
                        <div className="text-center">
                          <span className="text-ink-muted block text-[10px] uppercase font-bold">Total Marks</span>
                          <span className="font-mono text-lg font-bold text-signal">
                            {mentorEvaluation.totalFeatureMarks} / 50
                          </span>
                        </div>
                        <div className="text-center border-l border-mist pl-4">
                          <span className="text-ink-muted block text-[10px] uppercase font-bold">Accuracy Rating</span>
                          <span className="font-mono text-lg font-bold text-ink">
                            {mentorEvaluation.overallAccuracyScore}%
                          </span>
                        </div>
                        <div className="text-center border-l border-mist pl-4">
                          <span className="text-ink-muted block text-[10px] uppercase font-bold">Confidence Rating</span>
                          <span className="font-mono text-lg font-bold text-ink">
                            {mentorEvaluation.overallConfidenceScore}%
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                <div className="space-y-4">
                  {formRequirements.requirements.map((reqItem, idx) => {
                    const mentorEvaluation = requirementsSubmission?.payload?.mentorEvaluation;
                    const mentorGrade = mentorEvaluation?.featureGrades?.find(
                      (g: any) => g.featureIndex === idx
                    );

                    return (
                      <div key={idx} className="p-4 bg-paper/60 rounded-lg border border-mist space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="text-[11px] font-bold text-signal uppercase tracking-wider">
                            Feature Track #{idx + 1}
                          </div>
                          {mentorGrade ? (
                            <span className="font-mono text-xs font-bold text-signal">
                              Score: {mentorGrade.marks} / 10 &bull; {mentorGrade.accuracyScore}% Accuracy
                            </span>
                          ) : reqItem.companyName.trim().length >= 2 ? (
                            <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 font-semibold">
                              <CheckCircle2 className="w-3 h-3" /> Ready
                            </span>
                          ) : null}
                        </div>

                        <h4 className="text-sm font-serif font-bold text-ink">{reqItem.title}</h4>

                        <div>
                          <label className="block text-[11px] font-semibold text-ink uppercase mb-1">
                            Identified Company Name *
                          </label>
                          <input
                            type="text"
                            disabled={!canEditRequirements}
                            value={reqItem.companyName}
                            onChange={(e) => handleReqItemChange(idx, 'companyName', e.target.value)}
                            placeholder="Enter the company name identified for this feature..."
                            className="input-field text-xs font-medium"
                          />
                          <p className="text-[11px] text-ink-muted mt-1">
                            Provide the target organization or partner company identified for this feature set.
                          </p>
                        </div>

                        {/* Individual Mentor Grading for this Feature Set */}
                        {mentorGrade && (
                          <div className="p-3 bg-white rounded border border-mist space-y-1 text-xs mt-2">
                            <div className="flex items-center gap-4 text-ink font-semibold">
                              <span>Feature Marks: <strong className="text-signal font-mono">{mentorGrade.marks} / 10</strong></span>
                              <span>Accuracy: <strong className="font-mono">{mentorGrade.accuracyScore}%</strong></span>
                              <span>Confidence: <strong className="font-mono">{mentorGrade.confidenceScore}%</strong></span>
                            </div>
                            {mentorGrade.feedback && (
                              <p className="text-ink-muted text-[11px] italic pt-1 border-t border-mist/50 mt-1">
                                Note: "{mentorGrade.feedback}"
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}

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
                        Submit All 5 Features
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
              subtitle="Live rankings across all participating teams"
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

          {/* ========================================================= */}
          {/* SECTION 4: PARTNER ORGANIZATION ALLOCATION & LIVE AUCTION */}
          {/* ========================================================= */}
          {activeSection === 'companies' && (
            <div className="space-y-6">
              {/* Assigned Companies Summary Banner */}
              <div className="p-5 bg-paper rounded-xl border border-mist shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-mist pb-3 mb-4">
                  <div>
                    <h3 className="text-base font-bold text-ink">Your Assigned Organizations</h3>
                    <p className="text-xs text-ink-muted mt-0.5">
                      Each team acquires 2 partner organizations (Round 1 Selection + Live Auction floor) to build their final project.
                    </p>
                  </div>
                  <div>
                    {hasSelectedTwoCompanies ? (
                      <div className="flex items-center gap-2">
                        <Badge variant="signal">2 of 2 Organizations Assigned</Badge>
                        <Button
                          variant="primary"
                          size="sm"
                          icon={<Send className="w-3.5 h-3.5" />}
                          onClick={() => handleSelectSection('final')}
                        >
                          Proceed to Final Pitch
                        </Button>
                      </div>
                    ) : (
                      <Badge variant="saffron">
                        {assignedCompanies.length} of 2 Assigned
                      </Badge>
                    )}
                  </div>
                </div>

                {assignedCompanies.length === 0 ? (
                  <p className="text-xs text-ink-muted italic py-1">
                    No organizations assigned yet. Select your first organization in Round 1 below, and bid for your second organization on the live auction floor.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {assignedCompanies.map((c, i) => (
                      <div key={i} className="p-3.5 bg-white rounded-lg border border-mist flex items-start gap-3 shadow-xs">
                        <div className="w-8 h-8 rounded-full bg-signal/15 text-signal font-bold flex items-center justify-center text-xs flex-shrink-0">
                          {i + 1}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-bold text-ink">{c.name}</h4>
                            <span className="text-[10px] text-ink-muted bg-mist px-1.5 py-0.5 rounded font-medium">
                              {c.source}
                            </span>
                          </div>
                          <p className="text-xs text-ink-muted mt-0.5">{c.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <Card
                title="Company Allocation Floor"
                subtitle="Acquire two organizations: Pick from Bucket 1 in Round 1 (round robin), and bid in the Live Auction using quiz balance tokens"
              >
                {/* Mode Selector Tabs: Round 1 Selection and Live Auction Showcase */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-2 bg-paper/60 rounded-lg border border-mist mb-6">
                  <div className="flex items-center gap-2 overflow-x-auto">
                    <button
                      onClick={() => {
                        setCompanySubTab('queue1');
                        setActiveQueueTab(1);
                      }}
                      className={`px-4 py-2 rounded-md text-xs font-bold transition-all flex items-center gap-2 ${
                        companySubTab === 'queue1'
                          ? 'bg-ink text-white shadow-sm'
                          : 'bg-white text-ink hover:bg-mist'
                      }`}
                    >
                      <Building2 className="w-3.5 h-3.5" />
                      <span>Round 1 Selection</span>
                      {roundRobinStatus?.queue1.myAssignment ? (
                        <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-600 text-white font-normal">
                          Assigned
                        </span>
                      ) : roundRobinStatus?.queue1.isMyTurn ? (
                        <span className="px-1.5 py-0.5 rounded text-[10px] bg-signal text-white font-bold animate-pulse">
                          YOUR TURN
                        </span>
                      ) : null}
                    </button>

                    <button
                      onClick={() => setCompanySubTab('auction')}
                      className={`px-4 py-2 rounded-md text-xs font-bold transition-all flex items-center gap-2 ${
                        companySubTab === 'auction'
                          ? 'bg-ink text-white shadow-sm'
                          : 'bg-white text-ink hover:bg-mist'
                      }`}
                    >
                      <Gavel className="w-3.5 h-3.5 text-signal" />
                      <span>Live Auction Showcase</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      icon={<RotateCw className="w-3.5 h-3.5" />}
                      onClick={() => {
                        loadRoundRobinStatus(false);
                        loadTeamData(true);
                      }}
                    >
                      Sync Allocation
                    </Button>
                  </div>
                </div>

                {/* SubTab Content: Live Auction */}
                {companySubTab === 'auction' ? (
                  <div className="space-y-4">
                    <LiveAuctionViewer />
                  </div>
                ) : (
                  /* SubTab Content: Round Robin (Round 1 Selection) */
                  (() => {
                  const currentQueue = roundRobinStatus?.queue1;
                  if (!currentQueue) {
                    return (
                      <div className="p-8 text-center text-xs text-ink-muted">
                        Loading round robin queue details...
                      </div>
                    );
                  }

                  const mins = Math.floor(currentQueue.remainingSeconds / 60);
                  const secs = currentQueue.remainingSeconds % 60;
                  const timeString = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

                  return (
                    <div className="space-y-6">
                      {/* Queue Status / Active Turn Hero Banner */}
                      {currentQueue.myAssignment ? (
                        <div className="p-5 bg-emerald-50 rounded-lg border border-emerald-200 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-1.5">
                              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                              Company Locked & Assigned for Round 1
                            </span>
                            <Badge variant="success">Assigned</Badge>
                          </div>
                          <h3 className="text-base font-serif font-bold text-ink">
                            {currentQueue.myAssignment.companyName}
                          </h3>
                          <p className="text-xs text-ink leading-relaxed">
                            {currentQueue.myAssignment.companyDescription}
                          </p>
                          <div className="text-[11px] text-ink-muted pt-1">
                            Selected on: {new Date(currentQueue.myAssignment.selectedAt).toLocaleString()}
                          </div>
                        </div>
                      ) : currentQueue.isMyTurn ? (
                        <div className="p-6 bg-signal/10 rounded-lg border-2 border-signal shadow-sm space-y-4">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div>
                              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-signal uppercase tracking-wider">
                                <span className="w-2.5 h-2.5 rounded-full bg-signal animate-ping" />
                                Action Required: Your Turn to Choose!
                              </span>
                              <h3 className="text-lg font-serif font-bold text-ink mt-1">
                                It is your team's turn to select a company
                              </h3>
                              <p className="text-xs text-ink-muted mt-0.5">
                                Select 1 company from the options below. Your turn expires in 2 minutes.
                              </p>
                            </div>

                            {/* Large Monospace Countdown Timer */}
                            <div className="flex items-center gap-3 bg-white px-5 py-3 rounded-lg border border-signal/40 shadow-xs">
                              <Clock className="w-6 h-6 text-signal" />
                              <div>
                                <div className="text-[10px] font-bold uppercase tracking-wider text-signal">
                                  Burst Window
                                </div>
                                <div className="font-mono text-2xl font-bold text-ink">
                                  {timeString}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : currentQueue.status === 'active' ? (
                        <div className="p-5 bg-paper rounded-lg border border-mist flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div>
                            <span className="text-[11px] font-bold text-signal uppercase tracking-wider">
                              Round 1 Selection in Progress
                            </span>
                            <h4 className="text-sm font-serif font-bold text-ink mt-0.5">
                              Currently Selecting: Team "{currentQueue.currentTurnTeamName || 'In Progress'}"
                            </h4>
                            <p className="text-xs text-ink-muted mt-0.5">
                              {currentQueue.myTeamOrder
                                ? `Your team's position in this selection: Turn #${currentQueue.myTeamOrder}`
                                : 'Selection turns progress in preference order.'}
                            </p>
                          </div>
                          <div className="flex items-center gap-3 bg-white px-4 py-2 rounded border border-mist text-xs">
                            <Clock className="w-4 h-4 text-ink-muted" />
                            <div>
                              <span className="text-[10px] text-ink-muted uppercase block">Turn Timer</span>
                              <span className="font-mono font-bold text-ink">{timeString}</span>
                            </div>
                          </div>
                        </div>
                      ) : currentQueue.status === 'paused' ? (
                        <div className="p-4 bg-amber-50 rounded-lg border border-amber-200 text-xs text-amber-900">
                          <strong>Selection Paused:</strong> Administrators have paused turn progression. Selection will resume shortly.
                        </div>
                      ) : currentQueue.status === 'disabled' ? (
                        <div className="p-4 bg-paper rounded-lg border border-mist text-xs text-ink-muted">
                          <strong>Selection Disabled:</strong> Round 1 company selection is currently disabled by administrators. Turns and selections are not active.
                        </div>
                      ) : (
                        <div className="p-4 bg-paper rounded-lg border border-mist text-xs text-ink-muted">
                          <strong>Selection Ready:</strong> Company selection is ready. Selection turns will progress with 2 minutes per team once launched by administrators.
                        </div>
                      )}

                      {/* Available Companies Grid */}
                      <div className="space-y-4 pt-2">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="text-xs font-bold uppercase tracking-wider text-ink">
                              Available Companies ({currentQueue.availableCompanies.length} Options)
                            </h4>
                            <p className="text-[11px] text-ink-muted">
                              {currentQueue.isMyTurn
                                ? 'Click "Select Company" on your preferred track to lock in your assignment.'
                                : 'Review the company tracks below while waiting for your turn.'}
                            </p>
                          </div>
                        </div>

                        {currentQueue.availableCompanies.length === 0 ? (
                          <div className="p-8 text-center text-xs text-ink-muted bg-paper rounded border border-mist">
                            All companies in this queue have been assigned.
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {currentQueue.availableCompanies.map((comp) => (
                              <div
                                key={comp.id}
                                className={`p-4 rounded-lg border flex flex-col justify-between gap-4 transition-all ${
                                  currentQueue.isMyTurn
                                    ? 'bg-white border-mist shadow-xs hover:border-signal hover:shadow-sm'
                                    : 'bg-white/80 border-mist opacity-90'
                                }`}
                              >
                                <div>
                                  <div className="flex items-start justify-between gap-2 mb-1.5">
                                    <h5 className="font-serif font-bold text-sm text-ink">{comp.name}</h5>
                                    <Badge variant="success">Available</Badge>
                                  </div>
                                  <p className="text-xs text-ink-muted leading-relaxed">
                                    {comp.description}
                                  </p>
                                </div>

                                <div className="pt-2 border-t border-mist flex justify-end">
                                  {currentQueue.isMyTurn ? (
                                    <Button
                                      variant="primary"
                                      size="sm"
                                      icon={<CheckCircle2 className="w-3.5 h-3.5" />}
                                      onClick={() =>
                                        setSelectedCompanyToConfirm({
                                          queueNumber: activeQueueTab,
                                          company: comp,
                                        })
                                      }
                                    >
                                      Select Company
                                    </Button>
                                  ) : currentQueue.myAssignment ? (
                                    <span className="text-[11px] text-ink-muted italic">Already selected</span>
                                  ) : (
                                    <span className="text-[11px] text-ink-muted">Waiting for turn</span>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })())}
              </Card>
            </div>
          )}

          {/* ========================================================= */}
          {/* SECTION 5: FINAL SOLUTION & PROJECT PITCH */}
          {/* ========================================================= */}
          {activeSection === 'final' && (
            <div className="space-y-6">
              <Card
                title="Stage 5: Final Solution & Project Pitch"
                subtitle="Submit your synthesized product pitch, demonstration prototype, and optional source code repository"
              >
                {hasSubmittedFinal && (
                  <div className="p-3 bg-mist-light rounded border border-mist mb-6 flex items-center justify-between text-xs">
                    <span className="text-ink">
                      Submitted on{' '}
                      <strong>
                        {finalSubmission?.submittedAt
                          ? new Date(finalSubmission.submittedAt).toLocaleString()
                          : 'Recorded'}
                      </strong>{' '}
                      &bull; <span className="text-emerald-700 font-semibold">Project pitch is immutable & submitted for final review</span>
                    </span>
                    <Badge variant="signal">Submitted & Locked</Badge>
                  </div>
                )}

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-ink uppercase mb-1">
                      Product Name *
                    </label>
                    <input
                      type="text"
                      disabled={hasSubmittedFinal || !isLeader}
                      value={formFinal.productName}
                      onChange={(e) => setFormFinal({ ...formFinal, productName: e.target.value })}
                      placeholder="e.g. Synapse Orbital Vision Suite"
                      className="input-field text-xs font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-ink uppercase mb-1">
                      Product Description & Executive Summary *
                    </label>
                    <textarea
                      rows={5}
                      disabled={hasSubmittedFinal || !isLeader}
                      value={formFinal.productDescription}
                      onChange={(e) => setFormFinal({ ...formFinal, productDescription: e.target.value })}
                      placeholder="Describe your solution architecture, how both assigned companies are integrated, key features, and impact..."
                      className="input-field text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-ink uppercase mb-1">
                      Prototype / Pitch Demonstration Link *
                    </label>
                    <input
                      type="url"
                      disabled={hasSubmittedFinal || !isLeader}
                      value={formFinal.prototypeUrl}
                      onChange={(e) => setFormFinal({ ...formFinal, prototypeUrl: e.target.value })}
                      placeholder="https://figma.com/... or https://youtube.com/watch?... or https://demo.app"
                      className="input-field text-xs"
                    />
                    <p className="text-[11px] text-ink-muted mt-1">
                      Provide a publicly accessible demonstration, video pitch, or live prototype link.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-ink uppercase mb-1">
                      Source Code Repository Link (Optional)
                    </label>
                    <input
                      type="url"
                      disabled={hasSubmittedFinal || !isLeader}
                      value={formFinal.githubUrl}
                      onChange={(e) => setFormFinal({ ...formFinal, githubUrl: e.target.value })}
                      placeholder="https://github.com/your-org/synapse-project"
                      className="input-field text-xs"
                    />
                  </div>

                  {!hasSubmittedFinal && isLeader && (
                    <div className="pt-4 border-t border-mist flex items-center justify-end gap-3">
                      <Button
                        variant="secondary"
                        loading={saving}
                        icon={<Save className="w-4 h-4" />}
                        onClick={handleSaveFinalDraft}
                      >
                        Save Draft
                      </Button>
                      <Button
                        variant="primary"
                        loading={submitting}
                        icon={<Send className="w-4 h-4" />}
                        onClick={() => {
                          setFinalSubmitError(null);
                          setConfirmFinalModal(true);
                        }}
                      >
                        Submit Final Project
                      </Button>
                    </div>
                  )}

                  {!isLeader && !hasSubmittedFinal && (
                    <p className="text-xs text-ink-muted italic text-right">
                      Only the team leader can save drafts and submit the final project pitch.
                    </p>
                  )}
                </div>
              </Card>
            </div>
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

      {/* Modal: Confirm Company Selection */}
      <Modal
        isOpen={!!selectedCompanyToConfirm}
        onClose={() => {
          setCompanySelectError(null);
          setSelectedCompanyToConfirm(null);
        }}
        title={`Confirm Selection: ${selectedCompanyToConfirm?.company.name || ''}`}
      >
        <div className="space-y-4 text-xs text-ink leading-relaxed">
          {companySelectError && (
            <Alert type="error" title="Selection Error">
              {companySelectError}
            </Alert>
          )}

          <p>
            You are selecting <strong>{selectedCompanyToConfirm?.company.name}</strong> as your team's assigned partner organization for{' '}
            <strong>Queue {selectedCompanyToConfirm?.queueNumber}</strong>.
          </p>

          {selectedCompanyToConfirm?.company.description && (
            <div className="p-3 bg-paper rounded border border-mist text-ink-muted">
              {selectedCompanyToConfirm.company.description}
            </div>
          )}

          <div className="p-3 bg-amber-50 text-amber-900 rounded border border-amber-200 text-[11px] space-y-1">
            <p className="font-bold">Important Notice:</p>
            <p>
              Once confirmed, this company is permanently assigned to {team.teamName}. The selection turn will immediately advance to the next team in the queue.
            </p>
          </div>

          <div className="pt-3 flex items-center justify-end gap-2 border-t border-mist">
            <Button
              variant="secondary"
              onClick={() => {
                setCompanySelectError(null);
                setSelectedCompanyToConfirm(null);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              loading={companySelecting}
              icon={<CheckCircle2 className="w-4 h-4" />}
              onClick={() => {
                if (selectedCompanyToConfirm) {
                  handleSelectCompany(
                    selectedCompanyToConfirm.queueNumber,
                    selectedCompanyToConfirm.company.id
                  );
                }
              }}
            >
              Confirm & Lock Selection
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal: Confirm Final Project Submission */}
      <Modal
        isOpen={confirmFinalModal}
        onClose={() => {
          setFinalSubmitError(null);
          setConfirmFinalModal(false);
        }}
        title="Confirm Final Project Submission"
        description="Are you sure you want to finalize your submission? Once submitted, your solution pitch and links will be permanently locked for final mentor and evaluator grading."
      >
        <div className="space-y-4 text-xs text-ink leading-relaxed">
          {finalSubmitError && (
            <Alert type="error" title="Submission Issue">
              {finalSubmitError}
            </Alert>
          )}

          <p>
            You are submitting the final project pitch on behalf of <strong>{team.teamName}</strong>.
          </p>

          <div className="p-3 bg-paper rounded border border-mist space-y-1.5">
            <div>
              <span className="font-semibold text-ink-muted text-[11px] block uppercase">Product Name</span>
              <span className="font-bold text-ink text-sm">{formFinal.productName || 'Not specified'}</span>
            </div>
            <div>
              <span className="font-semibold text-ink-muted text-[11px] block uppercase">Prototype / Demo Link</span>
              <span className="font-mono text-signal text-xs break-all">{formFinal.prototypeUrl || 'Not specified'}</span>
            </div>
          </div>

          <div className="p-3 bg-amber-50 text-amber-900 rounded border border-amber-200 text-[11px] space-y-1">
            <p className="font-bold">Important Notice:</p>
            <p>
              This is the final deliverable of Synapse 2026. Submitting locks your record permanently and marks completion for your team.
            </p>
          </div>

          <div className="pt-3 flex items-center justify-end gap-2 border-t border-mist">
            <Button
              variant="secondary"
              onClick={() => {
                setFinalSubmitError(null);
                setConfirmFinalModal(false);
              }}
            >
              Back to Editing
            </Button>
            <Button
              variant="primary"
              loading={submitting}
              icon={<Send className="w-4 h-4" />}
              onClick={handleFinalSubmit}
            >
              Confirm & Submit Final Pitch
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
