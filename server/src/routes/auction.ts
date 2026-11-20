import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth, requireRole, requireTeamLeader } from '../middleware/roles.js';
import { CompetitionConfig } from '../models/CompetitionConfig.js';
import { QuizScore } from '../models/QuizScore.js';
import { Team } from '../models/Team.js';
import { RoundRobinQueue } from '../models/RoundRobinQueue.js';
import { CompanyAssignment } from '../models/CompanyAssignment.js';
import { logAudit } from '../services/auditService.js';
import { BatchQuizScoreSchema, AuctionBidSubmitSchema, BatchAuctionCompaniesSchema, AuctionReassignSchema } from '../schemas/validation.js';

const router = Router();

/**
 * Public route to get current live auction state
 * Every user (including public) can view the company being auctioned in real time
 */
router.get('/live', async (req: Request, res: Response, next: NextFunction) => {
  try {
    let config = await CompetitionConfig.findOne();
    if (!config) config = await CompetitionConfig.create({});

    return res.json({
      liveAuction: config.liveAuction || {
        activeItem: null,
        status: 'idle',
        currentBid: 0,
        highestBidderTeamId: null,
        highestBidderTeamName: null,
        bidHistory: [],
      },
      quizMultiplier: config.quizMultiplier || 100,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * Public route: Get all Bucket 2 auction companies
 */
router.get('/companies', async (req: Request, res: Response, next: NextFunction) => {
  try {
    let config = await CompetitionConfig.findOne();
    if (!config) config = await CompetitionConfig.create({});

    // Seed defaults if empty
    if (!config.auctionCompanies || config.auctionCompanies.length === 0) {
      config.auctionCompanies = [
        { id: 'auc_1', name: 'DeepMind Robotics', description: 'Autonomous decision-making and spatial robotics foundation.', basePrice: 50, isAssigned: false },
        { id: 'auc_2', name: 'OpenAI Infrastructure', description: 'Large-scale distributed systems and high-throughput model inference.', basePrice: 50, isAssigned: false },
        { id: 'auc_3', name: 'Anthropic Safety Systems', description: 'Constitutional alignment and interpretability tooling partner.', basePrice: 50, isAssigned: false },
        { id: 'auc_4', name: 'Databricks Lakehouse', description: 'Unified analytics and multi-cloud data orchestration platform.', basePrice: 50, isAssigned: false },
        { id: 'auc_5', name: 'Stripe Global Financials', description: 'Mission-critical payment rails and real-time fraud mitigation.', basePrice: 50, isAssigned: false },
        { id: 'auc_6', name: 'Snowflake Quantum Data', description: 'Autonomous data sharing, indexing, and elastic cloud computation.', basePrice: 50, isAssigned: false },
      ];
      await config.save();
    }

    return res.json({
      companies: config.auctionCompanies,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * Admin route: Update Bucket 2 auction companies (add/edit/delete)
 */
router.put('/companies', requireAuth, requireRole(['admin']), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = BatchAuctionCompaniesSchema.parse(req.body);
    let config = await CompetitionConfig.findOne();
    if (!config) config = await CompetitionConfig.create({});

    const existingMap = new Map((config.auctionCompanies || []).map((c) => [c.id, c]));

    const updatedCompanies = parsed.companies.map((c, idx) => {
      const id = c.id || `auc_${Date.now()}_${idx}`;
      const existing = existingMap.get(id);
      return {
        id,
        name: c.name.trim(),
        description: c.description.trim(),
        basePrice: c.basePrice || 0,
        isAssigned: existing?.isAssigned || false,
        assignedToTeamId: existing?.assignedToTeamId || null,
        assignedToTeamName: existing?.assignedToTeamName || null,
        assignedAt: existing?.assignedAt || null,
      };
    });

    config.auctionCompanies = updatedCompanies;
    await config.save();

    await logAudit(
      req.user!.email,
      'AUCTION_COMPANIES_UPDATED',
      'CompetitionConfig',
      config._id.toString(),
      { count: updatedCompanies.length }
    );

    return res.json({
      message: 'Auction companies (Bucket 2) updated successfully.',
      companies: config.auctionCompanies,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * Team route: Get team's auction token balance
 */
router.get('/my-balance', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const team = req.team;
    if (!team) {
      return res.json({ hasTeam: false, balance: 0, remainingBalance: 0, spentTokens: 0 });
    }

    let config = await CompetitionConfig.findOne();
    const multiplier = config?.quizMultiplier || 100;

    let quizScore = await QuizScore.findOne({ teamId: team._id });
    if (!quizScore) {
      quizScore = new QuizScore({
        teamId: team._id,
        teamName: team.teamName,
        quizMarks: 0,
        multiplier,
      });
      await quizScore.save();
    }

    const isReleased = !!config?.quizTokensReleased && !!quizScore.tokensReleased;
    const activeBalance = isReleased ? quizScore.remainingBalance : 0;
    const activeInitial = isReleased ? quizScore.auctionBalance : 0;

    return res.json({
      hasTeam: true,
      teamId: team._id,
      teamName: team.teamName,
      tokensReleased: isReleased,
      auctionBalance: activeInitial,
      initialTokens: activeInitial,
      balance: activeBalance,
      spentTokens: quizScore.spentTokens,
      remainingBalance: activeBalance,
      assignedCompanies: quizScore.assignedCompanies || {},
    });
  } catch (err) {
    next(err);
  }
});

/**
 * Team leader places a bid in the live auction
 */
router.post('/bid', requireAuth, requireTeamLeader, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = AuctionBidSubmitSchema.parse(req.body);
    const { bidAmount } = parsed;
    const team = req.team!;

    let config = await CompetitionConfig.findOne();
    if (!config || !config.liveAuction || config.liveAuction.status !== 'bidding') {
      return res.status(400).json({
        error: 'Auction Inactive',
        message: 'There is no active company auction in progress at this moment.',
      });
    }

    const liveAuction = config.liveAuction;
    if (bidAmount <= (liveAuction.currentBid || 0)) {
      return res.status(400).json({
        error: 'Bid Too Low',
        message: `Your bid must be strictly higher than the current highest bid of ${liveAuction.currentBid} tokens.`,
      });
    }

    // Verify team token balance
    let quizScore = await QuizScore.findOne({ teamId: team._id });
    if (!quizScore) {
      quizScore = await QuizScore.create({
        teamId: team._id,
        teamName: team.teamName,
        quizMarks: 0,
        multiplier: config.quizMultiplier || 100,
      });
    }

    if (!config.quizTokensReleased || !quizScore.tokensReleased) {
      return res.status(400).json({
        error: 'Tokens Locked',
        message: 'Bidding tokens have not been released by the coordinators yet. Please wait for the token allocation to be published.',
      });
    }

    if (bidAmount > quizScore.remainingBalance) {
      return res.status(400).json({
        error: 'Insufficient Tokens',
        message: `Your team only has ${quizScore.remainingBalance} available tokens, but attempted to bid ${bidAmount}.`,
      });
    }

    // Update auction state
    liveAuction.currentBid = bidAmount;
    liveAuction.highestBidderTeamId = team._id as any;
    liveAuction.highestBidderTeamName = team.teamName;
    liveAuction.bidHistory.unshift({
      teamId: team._id as any,
      teamName: team.teamName,
      amount: bidAmount,
      timestamp: new Date(),
    });

    // Keep history bounded to last 30 bids
    if (liveAuction.bidHistory.length > 30) {
      liveAuction.bidHistory = liveAuction.bidHistory.slice(0, 30);
    }

    await config.save();

    await logAudit(
      req.user!.email,
      'AUCTION_BID_PLACED',
      'CompetitionConfig',
      config._id.toString(),
      {
        teamId: team._id.toString(),
        teamName: team.teamName,
        bidAmount,
        itemName: liveAuction.activeItem?.name,
      }
    );

    return res.json({
      message: 'Bid accepted successfully.',
      liveAuction: config.liveAuction,
    });
  } catch (err) {
    next(err);
  }
});

// -------------------------------------------------------------
// Staff Controls (Evaluators & Admins)
// -------------------------------------------------------------

/**
 * List all quiz marks and auction balances
 */
router.get('/staff/quiz-scores', requireAuth, requireRole(['evaluator', 'admin']), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const teams = await Team.find({ disqualified: false }).sort({ teamName: 1 });
    let config = await CompetitionConfig.findOne();
    const multiplier = config?.quizMultiplier || 100;

    const existingScores = await QuizScore.find();
    const scoreMap = new Map<string, any>();
    for (const s of existingScores) {
      scoreMap.set(s.teamId.toString(), s);
    }

    const result = teams.map((t) => {
      const qs = scoreMap.get(t._id.toString());
      const marks = qs ? qs.quizMarks : 0;
      const rate = qs ? qs.multiplier : multiplier;
      const isReleased = qs ? !!qs.tokensReleased : false;
      return {
        teamId: t._id,
        teamName: t.teamName,
        quizMarks: marks,
        multiplier: rate,
        potentialTokens: Math.round(marks * rate),
        auctionBalance: qs ? qs.auctionBalance : 0,
        spentTokens: qs ? qs.spentTokens : 0,
        remainingBalance: qs ? qs.remainingBalance : 0,
        tokensReleased: isReleased,
        submittedAt: qs?.submittedAt || null,
        autoEvaluated: !!qs?.autoEvaluated,
        assignedCompanies: qs ? qs.assignedCompanies : {},
      };
    });

    // Sort by quizMarks desc, then earlier submittedAt asc (tie-breaker), then teamName asc
    result.sort((a, b) => {
      if (b.quizMarks !== a.quizMarks) {
        return b.quizMarks - a.quizMarks;
      }
      if (a.submittedAt && b.submittedAt) {
        return new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime();
      }
      if (a.submittedAt && !b.submittedAt) return -1;
      if (!a.submittedAt && b.submittedAt) return 1;
      return a.teamName.localeCompare(b.teamName);
    });

    return res.json({
      multiplier,
      quizStatus: config?.quizStatus || 'not_started',
      quizTokensReleased: !!config?.quizTokensReleased,
      quizTokensReleasedAt: config?.quizTokensReleasedAt || null,
      totalQuestions: config?.quizQuestions?.length || 0,
      scores: result,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * Batch update quiz marks
 */
router.post('/staff/quiz-scores', requireAuth, requireRole(['evaluator', 'admin']), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = BatchQuizScoreSchema.parse(req.body);
    let config = await CompetitionConfig.findOne();
    if (!config) config = await CompetitionConfig.create({});

    const multiplier = parsed.multiplier || config.quizMultiplier || 100;
    if (parsed.multiplier && parsed.multiplier !== config.quizMultiplier) {
      config.quizMultiplier = parsed.multiplier;
      await config.save();
    }

    const bulkOps = [];
    const isReleased = !!config.quizTokensReleased;
    for (const item of parsed.scores) {
      const marks = Math.max(0, item.quizMarks);
      const team = await Team.findById(item.teamId);
      if (!team) continue;

      const balance = isReleased ? Math.round(marks * multiplier) : 0;

      bulkOps.push({
        updateOne: {
          filter: { teamId: team._id },
          update: {
            $set: {
              teamName: team.teamName,
              quizMarks: marks,
              multiplier,
              tokensReleased: isReleased,
              auctionBalance: balance,
            },
          },
          upsert: true,
        },
      });
    }

    if (bulkOps.length > 0) {
      await QuizScore.bulkWrite(bulkOps);

      // Recalculate remaining balances for each affected team
      const allUpdated = await QuizScore.find();
      for (const qs of allUpdated) {
        if (config.quizTokensReleased) {
          qs.tokensReleased = true;
          qs.auctionBalance = Math.round(qs.quizMarks * (qs.multiplier || multiplier));
          qs.remainingBalance = Math.max(0, qs.auctionBalance - (qs.spentTokens || 0));
        } else {
          qs.tokensReleased = false;
          qs.auctionBalance = 0;
          qs.remainingBalance = 0;
        }
        await qs.save();
      }
    }

    await logAudit(
      req.user!.email,
      'QUIZ_SCORES_UPDATED',
      'QuizScore',
      null,
      { count: parsed.scores.length, multiplier }
    );

    return res.json({
      message: 'Quiz marks and balances updated successfully.',
      updatedCount: bulkOps.length,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * Single team quiz score update (Evaluators and Admins)
 */
router.post('/staff/quiz-score/:teamId', requireAuth, requireRole(['evaluator', 'admin']), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { teamId } = req.params;
    const { quizMarks, multiplier } = req.body;
    const marks = Math.max(0, Number(quizMarks) || 0);

    const team = await Team.findById(teamId);
    if (!team) {
      return res.status(404).json({ error: 'Team Not Found', message: 'Team does not exist.' });
    }

    let config = await CompetitionConfig.findOne();
    if (!config) config = await CompetitionConfig.create({});
    const rate = Number(multiplier) || config.quizMultiplier || 100;
    if (multiplier && Number(multiplier) !== config.quizMultiplier) {
      config.quizMultiplier = Number(multiplier);
      await config.save();
    }

    const isReleased = !!config.quizTokensReleased;
    const potentialTokens = Math.round(marks * rate);
    const balance = isReleased ? potentialTokens : 0;

    let qs = await QuizScore.findOne({ teamId: team._id });
    if (!qs) {
      qs = new QuizScore({ teamId: team._id, teamName: team.teamName });
    }
    qs.teamName = team.teamName;
    qs.quizMarks = marks;
    qs.multiplier = rate;
    qs.tokensReleased = isReleased;
    qs.auctionBalance = balance;
    qs.remainingBalance = Math.max(0, balance - (qs.spentTokens || 0));
    await qs.save();

    await logAudit(
      req.user!.email,
      'QUIZ_SCORE_UPDATED_SINGLE',
      'QuizScore',
      qs._id.toString(),
      { teamId, teamName: team.teamName, marks, rate }
    );

    return res.json({
      message: `Score updated for ${team.teamName}.`,
      score: {
        teamId: team._id.toString(),
        teamName: team.teamName,
        quizMarks: marks,
        potentialTokens,
        auctionBalance: potentialTokens,
        tokensReleased: isReleased,
        spentTokens: qs.spentTokens || 0,
        remainingBalance: qs.remainingBalance,
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * Start auction on a company item (Bucket 2 - Admin only)
 */
router.post('/staff/start-item', requireAuth, requireRole(['admin']), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const itemId = req.body.id || req.body.itemId || `comp_${Date.now()}`;
    const name = req.body.name;
    const description = req.body.description;
    const basePrice = typeof req.body.basePrice === 'number'
      ? req.body.basePrice
      : (typeof req.body.startingBid === 'number' ? req.body.startingBid : 0);

    if (!name) {
      return res.status(400).json({ error: 'Validation Error', message: 'Company name is required to start bidding.' });
    }

    let config = await CompetitionConfig.findOne();
    if (!config) config = await CompetitionConfig.create({});

    config.liveAuction = {
      activeItem: {
        id: itemId,
        name: name.trim(),
        description: description ? description.trim() : 'Company up for live bidding.',
        basePrice,
      },
      status: 'bidding',
      currentBid: basePrice,
      highestBidderTeamId: null,
      highestBidderTeamName: null,
      bidHistory: [],
    };

    await config.save();

    await logAudit(
      req.user!.email,
      'AUCTION_ITEM_STARTED',
      'CompetitionConfig',
      config._id.toString(),
      { name, basePrice }
    );

    return res.json({
      message: `Auction started for ${name}.`,
      liveAuction: config.liveAuction,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * Admin assigns the current auction company directly to a team (Admin only)
 */
router.post('/staff/assign', requireAuth, requireRole(['admin']), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { teamId } = req.body;
    if (!teamId) {
      return res.status(400).json({ error: 'Validation Error', message: 'Team ID is required to assign company.' });
    }

    const winnerTeam = await Team.findById(teamId);
    if (!winnerTeam) {
      return res.status(404).json({ error: 'Team Not Found', message: 'The specified team does not exist.' });
    }

    let config = await CompetitionConfig.findOne();
    if (!config || !config.liveAuction || !config.liveAuction.activeItem) {
      return res.status(400).json({ error: 'No Active Company', message: 'Please set a company on the auction block first.' });
    }

    const activeItem = config.liveAuction.activeItem;
    config.liveAuction.status = 'sold';
    config.liveAuction.highestBidderTeamId = winnerTeam._id as any;
    config.liveAuction.highestBidderTeamName = winnerTeam.teamName;

    // Also mark matching company as assigned in config.auctionCompanies
    const matchComp = (config.auctionCompanies || []).find((c) => c.id === activeItem.id || c.name.toLowerCase() === activeItem.name.toLowerCase());
    if (matchComp) {
      matchComp.isAssigned = true;
      matchComp.assignedToTeamId = winnerTeam._id as any;
      matchComp.assignedToTeamName = winnerTeam.teamName;
      matchComp.assignedAt = new Date();
    }
    await config.save();

    let quizScore = await QuizScore.findOne({ teamId: winnerTeam._id });
    if (!quizScore) {
      quizScore = new QuizScore({ teamId: winnerTeam._id, teamName: winnerTeam.teamName });
    }
    quizScore.assignedCompanies = quizScore.assignedCompanies || {};
    quizScore.assignedCompanies.auctionCompany = {
      id: activeItem.id,
      name: activeItem.name,
      description: activeItem.description,
      price: config.liveAuction.currentBid || 0,
      wonAt: new Date(),
    };
    quizScore.markModified('assignedCompanies');
    await quizScore.save();

    await logAudit(
      req.user!.email,
      'AUCTION_COMPANY_ASSIGNED',
      'Team',
      winnerTeam._id.toString(),
      { companyName: activeItem.name, teamName: winnerTeam.teamName }
    );

    return res.json({
      message: `Successfully assigned "${activeItem.name}" to team "${winnerTeam.teamName}".`,
      liveAuction: config.liveAuction,
      assignedTeamName: winnerTeam.teamName,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * Pause / Resume live auction (Admin only)
 */
router.post('/staff/pause', requireAuth, requireRole(['admin']), async (req: Request, res: Response, next: NextFunction) => {
  try {
    let config = await CompetitionConfig.findOne();
    if (!config || !config.liveAuction) {
      return res.status(400).json({ error: 'No active auction' });
    }

    const currentStatus = config.liveAuction.status;
    const newStatus = currentStatus === 'bidding' ? 'paused' : currentStatus === 'paused' ? 'bidding' : currentStatus;
    config.liveAuction.status = newStatus as any;
    await config.save();

    return res.json({
      message: `Auction is now ${newStatus}.`,
      liveAuction: config.liveAuction,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * Finalize / Hammer auction item (Admin only)
 */
router.post('/staff/finalize', requireAuth, requireRole(['admin']), async (req: Request, res: Response, next: NextFunction) => {
  try {
    let config = await CompetitionConfig.findOne();
    if (!config || !config.liveAuction || !config.liveAuction.activeItem) {
      return res.status(400).json({ error: 'No active auction item to finalize.' });
    }

    const liveAuction = config.liveAuction;
    const activeItem = liveAuction.activeItem;
    if (!activeItem) {
      return res.status(400).json({ error: 'No active auction item to finalize.' });
    }

    const winnerTeamId = liveAuction.highestBidderTeamId;
    const winningBid = liveAuction.currentBid;

    if (winnerTeamId && winningBid > 0) {
      const winnerTeam = await Team.findById(winnerTeamId);
      if (winnerTeam) {
        let quizScore = await QuizScore.findOne({ teamId: winnerTeam._id });
        if (!quizScore) {
          quizScore = new QuizScore({ teamId: winnerTeam._id, teamName: winnerTeam.teamName });
        }

        quizScore.spentTokens = (quizScore.spentTokens || 0) + winningBid;
        quizScore.remainingBalance = Math.max(0, quizScore.auctionBalance - quizScore.spentTokens);
        quizScore.assignedCompanies = quizScore.assignedCompanies || {};
        quizScore.assignedCompanies.auctionCompany = {
          id: activeItem.id,
          name: activeItem.name,
          description: activeItem.description,
          price: winningBid,
          wonAt: new Date(),
        };
        quizScore.markModified('assignedCompanies');
        await quizScore.save();

        // Also mark company as assigned in RoundRobinQueue 2 if it matches
        const q2 = await RoundRobinQueue.findOne({ queueNumber: 2 });
        if (q2) {
          const comp = q2.companies.find((c) => c.name.toLowerCase() === activeItem.name.toLowerCase() || c.id === activeItem.id);
          if (comp) {
            comp.isAssigned = true;
            comp.assignedToTeamId = winnerTeam._id as any;
            comp.assignedToTeamName = winnerTeam.teamName;
            comp.assignedAt = new Date();
          }
          const teamInQ2 = q2.teams.find((t) => t.teamId.toString() === winnerTeam._id.toString());
          if (teamInQ2) {
            teamInQ2.hasSelected = true;
            teamInQ2.selectedCompanyId = activeItem.id;
            teamInQ2.selectedCompanyName = activeItem.name;
            teamInQ2.selectedCompanyDescription = activeItem.description;
            teamInQ2.selectedAt = new Date();
          }
          await q2.save();
        }
      }
    }

    liveAuction.status = 'sold';

    // Also mark matching company as assigned in config.auctionCompanies
    if (activeItem && winnerTeamId) {
      const matchComp = (config.auctionCompanies || []).find((c) => c.id === activeItem.id || c.name.toLowerCase() === activeItem.name.toLowerCase());
      if (matchComp) {
        matchComp.isAssigned = true;
        matchComp.assignedToTeamId = winnerTeamId as any;
        matchComp.assignedToTeamName = liveAuction.highestBidderTeamName;
        matchComp.assignedAt = new Date();
      }
    }
    await config.save();

    await logAudit(
      req.user!.email,
      'AUCTION_ITEM_FINALIZED',
      'CompetitionConfig',
      config._id.toString(),
      {
        itemName: activeItem.name,
        winnerTeamName: liveAuction.highestBidderTeamName,
        winningBid,
      }
    );

    return res.json({
      message: `Auction for ${activeItem.name} completed successfully. Sold to ${liveAuction.highestBidderTeamName || 'None'} for ${winningBid} tokens.`,
      liveAuction: config.liveAuction,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * Get all team assignments and balances for staff oversight
 */
router.get('/staff/assignments', requireAuth, requireRole(['evaluator', 'admin']), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const teams = await Team.find({ disqualified: false }).sort({ teamName: 1 });
    const quizScores = await QuizScore.find();
    const qsMap = new Map<string, any>(quizScores.map((q) => [q.teamId.toString(), q]));

    const q1 = await RoundRobinQueue.findOne({ queueNumber: 1 });
    const q1Map = new Map<string, any>();
    if (q1) {
      for (const t of q1.teams) {
        if (t.hasSelected && t.selectedCompanyName) {
          q1Map.set(t.teamId.toString(), {
            id: t.selectedCompanyId,
            name: t.selectedCompanyName,
            description: t.selectedCompanyDescription,
            selectedAt: t.selectedAt,
          });
        }
      }
    }

    const assignments = teams.map((team) => {
      const qs = qsMap.get(team._id.toString());
      const r1Comp = q1Map.get(team._id.toString()) || qs?.assignedCompanies?.queue1Company || null;
      const aucComp = qs?.assignedCompanies?.auctionCompany || null;

      return {
        teamId: team._id,
        teamName: team.teamName,
        quizMarks: qs?.quizMarks || 0,
        auctionBalance: qs?.auctionBalance || 0,
        spentTokens: qs?.spentTokens || 0,
        remainingBalance: qs?.remainingBalance || 0,
        roundRobinCompany: r1Comp,
        auctionCompany: aucComp,
        hasBothCompanies: !!(r1Comp && aucComp),
      };
    });

    return res.json({
      assignments,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * Admin change / reassign an auction company for a team (Admin only)
 */
router.post('/staff/reassign', requireAuth, requireRole(['admin']), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { teamId, companyId, companyName, companyDescription, price } = AuctionReassignSchema.parse(req.body);

    const team = await Team.findById(teamId);
    if (!team) {
      return res.status(404).json({ error: 'Team Not Found', message: 'Team does not exist.' });
    }

    let config = await CompetitionConfig.findOne();
    if (!config) config = await CompetitionConfig.create({});

    let quizScore = await QuizScore.findOne({ teamId: team._id });
    if (!quizScore) {
      quizScore = new QuizScore({ teamId: team._id, teamName: team.teamName });
    }

    // Unassign if companyId is null or empty
    if (!companyId) {
      const prevComp = quizScore.assignedCompanies?.auctionCompany;
      if (prevComp) {
        const found = (config.auctionCompanies || []).find((c) => c.id === prevComp.id || c.name === prevComp.name);
        if (found) {
          found.isAssigned = false;
          found.assignedToTeamId = null;
          found.assignedToTeamName = null;
          found.assignedAt = null;
        }
      }
      quizScore.assignedCompanies = quizScore.assignedCompanies || {};
      quizScore.assignedCompanies.auctionCompany = null;
      quizScore.markModified('assignedCompanies');
      await quizScore.save();
      await config.save();

      await logAudit(
        req.user!.email,
        'AUCTION_COMPANY_UNASSIGNED',
        'Team',
        team._id.toString(),
        { teamName: team.teamName }
      );

      return res.json({
        message: `Auction company removed for team ${team.teamName}.`,
        teamId: team._id,
        auctionCompany: null,
      });
    }

    // Find company in Bucket 2 or use provided details
    let targetComp = (config.auctionCompanies || []).find((c) => c.id === companyId);
    const finalName = companyName || targetComp?.name || 'Assigned Partner';
    const finalDesc = companyDescription || targetComp?.description || '';
    const finalPrice = typeof price === 'number' ? price : (targetComp?.basePrice || 0);

    // Unassign old company in config.auctionCompanies if team had a different one
    const prevComp = quizScore.assignedCompanies?.auctionCompany;
    if (prevComp && prevComp.id !== companyId) {
      const oldMatch = (config.auctionCompanies || []).find((c) => c.id === prevComp.id);
      if (oldMatch) {
        oldMatch.isAssigned = false;
        oldMatch.assignedToTeamId = null;
        oldMatch.assignedToTeamName = null;
        oldMatch.assignedAt = null;
      }
    }

    // If targetComp was held by another team, clear it from that team's QuizScore
    if (targetComp && targetComp.assignedToTeamId && targetComp.assignedToTeamId.toString() !== team._id.toString()) {
      const otherQs = await QuizScore.findOne({ teamId: targetComp.assignedToTeamId });
      if (otherQs && otherQs.assignedCompanies?.auctionCompany?.id === targetComp.id) {
        otherQs.assignedCompanies.auctionCompany = null;
        otherQs.markModified('assignedCompanies');
        await otherQs.save();
      }
    }

    // Mark as assigned in config.auctionCompanies
    if (targetComp) {
      targetComp.isAssigned = true;
      targetComp.assignedToTeamId = team._id as any;
      targetComp.assignedToTeamName = team.teamName;
      targetComp.assignedAt = new Date();
    }

    quizScore.assignedCompanies = quizScore.assignedCompanies || {};
    quizScore.assignedCompanies.auctionCompany = {
      id: companyId,
      name: finalName,
      description: finalDesc,
      price: finalPrice,
      wonAt: new Date(),
    };
    quizScore.markModified('assignedCompanies');
    await quizScore.save();
    await config.save();

    await logAudit(
      req.user!.email,
      'AUCTION_COMPANY_REASSIGNED',
      'Team',
      team._id.toString(),
      { companyName: finalName, teamName: team.teamName, price: finalPrice }
    );

    return res.json({
      message: `Successfully assigned "${finalName}" to team "${team.teamName}".`,
      teamId: team._id,
      assignedCompany: quizScore.assignedCompanies.auctionCompany,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
