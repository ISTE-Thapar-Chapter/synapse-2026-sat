import { Router, Request, Response, NextFunction } from 'express';
import { LeaderboardService } from '../services/leaderboardService.js';
import { requireAuth, requireRole } from '../middleware/roles.js';
import { LeaderboardPublishSchema } from '../schemas/validation.js';
import { CompetitionConfig } from '../models/CompetitionConfig.js';

const router = Router();

/**
 * Public route to get live calculated leaderboard
 * Respects admin leaderboard visibility toggle
 */
router.get('/live', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const live = await LeaderboardService.calculateLiveLeaderboard();
    let config = await CompetitionConfig.findOne();
    const isVisible = config?.leaderboardVisible ?? false;
    const isStaff = req.user && ['admin', 'evaluator', 'mentor'].includes(req.user.role);

    if (!isVisible && !isStaff) {
      const maskedEntries = (live.entries || [])
        .map((e) => ({
          teamId: e.teamId,
          teamName: e.teamName,
          college: e.college,
          score: 0,
          status: e.status,
        }))
        .sort((a, b) => (a.teamName || '').localeCompare(b.teamName || ''))
        .map((e, idx) => ({
          ...e,
          rank: idx + 1,
        }));

      return res.json({
        ...live,
        entries: maskedEntries,
        leaderboardVisible: false,
        message: 'Rankings and scores will be published shortly.',
        leaderboard: {
          ...live,
          entries: maskedEntries,
        },
      });
    }

    return res.json({
      ...live,
      entries: live.entries,
      leaderboardVisible: isVisible,
      isStaffPreview: !isVisible && isStaff,
      leaderboard: live,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * Public route to get latest published cleaning leaderboard
 */
router.get('/published', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const rawPublished = await LeaderboardService.getPublishedCleaningLeaderboard();
    const published = (rawPublished as any).toObject ? (rawPublished as any).toObject() : rawPublished;
    let config = await CompetitionConfig.findOne();
    const isVisible = config?.leaderboardVisible ?? true;
    const isStaff = req.user && ['admin', 'evaluator', 'mentor'].includes(req.user.role);

    if (!isVisible && !isStaff && published?.entries) {
      const masked = (published.entries || [])
        .map((e: any) => ({
          ...(e.toObject ? e.toObject() : e),
          score: 0,
        }))
        .sort((a: any, b: any) => (a.teamName || '').localeCompare(b.teamName || ''))
        .map((e: any, idx: number) => ({ ...e, rank: idx + 1 }));

      return res.json({
        leaderboardVisible: false,
        published: true,
        leaderboard: {
          ...published,
          entries: masked,
        },
        entries: masked,
      });
    }

    return res.json({
      leaderboardVisible: isVisible,
      isStaffPreview: !isVisible && isStaff,
      published: true,
      leaderboard: published,
      entries: published?.entries || [],
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

/**
 * Public route to get winners announcement and podium rankings
 */
router.get('/winners', async (req: Request, res: Response, next: NextFunction) => {
  try {
    let config = await CompetitionConfig.findOne();
    if (!config) config = await CompetitionConfig.create({});

    return res.json({
      announced: !!config.winnersAnnouncement?.announced,
      announcedAt: config.winnersAnnouncement?.announcedAt || null,
      winners: config.winnersAnnouncement?.winners || [],
    });
  } catch (err) {
    next(err);
  }
});

export default router;
