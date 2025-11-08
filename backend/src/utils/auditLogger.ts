import { AuditLog, IAuditLog } from '../models';
import { IUser } from '../models';

export interface AuditLogData {
  actorId: string;
  actorRole: 'admin' | 'tenant';
  tableName: string;
  recordId: string;
  actionType: 'create' | 'update' | 'delete';
  beforeJson?: any;
  afterJson?: any;
}

// Create audit log entry
export const createAuditLog = async (data: AuditLogData): Promise<IAuditLog> => {
  const auditLog = new AuditLog({
    actorId: data.actorId,
    actorRole: data.actorRole,
    tableName: data.tableName,
    recordId: data.recordId,
    actionType: data.actionType,
    beforeJson: data.beforeJson,
    afterJson: data.afterJson
  });

  return await auditLog.save();
};

// Helper function to create audit log from user context
// If user is not provided, logs as "system" (for API key authentication)
export const logAction = async (
  user: IUser | null | undefined,
  tableName: string,
  recordId: string,
  actionType: 'create' | 'update' | 'delete',
  beforeData?: any,
  afterData?: any
): Promise<IAuditLog | null> => {
  // If no user is provided (API key auth), use system identifier
  if (!user) {
    try {
      return createAuditLog({
        actorId: 'system',
        actorRole: 'admin',
        tableName,
        recordId,
        actionType,
        beforeJson: beforeData,
        afterJson: afterData
      });
    } catch (error) {
      console.error('Failed to create audit log:', error);
      return null;
    }
  }

  return createAuditLog({
    actorId: user._id,
    actorRole: user.role,
    tableName,
    recordId,
    actionType,
    beforeJson: beforeData,
    afterJson: afterData
  });
};

// Get audit logs for a specific record
export const getAuditLogs = async (
  tableName: string,
  recordId: string,
  limit: number = 50
): Promise<IAuditLog[]> => {
  return AuditLog.find({
    tableName,
    recordId
  })
    .populate('actorId', 'firstName lastName email')
    .sort({ createdAt: -1 })
    .limit(limit);
};

// Get audit logs for a user
export const getUserAuditLogs = async (
  userId: string,
  limit: number = 50
): Promise<IAuditLog[]> => {
  return AuditLog.find({
    actorId: userId
  })
    .populate('actorId', 'firstName lastName email')
    .sort({ createdAt: -1 })
    .limit(limit);
};
