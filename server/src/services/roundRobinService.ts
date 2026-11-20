import { Types } from 'mongoose';
import {
  RoundRobinQueue,
  IRoundRobinQueue,
  ICompanyPoolItem,
  IQueueTeamItem,
  RoundRobinQueueStatus,
} from '../models/RoundRobinQueue.js';
import { Team } from '../models/Team.js';
import { LeaderboardService } from './leaderboardService.js';
import { logAudit } from './auditService.js';

export const DEFAULT_QUEUE_1_COMPANIES: Array<{ name: string; description: string }> = [
  {
    name: 'NeuralStream Analytics',
    description: 'Real-time telemetry stream processing and distributed sensor anomaly detection.',
  },
  {
    name: 'BioGenix Intelligence',
    description: 'Deep learning sequence models for computational genomics and structural biology.',
  },
  {
    name: 'AeroDynamics AI',
    description: 'Autonomous aerial path planning, obstacle avoidance, and mission flight control.',
  },
  {
    name: 'TerraClimate Systems',
    description: 'High-resolution multi-spectral earth observation and extreme weather forecasting.',
  },
  {
    name: 'CyberSentinel Labs',
    description: 'Adversarial behavioral profiling and automated infrastructure incident mitigation.',
  },
  {
    name: 'QuantumPulse Robotics',
    description: 'Ultra-low latency edge reinforcement learning for precision industrial manipulation.',
  },
  {
    name: 'VoxelVision Medical',
    description: 'Volumetric CT/MRI 3D image reconstruction and oncological segmentation models.',
  },
  {
    name: 'NexaRobotics Core',
    description: 'Distributed swarm coordination and decentralized perception for warehouse automation.',
  },
];

export const DEFAULT_QUEUE_2_COMPANIES: Array<{ name: string; description: string }> = [
  {
    name: 'FinTech HyperScale',
    description: 'High-frequency transaction fraud detection and real-time banking risk evaluation.',
  },
  {
    name: 'GridVolt Energy',
    description: 'Smart renewable energy dispatch balancing and commercial battery storage control.',
  },
  {
    name: 'OmniLogistics Core',
    description: 'Dynamic multimodal fleet routing and global supply chain transit optimization.',
  },
  {
    name: 'NeuroVision Healthcare',
    description: 'Clinical decision support systems and diagnostic computer vision for pathology.',
  },
  {
    name: 'Apex Autonomous',
    description: 'Connected vehicular telemetry, LiDAR perception, and edge-embedded driver assist.',
  },
  {
    name: 'DeepOcean Explorations',
    description: 'Subsea robotic navigation, bathymetric mapping, and oceanic environmental sensing.',
  },
  {
    name: 'AstroSynthetics Lab',
    description: 'Orbital satellite communication scheduling and space debris orbital tracking.',
  },
  {
    name: 'HelioPower Dynamics',
    description: 'Solar grid irradiance forecasting and dynamic photovoltaic degradation modeling.',
  },
];

export class RoundRobinService {
  /**
   * Retrieves or creates a queue by queue number (1 or 2).
   * Checks turn timer expiration if active.
   */
  static async getQueue(queueNumber: 1 | 2): Promise<IRoundRobinQueue> {
    let queue = await RoundRobinQueue.findOne({ queueNumber });
    if (!queue) {
      const defaultCompanies = queueNumber === 1 ? DEFAULT_QUEUE_1_COMPANIES : DEFAULT_QUEUE_2_COMPANIES;
      const initialCompanies: ICompanyPoolItem[] = defaultCompanies.map((c, idx) => ({
        id: `q${queueNumber}-c${idx + 1}`,
        name: c.name,
        description: c.description,
        isAssigned: false,
        assignedToTeamId: null,
        assignedToTeamName: null,
        assignedAt: null,
      }));

      queue = await RoundRobinQueue.create({
        queueNumber,
        title: queueNumber === 1 ? 'Round 1: Primary Company Selection' : 'Round 2: Secondary Company Selection',
        status: 'disabled', // Disabled by default until admin enables or starts
        burstTimeSeconds: 120, // 2 minutes
        currentTurnIndex: 0,
        currentTurnStartedAt: null,
        currentTurnExpiresAt: null,
        pausedRemainingSeconds: null,
        teams: [],
        companies: initialCompanies,
      });
    }

    // Auto-advance if burst time expired while active
    await this.advanceIfExpired(queue);
    return queue;
  }

