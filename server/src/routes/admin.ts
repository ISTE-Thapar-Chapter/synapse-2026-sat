import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import mongoose from 'mongoose';
import { requireAuth, requireRole } from '../middleware/roles.js';
import { Account } from '../models/Account.js';
import { Participant } from '../models/Participant.js';
import { Team } from '../models/Team.js';
import { DatasetAssignment } from '../models/DatasetAssignment.js';
import { CompetitionConfig } from '../models/CompetitionConfig.js';
import { AuditLog } from '../models/AuditLog.js';
import { ImportService } from '../services/importService.js';
import { logAudit } from '../services/auditService.js';
import {
  AccountCreateSchema,
  AccountRoleUpdateSchema,
  ManualTeamCreateSchema,
  ToggleRestrictionSchema,
  ToggleDisqualificationSchema,
} from '../schemas/validation.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

const router = Router();
router.use(requireAuth, requireRole(['admin']));

// -------------------------------------------------------------
// Account Management
// -------------------------------------------------------------
router.get('/accounts', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const accounts = await Account.find().sort({ createdAt: -1 });
    return res.json(accounts);
  } catch (err) {
    next(err);
  }
});

router.post('/accounts', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = AccountCreateSchema.parse(req.body);
    const email = parsed.email.toLowerCase().trim();

    const existing = await Account.findOne({ email });
    if (existing) {
      return res.status(400).json({ error: 'An account with this email already exists.' });
    }

    const account = new Account({
      name: parsed.name.trim(),
      email,
      role: parsed.role,
    });
    await account.save();

    await logAudit(req.user!.email, 'ACCOUNT_CREATED', 'Account', account._id.toString(), {
      name: account.name,
      email: account.email,
      role: account.role,
    });

    return res.status(201).json(account);
  } catch (err) {
    next(err);
  }
});

router.patch('/accounts/:id/role', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const parsed = AccountRoleUpdateSchema.parse(req.body);

    const account = await Account.findById(id);
    if (!account) {
      return res.status(404).json({ error: 'Account not found' });
    }

    const previousRole = account.role;
    account.role = parsed.role;
    await account.save();

    await logAudit(req.user!.email, 'ACCOUNT_ROLE_CHANGED', 'Account', account._id.toString(), {
      email: account.email,
      previousRole,
      newRole: parsed.role,
    });

    return res.json(account);
  } catch (err) {
    next(err);
  }
});

// -------------------------------------------------------------
// Participant Management
// -------------------------------------------------------------
router.get('/participants', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { search, college, restricted, hasTeam } = req.query;
    const query: any = {};

    if (search) {
      const regex = new RegExp(String(search), 'i');
      query.$or = [{ firstName: regex }, { lastName: regex }, { email: regex }];
    }

    if (college) {
      query.college = new RegExp(String(college), 'i');
    }

    if (restricted !== undefined) {
      query.restricted = restricted === 'true';
    }

    if (hasTeam === 'true') {
      query.teamId = { $ne: null };
    } else if (hasTeam === 'false') {
      query.teamId = null;
    }

    const participants = await Participant.find(query)
      .populate('teamId', 'teamName disqualified')
      .sort({ createdAt: -1 });

    return res.json(participants);
  } catch (err) {
    next(err);
  }
});

router.patch('/participants/:id/restrict', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const parsed = ToggleRestrictionSchema.parse(req.body);

    const participant = await Participant.findById(id);
    if (!participant) {
      return res.status(404).json({ error: 'Participant not found' });
    }

    const previousState = participant.restricted;
    participant.restricted = parsed.restricted;
    await participant.save();

    await logAudit(
      req.user!.email,
      parsed.restricted ? 'PARTICIPANT_RESTRICTED' : 'PARTICIPANT_UNRESTRICTED',
      'Participant',
      participant._id.toString(),
      {
        participantEmail: participant.email,
        previousState,
        newState: parsed.restricted,
      },
      parsed.reason
    );

    return res.json(participant);
  } catch (err) {
    next(err);
  }
});

// -------------------------------------------------------------
// Team Management
// -------------------------------------------------------------
router.get('/teams', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { search, disqualified } = req.query;
    const query: any = {};

    if (search) {
      query.teamName = new RegExp(String(search), 'i');
    }

    if (disqualified !== undefined) {
      query.disqualified = disqualified === 'true';
    }

    const teams = await Team.find(query)
      .populate('members', 'firstName lastName email role restricted college')
      .populate('leaderId', 'firstName lastName email')
      .sort({ createdAt: -1 });

    return res.json(teams);
  } catch (err) {
    next(err);
  }
});

