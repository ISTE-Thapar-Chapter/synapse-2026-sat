import mongoose, { Schema, Document } from 'mongoose';

export interface IAuditLog extends Document {
  actorEmail: string;
  action: string;
  entityType: string;
  entityId?: string;
  details: Record<string, any>;
  reason?: string;
  timestamp: Date;
}

const AuditLogSchema = new Schema<IAuditLog>(
  {
    actorEmail: { type: String, required: true, lowercase: true, trim: true, index: true },
    action: { type: String, required: true, index: true },
    entityType: { type: String, required: true, index: true },
    entityId: { type: String, default: null },
    details: { type: Schema.Types.Mixed, default: {} },
    reason: { type: String, default: null },
    timestamp: { type: Date, default: Date.now, index: true },
  },
  { timestamps: false }
);

export const AuditLog = mongoose.model<IAuditLog>('AuditLog', AuditLogSchema);