  /**
   * Checks if active turn has exceeded burst time (2 minutes) and advances.
   */
  static async advanceIfExpired(queue: IRoundRobinQueue): Promise<boolean> {
    if (queue.status !== 'active' || !queue.currentTurnExpiresAt) {
      return false;
    }

    const now = new Date();
    if (now > queue.currentTurnExpiresAt) {
      // Time expired for current team
      const currentTeam = queue.teams[queue.currentTurnIndex];
      if (currentTeam && !currentTeam.hasSelected) {
        currentTeam.isSkipped = true;
      }

      // Find next team with !hasSelected && !isSkipped
      const nextIdx = this.findNextEligibleTeamIndex(queue.teams, queue.currentTurnIndex + 1);
      if (nextIdx !== -1) {
        queue.currentTurnIndex = nextIdx;
        queue.currentTurnStartedAt = new Date();
        queue.currentTurnExpiresAt = new Date(Date.now() + queue.burstTimeSeconds * 1000);
      } else {
        queue.status = 'completed';
        queue.currentTurnStartedAt = null;
        queue.currentTurnExpiresAt = null;
      }

      await queue.save();
      return true;
    }

    return false;
  }

  /**
   * Helper to find next eligible team index.
   */
  private static findNextEligibleTeamIndex(teams: IQueueTeamItem[], startIndex: number): number {
    for (let i = startIndex; i < teams.length; i++) {
      if (!teams[i].hasSelected && !teams[i].isSkipped) {
        return i;
      }
    }
    return -1;
  }

  /**
   * Manually initializes queue order based on live leaderboard rankings.
   */
  static async initializeQueue(queueNumber: 1 | 2, adminEmail: string): Promise<IRoundRobinQueue> {
    const queue = await this.getQueue(queueNumber);

    // Fetch live leaderboard for ranking order
    const { entries } = await LeaderboardService.calculateLiveLeaderboard();

    // Map eligible teams ordered by rank/preference
    const queueTeams: IQueueTeamItem[] = entries.map((e) => ({
      teamId: new Types.ObjectId(e.teamId),
      teamName: e.teamName,
      rank: e.rank,
      score: e.score,
      hasSelected: false,
      selectedCompanyId: null,
      selectedCompanyName: null,
      selectedCompanyDescription: null,
      selectedAt: null,
      isSkipped: false,
    }));

    // Reset company assignments
    queue.companies.forEach((c) => {
      c.isAssigned = false;
      c.assignedToTeamId = null;
      c.assignedToTeamName = null;
      c.assignedAt = null;
    });

    queue.teams = queueTeams;
    queue.currentTurnIndex = 0;
    queue.status = 'idle';
    queue.currentTurnStartedAt = null;
    queue.currentTurnExpiresAt = null;
    queue.pausedRemainingSeconds = null;

    await queue.save();

    await logAudit(adminEmail, 'ROUND_ROBIN_INITIALIZED', 'RoundRobinQueue', queue._id.toString(), {
      queueNumber,
      totalTeams: queueTeams.length,
    });

    return queue;
  }