router.post('/teams/manual', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = ManualTeamCreateSchema.parse(req.body);
    const teamName = parsed.teamName.trim();

    const existingTeam = await Team.findOne({ teamName });
    if (existingTeam) {
      return res.status(400).json({ error: 'A team with this registered name already exists.' });
    }

    const leader = await Participant.findOne({ email: parsed.leaderEmail.toLowerCase().trim() });
    if (!leader) {
      return res.status(400).json({ error: `Leader email ${parsed.leaderEmail} not found among participants.` });
    }

    const memberEmails = Array.from(new Set([parsed.leaderEmail.toLowerCase().trim(), ...parsed.memberEmails.map((e) => e.toLowerCase().trim())]));
    const memberParticipants = await Participant.find({ email: { $in: memberEmails } });
    const memberIds = memberParticipants.map((m) => m._id as mongoose.Types.ObjectId);

    const team = new Team({
      teamName,
      members: memberIds,
      leaderId: leader._id,
      mentorName: parsed.mentorName || null,
      mentorEmail: parsed.mentorEmail || null,
    });
    await team.save();

    // Link participants to team
    for (const m of memberParticipants) {
      m.teamId = team._id as mongoose.Types.ObjectId;
      m.role = m._id.toString() === leader._id.toString() ? 'leader' : 'member';
      await m.save();
    }

    await logAudit(req.user!.email, 'TEAM_MANUALLY_CREATED', 'Team', team._id.toString(), {
      teamName,
      leaderEmail: parsed.leaderEmail,
      membersCount: memberIds.length,
    });

    const populated = await Team.findById(team._id)
      .populate('members')
      .populate('leaderId');

    return res.status(201).json(populated);
  } catch (err) {
    next(err);
  }
});

router.patch('/teams/:id/disqualify', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const parsed = ToggleDisqualificationSchema.parse(req.body);

    const team = await Team.findById(id);
    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }

    const previousState = team.disqualified;
    team.disqualified = parsed.disqualified;
    await team.save();

    await logAudit(
      req.user!.email,
      parsed.disqualified ? 'TEAM_DISQUALIFIED' : 'TEAM_REINSTATED',
      'Team',
      team._id.toString(),
      {
        teamName: team.teamName,
        previousState,
        newState: parsed.disqualified,
      },
      parsed.reason
    );

    return res.json(team);
  } catch (err) {
    next(err);
  }
});

router.post('/teams/:id/members', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { action, participantEmail, newLeaderEmail, reason } = req.body;

    const team = await Team.findById(id);
    if (!team) return res.status(404).json({ error: 'Team not found' });

    if (action === 'set_leader') {
      const leader = await Participant.findOne({ email: newLeaderEmail.toLowerCase().trim() });
      if (!leader) return res.status(400).json({ error: 'Leader participant not found.' });

      team.leaderId = leader._id as mongoose.Types.ObjectId;
      await team.save();

      await Participant.updateMany({ teamId: team._id }, { $set: { role: 'member' } });
      await Participant.findByIdAndUpdate(leader._id, { role: 'leader' });

      await logAudit(req.user!.email, 'TEAM_LEADER_CHANGED', 'Team', team._id.toString(), { newLeaderEmail }, reason);
      return res.json(await Team.findById(team._id).populate('members').populate('leaderId'));
    }

    if (action === 'remove_member') {
      const participant = await Participant.findOne({ email: participantEmail.toLowerCase().trim() });
      if (!participant) return res.status(400).json({ error: 'Participant not found.' });

      // Clear teamId from participant (do not delete participant, as per policy)
      participant.teamId = null;
      participant.role = 'member';
      await participant.save();

      team.members = team.members.filter((m) => m.toString() !== participant._id.toString());
      if (team.leaderId && team.leaderId.toString() === participant._id.toString()) {
        team.leaderId = team.members[0] || null;
        if (team.leaderId) {
          await Participant.findByIdAndUpdate(team.leaderId, { role: 'leader' });
        }
      }
      await team.save();

      await logAudit(req.user!.email, 'TEAM_MEMBER_REMOVED', 'Team', team._id.toString(), { participantEmail }, reason);
      return res.json(await Team.findById(team._id).populate('members').populate('leaderId'));
    }

    if (action === 'add_member') {
      const participant = await Participant.findOne({ email: participantEmail.toLowerCase().trim() });
      if (!participant) return res.status(400).json({ error: 'Participant not found.' });

      // If participant belonged to another team, remove them from previous team
      if (participant.teamId && participant.teamId.toString() !== team._id.toString()) {
        await Team.findByIdAndUpdate(participant.teamId, {
          $pull: { members: participant._id },
        });
      }

      participant.teamId = team._id as mongoose.Types.ObjectId;
      await participant.save();

      const memberStrings = new Set(team.members.map((m) => m.toString()));
      memberStrings.add(participant._id.toString());
      team.members = Array.from(memberStrings).map((id) => new mongoose.Types.ObjectId(id));
      if (!team.leaderId) {
        team.leaderId = participant._id as mongoose.Types.ObjectId;
        participant.role = 'leader';
        await participant.save();
      }
      await team.save();

      await logAudit(req.user!.email, 'TEAM_MEMBER_ADDED', 'Team', team._id.toString(), { participantEmail }, reason);
      return res.json(await Team.findById(team._id).populate('members').populate('leaderId'));
    }

    return res.status(400).json({ error: 'Unknown membership action' });
  } catch (err) {
    next(err);
  }
});

