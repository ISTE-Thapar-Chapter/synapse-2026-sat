import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth, requireRole, requireTeamLeader } from '../middleware/roles.js';
import { RoundRobinService } from '../services/roundRobinService.js';
import { Participant } from '../models/Participant.js';
import { Team } from '../models/Team.js';
import { CompanySelectSchema, CompaniesUpdateSchema } from '../schemas/validation.js';

const router = Router();

/**
 * Helper to parse queueNumber (1 or 2)
 */
function parseQueueNum(param: string): 1 | 2 {
  const num = parseInt(param, 10);
  if (num !== 1 && num !== 2) {
    throw new Error('Invalid queue number. Must be 1 or 2.');
  }
  return num as 1 | 2;
}

/**
 * GET /api/round-robin/summary
 * Admin and Staff view of both queues, active timers, and company pools
 */
router.get(
  '/summary',
  requireAuth,
  requireRole(['admin', 'evaluator']),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const summary = await RoundRobinService.getAdminQueuesSummary();
      return res.json(summary);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/round-robin/my-status
 * Participant view of their assigned companies, turns, and available options
 */
router.get(
  '/my-status',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const email = req.user!.email.toLowerCase().trim();
      const participant = await Participant.findOne({ email });

      if (!participant || !participant.teamId) {
        return res.status(404).json({
          error: 'No Team Found',
          message: 'You are not currently registered with any participating team.',
        });
      }

      const status = await RoundRobinService.getTeamAssignments(participant.teamId.toString());
      return res.json(status);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/round-robin/queue/:queueNumber/select
 * Team leader selects a company during their turn in the active queue
 */
router.post(
  '/queue/:queueNumber/select',
  requireAuth,
  requireTeamLeader,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const queueNumber = parseQueueNum(req.params.queueNumber);
      const parsed = CompanySelectSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          error: 'Validation Error',
          details: parsed.error.issues.map((i) => i.message).join(', '),
        });
      }

      const email = req.user!.email.toLowerCase().trim();
      const participant = await Participant.findOne({ email });

      if (!participant || !participant.teamId) {
        return res.status(403).json({
          error: 'Unauthorized',
          message: 'Only registered team members can select a company for their team.',
        });
      }

      const result = await RoundRobinService.selectCompany(
        queueNumber,
        participant.teamId.toString(),
        parsed.data.companyId,
        email
      );

      return res.json({
        message: `Successfully selected "${result.assignedCompany.name}" for Queue ${queueNumber}.`,
        assignedCompany: result.assignedCompany,
        queue: result.queue,
      });
    } catch (err: any) {
      return res.status(400).json({
        error: 'Selection Error',
        message: err.message || 'Failed to select company.',
      });
    }
  }
);

/**
 * POST /api/round-robin/queue/:queueNumber/enable
 * Admin enables a queue
 */
router.post(
  '/queue/:queueNumber/enable',
  requireAuth,
  requireRole(['admin']),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const queueNumber = parseQueueNum(req.params.queueNumber);
      const queue = await RoundRobinService.enableQueue(queueNumber, req.user!.email);
      return res.json({
        message: `Queue ${queueNumber} enabled.`,
        queue,
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/round-robin/queue/:queueNumber/disable
 * Admin disables a queue
 */
router.post(
  '/queue/:queueNumber/disable',
  requireAuth,
  requireRole(['admin']),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const queueNumber = parseQueueNum(req.params.queueNumber);
      const queue = await RoundRobinService.disableQueue(queueNumber, req.user!.email);
      return res.json({
        message: `Queue ${queueNumber} disabled.`,
        queue,
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/round-robin/queue/:queueNumber/initialize
 * Admin initializes the queue turn order from the live leaderboard
 */
router.post(
  '/queue/:queueNumber/initialize',
  requireAuth,
  requireRole(['admin']),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const queueNumber = parseQueueNum(req.params.queueNumber);
      const queue = await RoundRobinService.initializeQueue(queueNumber, req.user!.email);
      return res.json({
        message: `Queue ${queueNumber} successfully initialized with ${queue.teams.length} teams in leaderboard preference order.`,
        queue,
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/round-robin/queue/:queueNumber/start
 * Admin starts the queue burst turns
 */
router.post(
  '/queue/:queueNumber/start',
  requireAuth,
  requireRole(['admin']),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const queueNumber = parseQueueNum(req.params.queueNumber);
      const queue = await RoundRobinService.startQueue(queueNumber, req.user!.email);
      return res.json({
        message: `Queue ${queueNumber} started. Turn active for team: ${queue.teams[queue.currentTurnIndex]?.teamName}.`,
        queue,
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/round-robin/queue/:queueNumber/pause
 * Admin pauses the queue in between turns
 */
router.post(
  '/queue/:queueNumber/pause',
  requireAuth,
  requireRole(['admin']),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const queueNumber = parseQueueNum(req.params.queueNumber);
      const queue = await RoundRobinService.pauseQueue(queueNumber, req.user!.email);
      return res.json({
        message: `Queue ${queueNumber} paused with ${queue.pausedRemainingSeconds ?? 0}s remaining.`,
        queue,
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/round-robin/queue/:queueNumber/resume
 * Admin resumes a paused queue
 */
router.post(
  '/queue/:queueNumber/resume',
  requireAuth,
  requireRole(['admin']),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const queueNumber = parseQueueNum(req.params.queueNumber);
      const queue = await RoundRobinService.resumeQueue(queueNumber, req.user!.email);
      return res.json({
        message: `Queue ${queueNumber} resumed.`,
        queue,
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/round-robin/queue/:queueNumber/next-turn
 * Admin manually advances or skips the current team's turn
 */
router.post(
  '/queue/:queueNumber/next-turn',
  requireAuth,
  requireRole(['admin']),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const queueNumber = parseQueueNum(req.params.queueNumber);
      const skip = req.body.skip !== false;
      const queue = await RoundRobinService.nextTurn(queueNumber, req.user!.email, skip);
      return res.json({
        message: `Queue ${queueNumber} advanced to turn index ${queue.currentTurnIndex}.`,
        queue,
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * PUT /api/round-robin/queue/:queueNumber/companies
 * Admin configures the companies pool (name & description) for a specific queue
 */
router.put(
  '/queue/:queueNumber/companies',
  requireAuth,
  requireRole(['admin']),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const queueNumber = parseQueueNum(req.params.queueNumber);
      const parsed = CompaniesUpdateSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          error: 'Validation Error',
          details: parsed.error.issues.map((i) => i.message).join(', '),
        });
      }

      const queue = await RoundRobinService.configureCompanies(
        queueNumber,
        parsed.data.companies,
        req.user!.email
      );

      return res.json({
        message: `Queue ${queueNumber} companies updated (${queue.companies.length} companies configured).`,
        companies: queue.companies,
        queue,
      });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