  /**
   * Explicitly enables a disabled queue.
   */
  static async enableQueue(queueNumber: 1 | 2, adminEmail: string): Promise<IRoundRobinQueue> {
    const queue = await this.getQueue(queueNumber);
    if (queue.status === 'disabled') {
      queue.status = 'idle';
      if (!queue.teams || queue.teams.length === 0) {
        await this.initializeQueue(queueNumber, adminEmail);
        return this.getQueue(queueNumber);
      }
      await queue.save();
      await logAudit(adminEmail, 'ROUND_ROBIN_ENABLED', 'RoundRobinQueue', queue._id.toString(), { queueNumber });
    }
    return queue;
  }

  /**
   * Disables a queue.
   */
  static async disableQueue(queueNumber: 1 | 2, adminEmail: string): Promise<IRoundRobinQueue> {
    const queue = await this.getQueue(queueNumber);
    queue.status = 'disabled';
    queue.currentTurnExpiresAt = null;
    await queue.save();
    await logAudit(adminEmail, 'ROUND_ROBIN_DISABLED', 'RoundRobinQueue', queue._id.toString(), { queueNumber });
    return queue;
  }

  /**
   * Starts or restarts round robin turn progression.
   */
  static async startQueue(queueNumber: 1 | 2, adminEmail: string): Promise<IRoundRobinQueue> {
    const queue = await this.getQueue(queueNumber);

    if (!queue.teams || queue.teams.length === 0) {
      // Auto-initialize from leaderboard if not initialized yet
      await this.initializeQueue(queueNumber, adminEmail);
      return this.startQueue(queueNumber, adminEmail);
    }

    const availableCompanies = queue.companies.filter((c) => !c.isAssigned);
    if (availableCompanies.length === 0) {
      throw new Error('Cannot start queue: All configured companies are already assigned.');
    }

    // Find next eligible team starting from 0 or current
    let targetIdx = this.findNextEligibleTeamIndex(queue.teams, 0);
    if (targetIdx === -1) {
      throw new Error('All teams have already selected companies or completed their turns.');
    }

    queue.currentTurnIndex = targetIdx;
    queue.status = 'active';
    queue.currentTurnStartedAt = new Date();
    queue.currentTurnExpiresAt = new Date(Date.now() + queue.burstTimeSeconds * 1000);
    queue.pausedRemainingSeconds = null;

    await queue.save();

    await logAudit(adminEmail, 'ROUND_ROBIN_STARTED', 'RoundRobinQueue', queue._id.toString(), {
      queueNumber,
      firstTurnTeam: queue.teams[targetIdx].teamName,
      burstSeconds: queue.burstTimeSeconds,
    });

    return queue;
  }

  /**
   * Pauses the queue in between turns and saves remaining burst seconds.
   */
  static async pauseQueue(queueNumber: 1 | 2, adminEmail: string): Promise<IRoundRobinQueue> {
    const queue = await this.getQueue(queueNumber);

    if (queue.status !== 'active') {
      return queue;
    }

    let remainingSeconds = queue.burstTimeSeconds;
    if (queue.currentTurnExpiresAt) {
      remainingSeconds = Math.max(0, Math.floor((queue.currentTurnExpiresAt.getTime() - Date.now()) / 1000));
    }

    queue.status = 'paused';
    queue.pausedRemainingSeconds = remainingSeconds;
    queue.currentTurnExpiresAt = null;

    await queue.save();

    await logAudit(adminEmail, 'ROUND_ROBIN_PAUSED', 'RoundRobinQueue', queue._id.toString(), {
      queueNumber,
      currentTurnIndex: queue.currentTurnIndex,
      pausedRemainingSeconds: remainingSeconds,
    });

    return queue;
  }

