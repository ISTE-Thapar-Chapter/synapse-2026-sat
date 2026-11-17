import { AuditLog } from '../models/AuditLog.js';

export async function logAudit(
  actorEmail: string,
  action: string,
  entityType: string,
  entityId: string | null = null,
  details: Record<string, any> = {},
  reason: string | null = null
) {
  try {
    const log = new AuditLog({
      actorEmail: actorEmail.toLowerCase(),
      action,
      entityType,
      entityId,
      details,
      reason,
      timestamp: new Date(),
    });
    await log.save();
    return log;
  } catch (err) {
    console.error('[AuditService] Failed to record audit log:', err);
    // Audit failure should not break operation, but log clearly
    return null;
  }
}
