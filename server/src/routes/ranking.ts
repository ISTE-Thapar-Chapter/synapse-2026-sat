import { Router, Request, Response, NextFunction } from 'express';
import { RankingService } from '../services/rankingService.js';
import { requireAuth, requireRole } from '../middleware/roles.js';

const router = Router();

/**
 * Public route to get published company assignments
 */
router.get('/published', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const published = await RankingService.getPublishedCompanyAssignments();
    return res.json({
      published: !!published,
      assignments: published,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * Admin preview company assignments
 */
router.get('/preview', requireAuth, requireRole(['admin']), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const preview = await RankingService.previewCompanyAssignments();
    return res.json(preview);
  } catch (err) {
    next(err);
  }
});

/**
 * Admin publish company assignments
 */
router.post('/publish', requireAuth, requireRole(['admin']), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const snapshot = await RankingService.publishCompanyAssignments(req.user!.email);
    return res.json({
      message: 'Company assignments published successfully.',
      snapshot,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