  /**
   * Resumes a paused queue with saved remaining seconds.
   */
  static async resumeQueue(queueNumber: 1 | 2, adminEmail: string): Promise<IRoundRobinQueue> {
    const queue = await this.getQueue(queueNumber);

    if (queue.status !== 'paused') {
      return queue;
    }

    const remainingSeconds = queue.pausedRemainingSeconds && queue.pausedRemainingSeconds > 0
      ? queue.pausedRemainingSeconds
      : queue.burstTimeSeconds;

    queue.status = 'active';
    queue.currentTurnStartedAt = new Date();
    queue.currentTurnExpiresAt = new Date(Date.now() + remainingSeconds * 1000);
    queue.pausedRemainingSeconds = null;

    await queue.save();

    await logAudit(adminEmail, 'ROUND_ROBIN_RESUMED', 'RoundRobinQueue', queue._id.toString(), {
      queueNumber,
      currentTurnIndex: queue.currentTurnIndex,
      remainingSeconds,
    });

    return queue;
  }

  /**
   * Admin skips or advances turn manually to the next team.
   */
  static async nextTurn(
    queueNumber: 1 | 2,
    adminEmail: string,
    skipCurrent = true
  ): Promise<IRoundRobinQueue> {
    const queue = await this.getQueue(queueNumber);

    if (skipCurrent && queue.teams[queue.currentTurnIndex]) {
      queue.teams[queue.currentTurnIndex].isSkipped = true;
    }

    const nextIdx = this.findNextEligibleTeamIndex(queue.teams, queue.currentTurnIndex + 1);
    if (nextIdx !== -1) {
      queue.currentTurnIndex = nextIdx;
      if (queue.status === 'active') {
        queue.currentTurnStartedAt = new Date();
        queue.currentTurnExpiresAt = new Date(Date.now() + queue.burstTimeSeconds * 1000);
      }
    } else {
      queue.status = 'completed';
      queue.currentTurnStartedAt = null;
      queue.currentTurnExpiresAt = null;
    }

    await queue.save();

    await logAudit(adminEmail, 'ROUND_ROBIN_TURN_SKIPPED', 'RoundRobinQueue', queue._id.toString(), {
      queueNumber,
      newTurnIndex: queue.currentTurnIndex,
    });

    return queue;
  }

  /**
   * Admin updates the list of companies (name and description) for a specific queue.
   */
  static async configureCompanies(
    queueNumber: 1 | 2,
    companiesInput: Array<{ id?: string; name: string; description: string }>,
    adminEmail: string
  ): Promise<IRoundRobinQueue> {
    const queue = await this.getQueue(queueNumber);

    // Build map of existing assignments to preserve assigned state if company ID persists
    const existingMap = new Map(queue.companies.map((c) => [c.id, c]));

    const updatedCompanies: ICompanyPoolItem[] = companiesInput.map((input, idx) => {
      const compId = input.id || `q${queueNumber}-c${Date.now()}-${idx + 1}`;
      const existing = existingMap.get(compId);

      return {
        id: compId,
        name: input.name.trim(),
        description: input.description.trim(),
        isAssigned: existing?.isAssigned || false,
        assignedToTeamId: existing?.assignedToTeamId || null,
        assignedToTeamName: existing?.assignedToTeamName || null,
        assignedAt: existing?.assignedAt || null,
      };
    });

    queue.companies = updatedCompanies;
    await queue.save();

    await logAudit(adminEmail, 'ROUND_ROBIN_COMPANIES_CONFIGURED', 'RoundRobinQueue', queue._id.toString(), {
      queueNumber,
      companiesCount: updatedCompanies.length,
    });

    return queue;
  }

