import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import mongoose from 'mongoose';
import { requireAuth, requireRole } from '../middleware/roles.js';
import { Account } from '../models/Account.js';
import { Participant } from '../models/Participant.js';
import { Team } from '../models/Team.js';
import { Submission } from '../models/Submission.js';
import { Evaluation } from '../models/Evaluation.js';
import { LeaderboardSnapshot } from '../models/LeaderboardSnapshot.js';
import { CompanyAssignment } from '../models/CompanyAssignment.js';
import { DatasetAssignment } from '../models/DatasetAssignment.js';
import { CompetitionConfig } from '../models/CompetitionConfig.js';
import { EventStage } from '../models/EventStage.js';
import { AuditLog } from '../models/AuditLog.js';
import { QuizSubmission } from '../models/QuizSubmission.js';
import { QuizScore } from '../models/QuizScore.js';
import { ImportService } from '../services/importService.js';
import { logAudit } from '../services/auditService.js';
import { LeaderboardService } from '../services/leaderboardService.js';
import {
  AccountCreateSchema,
  AccountRoleUpdateSchema,
  ManualTeamCreateSchema,
  TeamUpdateSchema,
  ToggleRestrictionSchema,
  ToggleDisqualificationSchema,
  WinnersAnnouncementToggleSchema,
} from '../schemas/validation.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

const router = Router();
router.use(requireAuth);

const requireAdmin = requireRole(['admin']);
const requireAdminOrDesk = requireRole(['admin', 'desk']);

// -------------------------------------------------------------
// Account Management (Admins Only)
// -------------------------------------------------------------
router.get('/accounts', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const accounts = await Account.find().sort({ createdAt: -1 });
    return res.json(accounts);
  } catch (err) {
    next(err);
  }
});

router.post('/accounts', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = AccountCreateSchema.parse(req.body);
    const email = parsed.email.toLowerCase().trim();

    let account = await Account.findOne({ email });
    let isNew = false;
    if (account) {
      account.name = parsed.name.trim();
      account.role = parsed.role;
      await account.save();
    } else {
      isNew = true;
      account = new Account({
        name: parsed.name.trim(),
        email,
        role: parsed.role,
      });
      await account.save();
    }

    await logAudit(
      req.user!.email,
      isNew ? 'ACCOUNT_CREATED' : 'ACCOUNT_ROLE_UPDATED',
      'Account',
      account._id.toString(),
      {
        name: account.name,
        email: account.email,
        role: account.role,
      }
    );

    return res.status(isNew ? 201 : 200).json({
      account,
      ...account.toObject(),
    });
  } catch (err) {
    next(err);
  }
});

