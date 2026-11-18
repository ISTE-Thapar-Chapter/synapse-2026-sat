import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth, requireRole, requireTeamLeader } from '../middleware/roles.js';
import { CompetitionConfig } from '../models/CompetitionConfig.js';
import { QuizScore } from '../models/QuizScore.js';
import { Team } from '../models/Team.js';
import { RoundRobinQueue } from '../models/RoundRobinQueue.js';
import { CompanyAssignment } from '../models/CompanyAssignment.js';
import { logAudit } from '../services/auditService.js';
import { BatchQuizScoreSchema, AuctionBidSubmitSchema } from '../schemas/validation.js';

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

    return res.json({
      hasTeam: true,
      teamId: team._id,
      teamName: team.teamName,
      quizMarks: quizScore.quizMarks,
      multiplier: quizScore.multiplier,
      auctionBalance: quizScore.auctionBalance,
      initialTokens: quizScore.auctionBalance,
      balance: quizScore.remainingBalance,
      spentTokens: quizScore.spentTokens,
      remainingBalance: quizScore.remainingBalance,
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
      return {
        teamId: t._id,
        teamName: t.teamName,
        quizMarks: qs ? qs.quizMarks : 0,
        multiplier: qs ? qs.multiplier : multiplier,
        auctionBalance: qs ? qs.auctionBalance : 0,
        spentTokens: qs ? qs.spentTokens : 0,
        remainingBalance: qs ? qs.remainingBalance : 0,
        assignedCompanies: qs ? qs.assignedCompanies : {},
      };
    });

    return res.json({
      multiplier,
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
    for (const item of parsed.scores) {
      const marks = Math.max(0, item.quizMarks);
      const team = await Team.findById(item.teamId);
      if (!team) continue;

      const balance = Math.round(marks * multiplier);

      bulkOps.push({
        updateOne: {
          filter: { teamId: team._id },
          update: {
            $set: {
              teamName: team.teamName,
              quizMarks: marks,
              multiplier,
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
        qs.remainingBalance = Math.max(0, qs.auctionBalance - (qs.spentTokens || 0));
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
 * Start auction on a company item (Bucket 2)
 */
router.post('/staff/start-item', requireAuth, requireRole(['evaluator', 'admin']), async (req: Request, res: Response, next: NextFunction) => {
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
 * Admin assigns the current auction company directly to a team
 */
router.post('/staff/assign', requireAuth, requireRole(['evaluator', 'admin']), async (req: Request, res: Response, next: NextFunction) => {
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
 * Pause / Resume live auction
 */
router.post('/staff/pause', requireAuth, requireRole(['evaluator', 'admin']), async (req: Request, res: Response, next: NextFunction) => {
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
 * Finalize / Hammer auction item
 */
router.post('/staff/finalize', requireAuth, requireRole(['evaluator', 'admin']), async (req: Request, res: Response, next: NextFunction) => {
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

export default router;