  /**
   * Team selects a company during their active 2-minute burst turn.
   */
  static async selectCompany(
    queueNumber: 1 | 2,
    teamId: string,
    companyId: string,
    userEmail: string
  ): Promise<{
    queue: IRoundRobinQueue;
    assignedCompany: ICompanyPoolItem;
  }> {
    const queue = await this.getQueue(queueNumber);

    // 1. Validate queue status
    if (queue.status !== 'active') {
      throw new Error(`Queue ${queueNumber} is currently not active (current status: ${queue.status}).`);
    }

    // 2. Validate active team's turn
    const activeTeam = queue.teams[queue.currentTurnIndex];
    if (!activeTeam) {
      throw new Error('No active team turn found in this queue.');
    }

    if (activeTeam.teamId.toString() !== teamId) {
      throw new Error(
        `It is not your team's turn to select. Currently selecting: Team "${activeTeam.teamName}" (Turn #${queue.currentTurnIndex + 1}).`
      );
    }

    if (activeTeam.hasSelected) {
      throw new Error('Your team has already selected a company in this queue.');
    }

    // 3. Check burst timer expiration
    if (queue.currentTurnExpiresAt && new Date() > queue.currentTurnExpiresAt) {
      activeTeam.isSkipped = true;
      await this.advanceIfExpired(queue);
      throw new Error('Your 2-minute burst window has expired. Selection has advanced to the next team.');
    }

    // 4. Find and validate selected company
    const company = queue.companies.find((c) => c.id === companyId);
    if (!company) {
      throw new Error('Selected company not found in this queue.');
    }

    if (company.isAssigned) {
      throw new Error(`Company "${company.name}" has already been selected by another team.`);
    }

    // Atomic guard: Verify company is still available and team has not already selected
    const isStillAvailable = await RoundRobinQueue.exists({
      _id: queue._id,
      companies: { $elemMatch: { id: companyId, isAssigned: false } },
    });
    if (!isStillAvailable) {
      throw new Error(`Company "${company.name}" has already been selected by another team.`);
    }

    const teamAlreadySelected = await RoundRobinQueue.exists({
      _id: queue._id,
      teams: { $elemMatch: { teamId: new Types.ObjectId(teamId), hasSelected: true } },
    });
    if (teamAlreadySelected) {
      throw new Error('Your team has already selected a company in this queue.');
    }

    // 5. Assign company to team
    const now = new Date();
    company.isAssigned = true;
    company.assignedToTeamId = new Types.ObjectId(teamId);
    company.assignedToTeamName = activeTeam.teamName;
    company.assignedAt = now;

    activeTeam.hasSelected = true;
    activeTeam.selectedCompanyId = company.id;
    activeTeam.selectedCompanyName = company.name;
    activeTeam.selectedCompanyDescription = company.description;
    activeTeam.selectedAt = now;

    // 6. Advance turn to next team
    const nextIdx = this.findNextEligibleTeamIndex(queue.teams, queue.currentTurnIndex + 1);
    if (nextIdx !== -1) {
      queue.currentTurnIndex = nextIdx;
      queue.currentTurnStartedAt = new Date();
      queue.currentTurnExpiresAt = new Date(Date.now() + queue.burstTimeSeconds * 1000);
    } else {
      queue.status = 'completed';
      queue.currentTurnStartedAt = null;
      queue.currentTurnExpiresAt = null;
    }

    await queue.save();

    await logAudit(userEmail, 'COMPANY_SELECTED', 'RoundRobinQueue', queue._id.toString(), {
      queueNumber,
      teamId,
      teamName: activeTeam.teamName,
      companyId: company.id,
      companyName: company.name,
    });

    return {
      queue,
      assignedCompany: company,
    };
  }

