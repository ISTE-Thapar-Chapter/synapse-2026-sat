import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { Account, AccountRole } from '../models/Account.js';
import { Participant, IParticipant } from '../models/Participant.js';
import { Team, ITeam } from '../models/Team.js';

export interface AuthenticatedUser {
  email: string;
  name: string;
  role: AccountRole;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
      participant?: IParticipant | null;
      team?: ITeam | null;
      isLeader?: boolean;
    }
  }
}

export async function authMiddleware(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET, { algorithms: ['HS256'] }) as { email: string; name?: string };
    const email = decoded.email.toLowerCase().trim();

    // 1. Account lookup for role
    const account = await Account.findOne({ email });
    const userRole: AccountRole = account ? account.role : 'public';
    const userName: string = account ? account.name : decoded.name || email.split('@')[0];

    req.user = {
      email,
      name: userName,
      role: userRole,
    };

    // 2. Participant & Team lookup
    const participant = await Participant.findOne({ email });
    req.participant = participant;

    if (participant && participant.teamId) {
      const team = await Team.findById(participant.teamId);
      req.team = team;
      req.isLeader = !!(team && team.leaderId && team.leaderId.toString() === participant._id.toString());
    } else {
      req.team = null;
      req.isLeader = false;
    }

    next();
  } catch (err) {
    // Invalid token: user remains unauthenticated (public)
    next();
  }
}

export function signUserToken(email: string, name?: string): string {
  return jwt.sign({ email: email.toLowerCase().trim(), name }, env.JWT_SECRET, {
    expiresIn: '7d',
  });
}
