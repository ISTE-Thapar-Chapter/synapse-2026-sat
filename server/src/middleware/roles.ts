import { Request, Response, NextFunction } from 'express';
import { AccountRole } from '../models/Account.js';
import { StageService } from '../services/stageService.js';
import { StageIdentifier } from '../models/EventStage.js';

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({
      error: 'Authentication Required',
      message: 'You must be signed in to perform this action.',
    });
  }
  next();
}

export function requireRole(allowedRoles: AccountRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication Required',
        message: 'You must be signed in to perform this action.',
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'Forbidden',
        message: `This action requires one of the following roles: [${allowedRoles.join(', ')}]. Your current role is '${req.user.role}'.`,
      });
    }

    next();
  };
}

export function requireTeamLeader(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication Required' });
  }

  // Admins can bypass leader restriction for emergency administrative changes
  if (req.user.role === 'admin') {
    return next();
  }

  if (!req.team) {
    return res.status(403).json({
      error: 'No Team Found',
      message: 'You must belong to an eligible team to edit or submit answers.',
    });
  }

  if (req.team.disqualified) {
    return res.status(403).json({
      error: 'Team Disqualified',
      message: 'Your team is currently disqualified. Submissions and draft edits are locked.',
    });
  }

  if (req.participant?.restricted) {
    return res.status(403).json({
      error: 'Participant Restricted',
      message: 'Your account is restricted from performing team submissions.',
    });
  }

  if (!req.isLeader) {
    return res.status(403).json({
      error: 'Leader Authorization Required',
      message: 'Only the team leader is permitted to edit drafts or submit answers on behalf of the team.',
    });
  }

  next();
}

export function requireStage(expectedStage: StageIdentifier) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const activeStage = await StageService.getActiveStage();
    if (activeStage !== expectedStage && req.user?.role !== 'admin') {
      return res.status(403).json({
        error: 'Stage Inactive',
        message: `This action is only available during the '${expectedStage}' stage. Current stage is '${activeStage}'.`,
      });
    }
    next();
  };
}
