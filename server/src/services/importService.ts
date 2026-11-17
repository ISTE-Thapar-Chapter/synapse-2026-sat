import { parse as parseCsv } from 'csv-parse/sync';
import * as XLSX from 'xlsx';
import mongoose from 'mongoose';
import { Participant } from '../models/Participant.js';
import { Team } from '../models/Team.js';
import { Account } from '../models/Account.js';
import { logAudit } from './auditService.js';

export interface RawRegistrationRow {
  firstName: string;
  lastName?: string | null;
  email: string;
  college: string;
  teamName?: string | null;
  role?: 'leader' | 'member';
  accountRole?: 'public' | 'evaluator' | 'admin';
  phone?: string | null;
}

export interface ImportError {
  rowNumber: number;
  data: any;
  reason: string;
}

export interface ImportPreviewResult {
  totalRows: number;
  participantsToCreate: Array<{ email: string; name: string; college: string }>;
  participantsToUpdate: Array<{ email: string; changes: string }>;
  teamsToCreate: Array<{ teamName: string; leaderEmail?: string; membersCount: number }>;
  teamsToUpdate: Array<{ teamName: string; changes: string }>;
  googleAuthAccountsToProvision: Array<{ email: string; role: string }>;
  unchangedCount: number;
  errors: ImportError[];
}

export class ImportService {
  /**
   * Parse uploaded buffer into normalized raw rows based on mimeType / extension
   */
  static parseBuffer(buffer: Buffer, fileType: string): any[] {
    const lowerType = fileType.toLowerCase();

    if (lowerType.includes('json')) {
      const parsed = JSON.parse(buffer.toString('utf-8'));
      return Array.isArray(parsed) ? parsed : [parsed];
    }

    if (lowerType.includes('csv') || lowerType.endsWith('.csv')) {
      return parseCsv(buffer, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
      });
    }

