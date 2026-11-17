import { Router, Request, Response, NextFunction } from 'express';
import { LeaderboardService } from '../services/leaderboardService.js';
import { requireAuth, requireRole } from '../middleware/roles.js';
import { LeaderboardPublishSchema } from '../schemas/validation.js';

const router = Router();

/**
 * Public route to get latest published cleaning leaderboard
 */
router.get('/published', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const published = await LeaderboardService.getPublishedCleaningLeaderboard();
    return res.json({
      published: !!published,
      leaderboard: published,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * Admin preview calculated leaderboard before publishing
 */
router.get('/preview', requireAuth, requireRole(['admin']), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tieBreakPolicy = (req.query.tieBreakPolicy as any) || 'score_desc_then_time_asc';
    const preview = await LeaderboardService.calculateCleaningLeaderboard(tieBreakPolicy);
    return res.json(preview);
  } catch (err) {
    next(err);
  }
});

/**
 * Admin publish immutable snapshot
 */
router.post('/publish', requireAuth, requireRole(['admin']), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = LeaderboardPublishSchema.parse(req.body);
    const snapshot = await LeaderboardService.publishCleaningLeaderboard(req.user!.email, parsed.tieBreakPolicy);

    return res.json({
      message: 'Cleaning leaderboard published successfully.',
      snapshot,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
