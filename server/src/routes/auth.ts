import { Router, Request, Response, NextFunction } from 'express';
import { OAuth2Client } from 'google-auth-library';
import { env } from '../config/env.js';
import { Account, AccountRole } from '../models/Account.js';
import { Participant } from '../models/Participant.js';
import { Team } from '../models/Team.js';
import { signUserToken } from '../middleware/auth.js';
import { requireAuth } from '../middleware/roles.js';
import { logAudit } from '../services/auditService.js';

const router = Router();
const googleClient = new OAuth2Client(env.GOOGLE_CLIENT_ID);

/**
 * Sole Authentication System: Google Auth.
 * Accepts Google ID token / Credential, verifies identity with Google,
 * matches email against provisioned Google accounts and CSV imported participants,
 * and issues JWT session.
 */
router.post('/google', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { credential, idToken } = req.body;
    const tokenToVerify = credential || idToken;

    if (!tokenToVerify) {
      return res.status(400).json({
        error: 'Google credential is required',
        message: 'No Google authentication token was received from the client.',
      });
    }

    let email = '';
    let name = '';

    // Verify Google ID token
    try {
      const ticket = await googleClient.verifyIdToken({
        idToken: tokenToVerify,
        audience: env.GOOGLE_CLIENT_ID,
      });
      const payload = ticket.getPayload();
      if (!payload || !payload.email) {
        return res.status(400).json({ error: 'Invalid Google credential token' });
      }
      email = payload.email.toLowerCase().trim();
      name = payload.name || email.split('@')[0];
    } catch (tokenErr) {
      // Decode JWT payload strictly for automated unit/integration test suites
      if (env.NODE_ENV === 'test') {
        try {
          const base64Url = tokenToVerify.split('.')[1];
          if (base64Url) {
            const decoded = JSON.parse(Buffer.from(base64Url, 'base64').toString('utf-8'));
            if (decoded.email) {
              email = decoded.email.toLowerCase().trim();
              name = decoded.name || email.split('@')[0];
            }
          }
        } catch (decodeErr) {
          // failed decode
        }
      }

      if (!email) {
        return res.status(401).json({
          error: 'Google authentication failed',
          message: 'Unable to verify Google token. Ensure Google Client ID is configured.',
        });
      }
    }

    // 1. Lookup Account by Google email identifier
    let account = await Account.findOne({ email });

    // 2. Check if email was imported via CSV into Participant records
    const participant = await Participant.findOne({ email });

    if (!account && participant) {
      // Auto-provision Account using CSV imported Google identity
      account = new Account({
        name: name || `${participant.firstName} ${participant.lastName || ''}`.trim(),
        email,
        role: 'public',
      });
      await account.save();
    }

    const role: AccountRole = account ? account.role : 'public';
    const displayName = account ? account.name : name || email.split('@')[0];

    // 3. Resolve Team and Leader status
    let team = null;
    let isLeader = false;

    if (participant && participant.teamId) {
      team = await Team.findById(participant.teamId).populate('members', 'firstName lastName email role restricted');
      if (team && team.leaderId && participant._id) {
        isLeader = team.leaderId.toString() === participant._id.toString();
      }
    }

    // 4. Issue authenticated session token
    const token = signUserToken(email, displayName);

    await logAudit(email, 'GOOGLE_SIGN_IN', 'Account', account?._id?.toString() || null, {
      role,
      hasTeam: !!team,
      isLeader,
    });

    return res.json({
      token,
      user: {
        email,
        name: displayName,
        role,
      },
      participant,
      team,
      isLeader,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * Get current session user details
 */
router.get('/me', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = req.user!;
    const participant = await Participant.findOne({ email: user.email });
    let team = null;
    let isLeader = false;

    if (participant && participant.teamId) {
      team = await Team.findById(participant.teamId).populate('members', 'firstName lastName email role restricted');
      if (team && team.leaderId && participant._id) {
        isLeader = team.leaderId.toString() === participant._id.toString();
      }
    }

    return res.json({
      user,
      participant,
      team,
      isLeader,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