router.patch('/accounts/:id/role', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
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
router.get('/participants', requireAdminOrDesk, async (req: Request, res: Response, next: NextFunction) => {
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

router.patch('/participants/:id/restrict', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
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
// Team Management (Admins & Registration Desk)
// -------------------------------------------------------------
router.get('/teams', requireAdminOrDesk, async (req: Request, res: Response, next: NextFunction) => {
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

router.post('/teams/manual', requireAdminOrDesk, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = ManualTeamCreateSchema.parse(req.body);
    const teamName = parsed.teamName.trim();
    const leaderName = parsed.leaderName.trim();
    const leaderEmail = parsed.leaderEmail.toLowerCase().trim();
    const college = (parsed.college || 'Independent').trim();

    // 1. Team name uniqueness check (case-insensitive)
    const escapedTeamName = teamName.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
    const existingTeam = await Team.findOne({ teamName: { $regex: new RegExp(`^${escapedTeamName}$`, 'i') } });
    if (existingTeam) {
      return res.status(400).json({ error: `A team named "${existingTeam.teamName}" already exists.` });
    }

    // 2. Normalize and gather all team members with names and emails
    const memberMap = new Map<string, string>(); // email -> name

    // From parsed.members ([{ name, email }])
    if (Array.isArray(parsed.members)) {
      for (const m of parsed.members) {
        const memEmail = m.email.toLowerCase().trim();
        const memName = m.name.trim();
        if (memEmail && memEmail !== leaderEmail) {
          memberMap.set(memEmail, memName);
        }
      }
    }

    // From fallback arrays if provided
    const rawEmails = [
      ...(parsed.participantEmails || []),
      ...(parsed.memberEmails || []),
    ];
    for (const em of rawEmails) {
      const memEmail = em.toLowerCase().trim();
      if (memEmail && memEmail !== leaderEmail && !memberMap.has(memEmail)) {
        const defaultName = memEmail.split('@')[0].replace(/[._-]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
        memberMap.set(memEmail, defaultName);
      }
    }

    const memberEmails = Array.from(memberMap.keys());

    // 3. Check if leader or any participant is already linked to another active team
    const allEmails = [leaderEmail, ...memberEmails];
    const conflictingParticipants = await Participant.find({
      email: { $in: allEmails },
      teamId: { $ne: null },
    }).populate('teamId', 'teamName');

    if (conflictingParticipants.length > 0) {
      const conflictList = conflictingParticipants
        .map((p) => `${p.email} (already in team "${(p.teamId as any)?.teamName || 'another team'}")`)
        .join(', ');
      return res.status(400).json({
        error: `Cannot assign participants who already belong to a team: ${conflictList}`,
      });
    }

    // 4. Parse leader name
    const leaderParts = leaderName.split(' ');
    const leaderFirstName = leaderParts[0];
    const leaderLastName = leaderParts.length > 1 ? leaderParts.slice(1).join(' ') : null;

    // 5. Upsert Account & Participant for Leader
    let leaderAccount = await Account.findOne({ email: leaderEmail });
    if (!leaderAccount) {
      leaderAccount = new Account({
        name: leaderName,
        email: leaderEmail,
        role: 'public',
      });
      await leaderAccount.save();
    } else {
      leaderAccount.name = leaderName;
      await leaderAccount.save();
    }

    let leaderParticipant = await Participant.findOne({ email: leaderEmail });
    if (!leaderParticipant) {
      leaderParticipant = new Participant({
        firstName: leaderFirstName,
        lastName: leaderLastName,
        email: leaderEmail,
        college,
        role: 'leader',
      });
      await leaderParticipant.save();
    } else {
      leaderParticipant.firstName = leaderFirstName;
      leaderParticipant.lastName = leaderLastName;
      leaderParticipant.college = college || leaderParticipant.college;
      leaderParticipant.role = 'leader';
      await leaderParticipant.save();
    }

    // 6. Upsert Account & Participant for each member
    const memberParticipantIds: mongoose.Types.ObjectId[] = [leaderParticipant._id as mongoose.Types.ObjectId];

    for (const [memEmail, memName] of memberMap.entries()) {
      const parts = memName.split(' ');
      const firstName = parts[0];
      const lastName = parts.length > 1 ? parts.slice(1).join(' ') : null;

      let memAccount = await Account.findOne({ email: memEmail });
      if (!memAccount) {
        memAccount = new Account({
          name: memName,
          email: memEmail,
          role: 'public',
        });
        await memAccount.save();
      } else {
        memAccount.name = memName;
        await memAccount.save();
      }

      let memParticipant = await Participant.findOne({ email: memEmail });
      if (!memParticipant) {
        memParticipant = new Participant({
          firstName,
          lastName,
          email: memEmail,
          college,
          role: 'member',
        });
        await memParticipant.save();
      } else {
        memParticipant.firstName = firstName;
        memParticipant.lastName = lastName;
        memParticipant.college = college || memParticipant.college;
        memParticipant.role = 'member';
        await memParticipant.save();
      }

      memberParticipantIds.push(memParticipant._id as mongoose.Types.ObjectId);
    }

    // 7. Create the Team
    const team = new Team({
      teamName,
      members: memberParticipantIds,
      leaderId: leaderParticipant._id,
      mentorName: parsed.mentorName || null,
      mentorEmail: parsed.mentorEmail || null,
    });
    await team.save();

    // 8. Associate teamId on all participants
    await Participant.updateMany(
      { _id: { $in: memberParticipantIds } },
      { $set: { teamId: team._id } }
    );

    // 9. Audit Log
    await logAudit(req.user!.email, 'TEAM_MANUALLY_CREATED', 'Team', team._id.toString(), {
      teamName,
      leaderName,
      leaderEmail,
      participantCount: memberParticipantIds.length,
      members: Array.from(memberMap.entries()).map(([email, name]) => ({ email, name })),
    });

    const populatedTeam = await Team.findById(team._id)
      .populate('members', 'firstName lastName email role college restricted')
      .populate('leaderId', 'firstName lastName email');

    return res.status(201).json({
      message: 'Team and participant accounts created successfully.',
      team: populatedTeam,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * Update team details: name, college, leader, and members (edit names/emails, add or remove members)
 * Accessible by: admin, desk
 */
router.put('/teams/:id', requireAdminOrDesk, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const parsed = TeamUpdateSchema.parse(req.body);

    const team = await Team.findById(id).populate('members');
    if (!team) {
      return res.status(404).json({ error: 'Team not found', message: 'Team does not exist.' });
    }

    const previousTeamName = team.teamName;
    const newTeamName = parsed.teamName.trim();
    const college = (parsed.college || 'Independent').trim();

    // 1. Check team name uniqueness if changed
    if (newTeamName.toLowerCase() !== previousTeamName.toLowerCase()) {
      const escapedTeamName = newTeamName.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
      const conflict = await Team.findOne({
        _id: { $ne: team._id },
        teamName: { $regex: new RegExp(`^${escapedTeamName}$`, 'i') },
      });
      if (conflict) {
        return res.status(400).json({ error: `A team named "${conflict.teamName}" already exists.` });
      }
    }

    // 2. Validate member emails: check internal duplicates in payload
    const emailSet = new Set<string>();
    for (const m of parsed.members) {
      const em = m.email.toLowerCase().trim();
      if (emailSet.has(em)) {
        return res.status(400).json({ error: `Duplicate email "${em}" specified in member list.` });
      }
      emailSet.add(em);
    }

    const allNewEmails = Array.from(emailSet);

    // 3. Check conflict with other teams
    const conflicting = await Participant.find({
      email: { $in: allNewEmails },
      teamId: { $ne: null, $nin: [team._id] },
    }).populate('teamId', 'teamName');

    if (conflicting.length > 0) {
      const conflictNames = conflicting
        .map((p) => `${p.email} (in "${(p.teamId as any)?.teamName || 'another team'}")`)
        .join(', ');
      return res.status(400).json({
        error: `Cannot assign participants who already belong to another team: ${conflictNames}`,
      });
    }

    // 4. Resolve who the leader is
    let designatedLeaderEmail = parsed.leaderEmail?.toLowerCase().trim();
    if (!designatedLeaderEmail) {
      const explicitLeader = parsed.members.find((m) => m.role === 'leader');
      if (explicitLeader) {
        designatedLeaderEmail = explicitLeader.email.toLowerCase().trim();
      } else {
        designatedLeaderEmail = parsed.members[0].email.toLowerCase().trim();
      }
    }

    // 5. Upsert Participant and Account for each member in the new list
    const updatedMemberIds: mongoose.Types.ObjectId[] = [];
    let leaderParticipantId: mongoose.Types.ObjectId | null = null;

    for (const m of parsed.members) {
      const em = m.email.toLowerCase().trim();
      const isLeader = em === designatedLeaderEmail;
      const memName = m.name.trim();
      const parts = memName.split(' ');
      const firstName = parts[0];
      const lastName = parts.length > 1 ? parts.slice(1).join(' ') : null;

      // Upsert Participant
      let p = await Participant.findOne({ email: em });
      if (!p) {
        p = new Participant({
          firstName,
          lastName,
          email: em,
          college,
          teamId: team._id,
          role: isLeader ? 'leader' : 'member',
        });
        await p.save();
      } else {
        p.firstName = firstName;
        p.lastName = lastName;
        p.college = college || p.college;
        p.teamId = team._id as mongoose.Types.ObjectId;
        p.role = isLeader ? 'leader' : 'member';
        await p.save();
      }

      // Upsert Account for Google login identity
      let acc = await Account.findOne({ email: em });
      if (!acc) {
        acc = new Account({
          name: memName,
          email: em,
          role: 'public',
        });
        await acc.save();
      } else {
        if (acc.name !== memName) {
          acc.name = memName;
          await acc.save();
        }
      }

      updatedMemberIds.push(p._id as mongoose.Types.ObjectId);
      if (isLeader) {
        leaderParticipantId = p._id as mongoose.Types.ObjectId;
      }
    }

    // Fallback if leaderParticipantId was not matched
    if (!leaderParticipantId && updatedMemberIds.length > 0) {
      leaderParticipantId = updatedMemberIds[0];
      await Participant.findByIdAndUpdate(leaderParticipantId, { role: 'leader' });
    }

    // 6. Handle removed members (participants previously in team but not in the new member list)
    const updatedMemberIdStrs = new Set(updatedMemberIds.map((id) => id.toString()));
    const previousMemberIds = (team.members || []).map((m: any) => (m._id || m).toString());

    for (const prevId of previousMemberIds) {
      if (!updatedMemberIdStrs.has(prevId)) {
        await Participant.findByIdAndUpdate(prevId, {
          teamId: null,
          role: 'member',
        });
      }
    }

    // 7. Update the Team record
    team.teamName = newTeamName;
    team.members = updatedMemberIds;
    team.leaderId = leaderParticipantId;
    if (parsed.mentorName !== undefined) team.mentorName = parsed.mentorName;
    if (parsed.mentorEmail !== undefined) team.mentorEmail = parsed.mentorEmail || null;
    await team.save();

    // 8. Propagate teamName update to other collections if renamed
    if (newTeamName !== previousTeamName) {
      await QuizSubmission.updateMany({ teamId: team._id }, { $set: { teamName: newTeamName } });
      await QuizScore.updateMany({ teamId: team._id }, { $set: { teamName: newTeamName } });
    }

    // 9. Audit Log
    await logAudit(req.user!.email, 'TEAM_UPDATED', 'Team', team._id.toString(), {
      previousTeamName,
      newTeamName,
      memberCount: updatedMemberIds.length,
      leaderEmail: designatedLeaderEmail,
      members: parsed.members.map((m) => ({ name: m.name, email: m.email })),
    });

    const populatedTeam = await Team.findById(team._id)
      .populate('members', 'firstName lastName email role college restricted')
      .populate('leaderId', 'firstName lastName email');

    return res.json({
      message: 'Team updated successfully.',
      team: populatedTeam,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * Permanently delete team, all linked member participants & public accounts, and all scores/submissions
 */
router.delete('/teams/:id', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const team = await Team.findById(id);
    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }

    const teamName = team.teamName;

    // 1. Gather all participants associated with this team
    const participants = await Participant.find({
      $or: [{ teamId: team._id }, { _id: { $in: team.members } }],
    });
    const participantIds = participants.map((p) => p._id);
    const participantEmails = participants.map((p) => p.email.toLowerCase().trim());

    // 2. Delete the Team record
    await Team.findByIdAndDelete(team._id);

    // 3. Delete Participant records
    const delParticipants = await Participant.deleteMany({ _id: { $in: participantIds } });

    // 4. Delete Google Auth Account records for participants (only public role, preserving admin/evaluator)
    const delAccounts = await Account.deleteMany({
      email: { $in: participantEmails },
      role: 'public',
    });

    // 5. Delete Submissions by this team
    const delSubmissions = await Submission.deleteMany({ teamId: team._id });

    // 6. Delete Evaluations / Scores for this team
    const delEvaluations = await Evaluation.deleteMany({ targetTeamId: team._id });

    // 7. Delete Dataset Assignments
    await DatasetAssignment.deleteMany({ teamId: team._id });

    // 8. Pull from published Leaderboard snapshots
    await LeaderboardSnapshot.updateMany(
      {},
      { $pull: { entries: { teamId: team._id } } }
    );

    // 9. Pull from published Company assignments
    await CompanyAssignment.updateMany(
      {},
      { $pull: { assignments: { teamId: team._id } } }
    );

    // 10. Audit Log
    await logAudit(
      req.user!.email,
      'TEAM_DELETED',
      'Team',
      team._id.toString(),
      {
        teamName,
        deletedParticipantsCount: delParticipants.deletedCount,
        deletedAccountsCount: delAccounts.deletedCount,
        deletedSubmissionsCount: delSubmissions.deletedCount,
        deletedEvaluationsCount: delEvaluations.deletedCount,
        participantEmails,
      }
    );

    return res.json({
      message: `Team "${teamName}", its ${delParticipants.deletedCount} members, and all associated submissions and scores were permanently deleted.`,
      deletedTeamId: team._id,
      deletedParticipantsCount: delParticipants.deletedCount,
      deletedAccountsCount: delAccounts.deletedCount,
      deletedSubmissionsCount: delSubmissions.deletedCount,
      deletedEvaluationsCount: delEvaluations.deletedCount,
    });
  } catch (err) {
    next(err);
  }
});

router.patch('/teams/:id/disqualify', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
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

router.post('/teams/:id/members', requireAdminOrDesk, async (req: Request, res: Response, next: NextFunction) => {
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
// Import Workflow (Preview & Confirm) (Admins Only)
// -------------------------------------------------------------
router.post('/imports/preview', requireAdmin, upload.single('file'), async (req: Request, res: Response, next: NextFunction) => {
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

router.post('/imports/confirm', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
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
// Datasets Management (Admins Only)
// -------------------------------------------------------------
router.get('/datasets', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
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

router.post('/datasets', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
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
// Audit Logs (Admins Only)
// -------------------------------------------------------------
router.get('/audit-logs', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
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
// Competition Dataset & Requirements Configuration (Admins Only)
// -------------------------------------------------------------
router.get('/config', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
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

router.patch('/config', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      cleaningDatasetTitle,
      cleaningDatasetUrl,
      cleaningDatasetDescription,
      requirementTitles,
      featureDefinitions,
      leaderboardVisible,
      quizMultiplier,
    } = req.body;
    let config = await CompetitionConfig.findOne();
    if (!config) {
      config = new CompetitionConfig({});
    }

    if (cleaningDatasetTitle !== undefined) config.cleaningDatasetTitle = cleaningDatasetTitle;
    if (cleaningDatasetUrl !== undefined) config.cleaningDatasetUrl = cleaningDatasetUrl;
    if (cleaningDatasetDescription !== undefined) config.cleaningDatasetDescription = cleaningDatasetDescription;
    if (Array.isArray(featureDefinitions)) {
      config.featureDefinitions = featureDefinitions;
      config.requirementTitles = featureDefinitions.map((f: any) => f.title);
    } else if (Array.isArray(requirementTitles)) {
      config.requirementTitles = requirementTitles;
    }
    if (typeof leaderboardVisible === 'boolean') config.leaderboardVisible = leaderboardVisible;
    if (typeof quizMultiplier === 'number') config.quizMultiplier = quizMultiplier;
    if (typeof req.body.finalSubmissionOpen === 'boolean') config.finalSubmissionOpen = req.body.finalSubmissionOpen;
    if (req.body.auctionCompanies !== undefined) config.auctionCompanies = req.body.auctionCompanies;

    await config.save();

    await logAudit(req.user!.email, 'COMPETITION_CONFIG_UPDATED', 'CompetitionConfig', config._id.toString(), {
      cleaningDatasetTitle: config.cleaningDatasetTitle,
      requirementTitles: config.requirementTitles,
      leaderboardVisible: config.leaderboardVisible,
      quizMultiplier: config.quizMultiplier,
    });

    return res.json(config);
  } catch (err) {
    next(err);
  }
});

router.post('/config/leaderboard-visibility', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { visible } = req.body;
    let config = await CompetitionConfig.findOne();
    if (!config) config = await CompetitionConfig.create({});

    config.leaderboardVisible = typeof visible === 'boolean' ? visible : !config.leaderboardVisible;
    await config.save();

    await logAudit(req.user!.email, 'LEADERBOARD_VISIBILITY_TOGGLED', 'CompetitionConfig', config._id.toString(), {
      leaderboardVisible: config.leaderboardVisible,
    });

    return res.json({
      message: `Leaderboard visibility is now ${config.leaderboardVisible ? 'visible' : 'hidden'}.`,
      leaderboardVisible: config.leaderboardVisible,
    });
  } catch (err) {
    next(err);
  }
});

router.post('/config/final-submission-toggle', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { open } = req.body;
    let config = await CompetitionConfig.findOne();
    if (!config) config = await CompetitionConfig.create({});

    config.finalSubmissionOpen = typeof open === 'boolean' ? open : !config.finalSubmissionOpen;

    // When final pitch is opened, bidding is emptied and live auction is cleared
    if (config.finalSubmissionOpen) {
      config.liveAuction = {
        activeItem: null,
        status: 'idle',
        currentBid: 0,
        highestBidderTeamId: null,
        highestBidderTeamName: null,
        bidHistory: [],
      };
    }

    await config.save();

    await logAudit(req.user!.email, 'FINAL_SUBMISSION_TOGGLED', 'CompetitionConfig', config._id.toString(), {
      finalSubmissionOpen: config.finalSubmissionOpen,
      auctionEmptied: config.finalSubmissionOpen,
    });

    return res.json({
      message: `Final pitch submissions are now ${config.finalSubmissionOpen ? 'open' : 'closed'}.`,
      finalSubmissionOpen: config.finalSubmissionOpen,
      liveAuction: config.liveAuction,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * Announce or update competition winners (Ranked 1, 2, 3)
 */
router.post('/config/winners-toggle', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = WinnersAnnouncementToggleSchema.parse(req.body);
    let config = await CompetitionConfig.findOne();
    if (!config) config = await CompetitionConfig.create({});

    const isAnnounced = typeof parsed.announced === 'boolean'
      ? parsed.announced
      : !(config.winnersAnnouncement?.announced);

    let resolvedWinners = parsed.winners;
    if (isAnnounced && (!resolvedWinners || resolvedWinners.length === 0)) {
      // Auto-resolve top 3 from leaderboard if none provided
      const live = await LeaderboardService.calculateLiveLeaderboard();
      const top3 = (live.entries || []).slice(0, 3);
      resolvedWinners = top3.map((entry: any, idx: number) => ({
        rank: (idx + 1) as 1 | 2 | 3,
        teamId: entry.teamId.toString(),
        teamName: entry.teamName,
        college: entry.college || '',
        score: entry.score || 0,
        prizeTitle: idx === 0 ? 'Synapse 2026 Champion' : idx === 1 ? 'First Runner Up' : 'Second Runner Up',
      }));
    }

    config.winnersAnnouncement = {
      announced: isAnnounced,
      announcedAt: isAnnounced ? (config.winnersAnnouncement?.announcedAt || new Date()) : null,
      winners: (resolvedWinners || []).map((w) => ({
        rank: w.rank as 1 | 2 | 3,
        teamId: new mongoose.Types.ObjectId(w.teamId),
        teamName: w.teamName,
        college: w.college || '',
        score: w.score || 0,
        prizeTitle: w.prizeTitle || '',
      })),
    };
    config.markModified('winnersAnnouncement');
    await config.save();

    await logAudit(req.user!.email, 'WINNERS_ANNOUNCEMENT_TOGGLED', 'CompetitionConfig', config._id.toString(), {
      announced: isAnnounced,
      winnersCount: config.winnersAnnouncement.winners.length,
    });

    return res.json({
      message: isAnnounced ? 'Winners have been announced and published to all attendees!' : 'Winners announcement has been hidden.',
      winnersAnnouncement: config.winnersAnnouncement,
    });
  } catch (err) {
    next(err);
  }
});

// -------------------------------------------------------------
// Global Event Start / Pause Controls
// -------------------------------------------------------------
router.post('/event/start', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    let config = await CompetitionConfig.findOne();
    if (!config) {
      config = new CompetitionConfig({});
    }
    config.isEventStarted = true;
    config.eventStartedAt = new Date();
    await config.save();

    await EventStage.updateMany({}, { $set: { active: false } });
    await EventStage.findOneAndUpdate(
      { stageId: 'cleaning' },
      { $set: { active: true, reason: 'Event officially started by admin', updatedBy: req.user!.email } },
      { upsert: true }
    );

    await logAudit(req.user!.email, 'EVENT_STARTED', 'CompetitionConfig', config._id.toString(), {
      startedAt: config.eventStartedAt,
    });

    return res.json({
      message: 'Event successfully started.',
      config,
    });
  } catch (err) {
    next(err);
  }
});

router.post('/event/pause', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    let config = await CompetitionConfig.findOne();
    if (!config) {
      config = new CompetitionConfig({});
    }
    config.isEventStarted = false;
    await config.save();

    await logAudit(req.user!.email, 'EVENT_PAUSED', 'CompetitionConfig', config._id.toString(), {});

    return res.json({
      message: 'Event paused.',
      config,
    });
  } catch (err) {
    next(err);
  }
});

export default router;