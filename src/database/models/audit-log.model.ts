import mongoose, { Schema, Document } from 'mongoose';

export interface IAuditLog extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  action: string;
  resource: string;
  resourceId?: string;
  details: any;
  ipAddress: string;
  userAgent: string;
  timestamp: Date;
  status: 'success' | 'failure';
  errorMessage?: string;
}

const auditLogSchema = new Schema<IAuditLog>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    action: {
      type: String,
      required: true,
      enum: [
        'auth.login',
        'auth.logout',
        'auth.token.create',
        'auth.token.revoke',
        'api_key.create',
        'api_key.update',
        'api_key.delete',
        'api_key.rotate',
        'project.create',
        'project.update',
        'project.delete',
        'project.member.add',
        'project.member.remove',
        'user.create',
        'user.update',
        'user.delete',
        'user.suspend',
        'user.activate',
      ],
    },
    resource: {
      type: String,
      required: true,
    },
    resourceId: {
      type: String,
    },
    details: {
      type: Schema.Types.Mixed,
    },
    ipAddress: {
      type: String,
      required: true,
    },
    userAgent: {
      type: String,
      required: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      enum: ['success', 'failure'],
      required: true,
    },
    errorMessage: {
      type: String,
    },
  },
  {
    timestamps: false, // We use timestamp field instead
  }
);

// Indexes
auditLogSchema.index({ userId: 1 });
auditLogSchema.index({ action: 1 });
auditLogSchema.index({ timestamp: -1 });
auditLogSchema.index({ resource: 1, resourceId: 1 });

// TTL index to automatically delete logs after 90 days
auditLogSchema.index({ timestamp: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

export const AuditLog = mongoose.model<IAuditLog>('AuditLog', auditLogSchema);