  /**
   * Retrieves team assignments across both Queue 1 and Queue 2.
   */
  static async getTeamAssignments(teamId: string) {
    const q1 = await this.getQueue(1);
    const q2 = await this.getQueue(2);

    const q1Team = q1.teams.find((t) => t.teamId.toString() === teamId);
    const q2Team = q2.teams.find((t) => t.teamId.toString() === teamId);

    const isQ1MyTurn =
      q1.status === 'active' &&
      q1.teams[q1.currentTurnIndex]?.teamId.toString() === teamId &&
      !q1Team?.hasSelected;

    const isQ2MyTurn =
      q2.status === 'active' &&
      q2.teams[q2.currentTurnIndex]?.teamId.toString() === teamId &&
      !q2Team?.hasSelected;

    const calcRemaining = (q: IRoundRobinQueue) => {
      if (q.status === 'paused') return q.pausedRemainingSeconds || 0;
      if (q.status === 'active' && q.currentTurnExpiresAt) {
        return Math.max(0, Math.floor((q.currentTurnExpiresAt.getTime() - Date.now()) / 1000));
      }
      return 0;
    };

    return {
      teamId,
      queue1: {
        queueNumber: 1,
        title: q1.title,
        status: q1.status,
        burstTimeSeconds: q1.burstTimeSeconds,
        currentTurnIndex: q1.currentTurnIndex,
        currentTurnTeamName: q1.teams[q1.currentTurnIndex]?.teamName || null,
        isMyTurn: isQ1MyTurn,
        remainingSeconds: calcRemaining(q1),
        myTeamOrder: q1Team ? q1.teams.findIndex((t) => t.teamId.toString() === teamId) + 1 : null,
        myAssignment: q1Team?.selectedCompanyName
          ? {
              companyId: q1Team.selectedCompanyId,
              companyName: q1Team.selectedCompanyName,
              companyDescription: q1Team.selectedCompanyDescription,
              selectedAt: q1Team.selectedAt,
            }
          : null,
        availableCompanies: q1.companies.filter((c) => !c.isAssigned),
        totalCompanies: q1.companies.length,
      },
      queue2: {
        queueNumber: 2,
        title: q2.title,
        status: q2.status,
        burstTimeSeconds: q2.burstTimeSeconds,
        currentTurnIndex: q2.currentTurnIndex,
        currentTurnTeamName: q2.teams[q2.currentTurnIndex]?.teamName || null,
        isMyTurn: isQ2MyTurn,
        remainingSeconds: calcRemaining(q2),
        myTeamOrder: q2Team ? q2.teams.findIndex((t) => t.teamId.toString() === teamId) + 1 : null,
        myAssignment: q2Team?.selectedCompanyName
          ? {
              companyId: q2Team.selectedCompanyId,
              companyName: q2Team.selectedCompanyName,
              companyDescription: q2Team.selectedCompanyDescription,
              selectedAt: q2Team.selectedAt,
            }
          : null,
        availableCompanies: q2.companies.filter((c) => !c.isAssigned),
        totalCompanies: q2.companies.length,
      },
    };
  }

  /**
   * Retrieves summary of both queues for admin / staff monitoring.
   */
  static async getAdminQueuesSummary() {
    const q1 = await this.getQueue(1);
    const q2 = await this.getQueue(2);

    const formatQueue = (q: IRoundRobinQueue) => {
      let remainingSeconds = 0;
      if (q.status === 'paused') {
        remainingSeconds = q.pausedRemainingSeconds || 0;
      } else if (q.status === 'active' && q.currentTurnExpiresAt) {
        remainingSeconds = Math.max(0, Math.floor((q.currentTurnExpiresAt.getTime() - Date.now()) / 1000));
      }

      return {
        _id: q._id,
        queueNumber: q.queueNumber,
        title: q.title,
        status: q.status,
        burstTimeSeconds: q.burstTimeSeconds,
        currentTurnIndex: q.currentTurnIndex,
        currentTurnTeam: q.teams[q.currentTurnIndex] || null,
        currentTurnTeamId: q.teams[q.currentTurnIndex]?.teamId?.toString() || null,
        currentTurnExpiresAt: q.currentTurnExpiresAt,
        remainingSeconds,
        totalTeams: q.teams.length,
        selectedTeamsCount: q.teams.filter((t) => t.hasSelected).length,
        skippedTeamsCount: q.teams.filter((t) => t.isSkipped).length,
        totalCompanies: q.companies.length,
        assignedCompaniesCount: q.companies.filter((c) => c.isAssigned).length,
        companies: q.companies,
        teams: q.teams,
      };
    };

    return {
      queue1: formatQueue(q1),
      queue2: formatQueue(q2),
    };
  }
}
