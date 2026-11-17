import { Router, Request, Response, NextFunction } from 'express';
import { StageService } from '../services/stageService.js';
import { StageTransitionSchema } from '../schemas/validation.js';
import { requireAuth, requireRole } from '../middleware/roles.js';
import { EventStage, VALID_STAGES } from '../models/EventStage.js';

const router = Router();

/**
 * Public route to get current active stage and metadata
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const activeStage = await StageService.getActiveStage();
    const stageDetails = await EventStage.findOne({ stageId: activeStage });
    const gates = await StageService.evaluateCompletionConditions(activeStage);

    return res.json({
      activeStage,
      details: stageDetails,
      gates,
      allStages: VALID_STAGES,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * Admin route to advance or revert event stage
 */
router.post('/transition', requireAuth, requireRole(['admin']), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = StageTransitionSchema.parse(req.body);
    const adminEmail = req.user!.email;

    const result = await StageService.transitionStage(
      parsed.toStage as any,
      adminEmail,
      parsed.reason,
      parsed.forceException
    );

    return res.json({
      message: `Successfully transitioned event stage to '${parsed.toStage}'.`,
      ...result,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