// -------------------------------------------------------------
// Import Workflow (Preview & Confirm)
// -------------------------------------------------------------
router.post('/imports/preview', upload.single('file'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const rows = ImportService.parseBuffer(req.file.buffer, req.file.originalname);
    const preview = await ImportService.preview(rows);

    return res.json({
      fileName: req.file.originalname,
      preview,
      rawRows: rows,
    });
  } catch (err) {
    next(err);
  }
});

router.post('/imports/confirm', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { rows } = req.body;
    if (!rows || !Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ error: 'No valid rows provided for confirmation' });
    }

    const result = await ImportService.confirmImport(rows, req.user!.email);
    return res.json(result);
  } catch (err) {
    next(err);
  }
});

// -------------------------------------------------------------
// Datasets Management
// -------------------------------------------------------------
router.get('/datasets', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { stage } = req.query;
    const query: any = {};
    if (stage) query.stage = stage;

    const datasets = await DatasetAssignment.find(query)
      .populate('assignedTeamId', 'teamName')
      .sort({ createdAt: -1 });

    return res.json(datasets);
  } catch (err) {
    next(err);
  }
});

router.post('/datasets', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { stage, title, description, fileUrl, assignedTeamId, isAvailableToAll } = req.body;
    if (!title || !fileUrl || !stage) {
      return res.status(400).json({ error: 'stage, title, and fileUrl are required' });
    }

    const ds = new DatasetAssignment({
      stage,
      title: title.trim(),
      description: description?.trim() || '',
      fileUrl: fileUrl.trim(),
      assignedTeamId: assignedTeamId ? new mongoose.Types.ObjectId(assignedTeamId) : null,
      isAvailableToAll: !!isAvailableToAll,
    });
    await ds.save();

    await logAudit(req.user!.email, 'DATASET_REGISTERED', 'DatasetAssignment', ds._id.toString(), {
      stage,
      title,
      assignedTeamId,
    });

    return res.status(201).json(ds);
  } catch (err) {
    next(err);
  }
});

// -------------------------------------------------------------
// Audit Logs
// -------------------------------------------------------------
router.get('/audit-logs', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { actor, action, entityType, limit = 100 } = req.query;
    const query: any = {};

    if (actor) query.actorEmail = new RegExp(String(actor), 'i');
    if (action) query.action = String(action);
    if (entityType) query.entityType = String(entityType);

    const logs = await AuditLog.find(query)
      .sort({ timestamp: -1 })
      .limit(Math.min(Number(limit), 200));

    return res.json(logs);
  } catch (err) {
    next(err);
  }
});

// -------------------------------------------------------------
// Competition Dataset & Requirements Configuration
// -------------------------------------------------------------
router.get('/config', async (req: Request, res: Response, next: NextFunction) => {
  try {
    let config = await CompetitionConfig.findOne();
    if (!config) {
      config = await CompetitionConfig.create({});
    }
    return res.json(config);
  } catch (err) {
    next(err);
  }
});

router.patch('/config', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { cleaningDatasetTitle, cleaningDatasetUrl, cleaningDatasetDescription, requirementTitles } = req.body;
    let config = await CompetitionConfig.findOne();
    if (!config) {
      config = new CompetitionConfig({});
    }

    if (cleaningDatasetTitle !== undefined) config.cleaningDatasetTitle = cleaningDatasetTitle;
    if (cleaningDatasetUrl !== undefined) config.cleaningDatasetUrl = cleaningDatasetUrl;
    if (cleaningDatasetDescription !== undefined) config.cleaningDatasetDescription = cleaningDatasetDescription;
    if (Array.isArray(requirementTitles)) config.requirementTitles = requirementTitles;

    await config.save();

    await logAudit(req.user!.email, 'COMPETITION_CONFIG_UPDATED', 'CompetitionConfig', config._id.toString(), {
      cleaningDatasetTitle: config.cleaningDatasetTitle,
      requirementTitles: config.requirementTitles,
    });

    return res.json(config);
  } catch (err) {
    next(err);
  }
});

export default router;