    // Excel workbook
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    return XLSX.utils.sheet_to_json(worksheet, { defval: '' });
  }

  /**
   * Normalizes a raw object from export to standard RawRegistrationRow
   */
  static normalizeRow(row: any): { valid: boolean; row?: RawRegistrationRow; error?: string } {
    const keys = Object.keys(row);
    const getVal = (possibleKeys: string[]) => {
      for (const k of keys) {
        const cleanK = k.toLowerCase().replace(/[^a-z0-9]/g, '');
        for (const pk of possibleKeys) {
          if (cleanK === pk.toLowerCase().replace(/[^a-z0-9]/g, '')) {
            return String(row[k] || '').trim();
          }
        }
      }
      return '';
    };

    const email = getVal(['email', 'emailaddress', 'useremail', 'participantemail', 'googleemail']).toLowerCase().trim();
    if (!email || !email.includes('@')) {
      return { valid: false, error: 'Missing or invalid email address' };
    }

    let fullName = getVal(['name', 'fullname', 'participantname']);
    let firstName = getVal(['firstname', 'first']);
    let lastName: string | null = getVal(['lastname', 'last']) || null;

    if (!firstName && fullName) {
      const parts = fullName.split(' ');
      firstName = parts[0];
      lastName = parts.slice(1).join(' ') || null;
    }

    if (!firstName) {
      firstName = email.split('@')[0];
    }

    const college = getVal(['college', 'institute', 'institution', 'university', 'organization']) || 'Independent';
    const teamName = getVal(['teamname', 'team', 'group']) || null;
    const roleRaw = getVal(['role', 'teamrole', 'isleader', 'leader']).toLowerCase();
    const role: 'leader' | 'member' =
      roleRaw.includes('lead') || roleRaw === 'true' || roleRaw === 'yes' || roleRaw === '1' ? 'leader' : 'member';

    const accountRoleRaw = getVal(['accountrole', 'permission', 'systemrole', 'access']).toLowerCase();
    const accountRole: 'public' | 'evaluator' | 'admin' =
      accountRoleRaw === 'admin' ? 'admin' : accountRoleRaw === 'evaluator' ? 'evaluator' : 'public';

    const phone = getVal(['phone', 'contact', 'mobile', 'phonenumber']) || null;

    return {
      valid: true,
      row: {
        firstName,
        lastName: lastName || null,
        email,
        college,
        teamName: teamName || null,
        role,
        accountRole,
        phone,
      },
    };
  }

  /**
   * Dry-run preview of an import
   */
  static async preview(rows: any[]): Promise<ImportPreviewResult> {
    const errors: ImportError[] = [];
    const validRows: RawRegistrationRow[] = [];

    // 1. Normalize rows and validate shape
    rows.forEach((r, idx) => {
      const res = this.normalizeRow(r);
      if (!res.valid || !res.row) {
        errors.push({ rowNumber: idx + 1, data: r, reason: res.error || 'Validation failed' });
      } else {
        validRows.push(res.row);
      }
    });

    const participantsToCreate: Array<{ email: string; name: string; college: string }> = [];
    const participantsToUpdate: Array<{ email: string; changes: string }> = [];
    const googleAuthAccountsToProvision: Array<{ email: string; role: string }> = [];
    let unchangedCount = 0;

    // Check participants & Google Auth accounts
    for (const item of validRows) {
      const existing = await Participant.findOne({ email: item.email });
      if (!existing) {
        participantsToCreate.push({
          email: item.email,
          name: `${item.firstName} ${item.lastName || ''}`.trim(),
          college: item.college,
        });
      } else {
        const changes: string[] = [];
        if (existing.firstName !== item.firstName) changes.push(`First Name (${existing.firstName} -> ${item.firstName})`);
        if (item.lastName && existing.lastName !== item.lastName) changes.push('Last Name');
        if (existing.college !== item.college) changes.push(`College (${existing.college} -> ${item.college})`);
        if (changes.length > 0) {
          participantsToUpdate.push({ email: item.email, changes: changes.join(', ') });
        } else {
          unchangedCount++;
        }
      }

      // Check Account provisioning for Google Auth identifier
      const existingAccount = await Account.findOne({ email: item.email });
      if (!existingAccount) {
        googleAuthAccountsToProvision.push({
          email: item.email,
          role: item.accountRole || 'public',
        });
      }
    }

    // Check teams
    const teamGroups = new Map<string, { leaderEmail?: string; members: string[] }>();
    for (const item of validRows) {
      if (!item.teamName) continue;
      const cleanTeam = item.teamName.trim();
      if (!teamGroups.has(cleanTeam)) {
        teamGroups.set(cleanTeam, { members: [] });
      }
      const g = teamGroups.get(cleanTeam)!;
      g.members.push(item.email);
      if (item.role === 'leader' || !g.leaderEmail) {
        g.leaderEmail = item.email;
      }
    }

    const teamsToCreate: Array<{ teamName: string; leaderEmail?: string; membersCount: number }> = [];
    const teamsToUpdate: Array<{ teamName: string; changes: string }> = [];

    for (const [teamName, data] of teamGroups.entries()) {
      const existingTeam = await Team.findOne({ teamName }).populate('members');
      if (!existingTeam) {
        teamsToCreate.push({
          teamName,
          leaderEmail: data.leaderEmail,
          membersCount: data.members.length,
        });
      } else {
        teamsToUpdate.push({
          teamName,
          changes: `Roster sync: ${data.members.length} imported members`,
        });
      }
    }

    return {
      totalRows: rows.length,
      participantsToCreate,
      participantsToUpdate,
      teamsToCreate,
      teamsToUpdate,
      googleAuthAccountsToProvision,
      unchangedCount,
      errors,
    };
  }

  /**
   * Apply validated import transactionally / idempotently.
   * All emails are saved as Account records to act as Google Auth identifiers.
   */
  static async confirmImport(
    rows: any[],
    adminEmail: string
  ): Promise<{
    createdParticipants: number;
    updatedParticipants: number;
    createdTeams: number;
    updatedTeams: number;
    provisionedGoogleAccounts: number;
    errors: ImportError[];
  }> {
    const preview = await this.preview(rows);
    if (preview.errors.length > 0 && preview.totalRows === preview.errors.length) {
      throw new Error('All rows failed validation. Cannot proceed with import.');
    }

    const validRows: RawRegistrationRow[] = [];
    rows.forEach((r, idx) => {
      const res = this.normalizeRow(r);
      if (res.valid && res.row) {
        validRows.push(res.row);
      }
    });

    let createdParticipants = 0;
    let updatedParticipants = 0;
    let createdTeams = 0;
    let updatedTeams = 0;
    let provisionedGoogleAccounts = 0;

    // 1. Upsert Participants & Google Auth Accounts
    const participantMap = new Map<string, mongoose.Types.ObjectId>();

    for (const row of validRows) {
      // A. Participant record
      let p = await Participant.findOne({ email: row.email });
      if (!p) {
        p = new Participant({
          firstName: row.firstName,
          lastName: row.lastName,
          email: row.email,
          college: row.college,
          role: row.role || 'member',
          phone: row.phone,
        });
        await p.save();
        createdParticipants++;
      } else {
        p.firstName = row.firstName;
        if (row.lastName !== undefined) p.lastName = row.lastName;
        p.college = row.college;
        if (row.phone) p.phone = row.phone;
        await p.save();
        updatedParticipants++;
      }
      participantMap.set(row.email, p._id as mongoose.Types.ObjectId);

      // B. Save email as Google Auth Identifier in Account model
      let acc = await Account.findOne({ email: row.email });
      const fullName = `${row.firstName} ${row.lastName || ''}`.trim();
      const accountRole = row.accountRole || 'public';

      if (!acc) {
        acc = new Account({
          name: fullName,
          email: row.email,
          role: accountRole,
        });
        await acc.save();
        provisionedGoogleAccounts++;
      } else {
        // Update display name if changed
        if (acc.name !== fullName && fullName) {
          acc.name = fullName;
          await acc.save();
        }
      }
    }

    // 2. Group teams
    const teamGroups = new Map<string, { leaderEmail: string; memberEmails: Set<string> }>();
    for (const row of validRows) {
      if (!row.teamName) continue;
      const tName = row.teamName.trim();
      if (!teamGroups.has(tName)) {
        teamGroups.set(tName, { leaderEmail: row.email, memberEmails: new Set() });
      }
      const tg = teamGroups.get(tName)!;
      tg.memberEmails.add(row.email);
      if (row.role === 'leader') {
        tg.leaderEmail = row.email;
      }
    }

    // 3. Upsert Teams and link relationships
    for (const [teamName, info] of teamGroups.entries()) {
      let team = await Team.findOne({ teamName });
      const memberIds = Array.from(info.memberEmails)
        .map((e) => participantMap.get(e))
        .filter(Boolean) as mongoose.Types.ObjectId[];
      const leaderId = participantMap.get(info.leaderEmail) || memberIds[0];

      if (!team) {
        team = new Team({
          teamName,
          members: memberIds,
          leaderId,
        });
        await team.save();
        createdTeams++;
      } else {
        // Idempotent union of members
        const currentMemberStrings = new Set(team.members.map((m) => m.toString()));
        memberIds.forEach((id) => currentMemberStrings.add(id.toString()));
        team.members = Array.from(currentMemberStrings).map((id) => new mongoose.Types.ObjectId(id));
        if (!team.leaderId || (info.leaderEmail && leaderId)) {
          team.leaderId = leaderId;
        }
        await team.save();
        updatedTeams++;
      }

      // Update Participant teamId references and leader role
      for (const mId of team.members) {
        const isLeader = team.leaderId && team.leaderId.toString() === mId.toString();
        await Participant.findByIdAndUpdate(mId, {
          teamId: team._id,
          role: isLeader ? 'leader' : 'member',
        });
      }
    }

    await logAudit(adminEmail, 'IMPORT_REGISTRATIONS_CONFIRMED', 'Import', null, {
      totalRows: rows.length,
      createdParticipants,
      updatedParticipants,
      createdTeams,
      updatedTeams,
      provisionedGoogleAccounts,
      errorCount: preview.errors.length,
    });

    return {
      createdParticipants,
      updatedParticipants,
      createdTeams,
      updatedTeams,
      provisionedGoogleAccounts,
      errors: preview.errors,
    };
  }
}
