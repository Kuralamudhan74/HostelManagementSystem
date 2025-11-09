import { AuditLog, IAuditLog } from '../models';
import { IUser } from '../models';

export interface AuditLogData {
  actorId?: string | 'system'; // Optional, can be user ID or "system"
  actorRole?: 'admin' | 'tenant' | 'system';
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
export const logAction = async (
  user: IUser,
  tableName: string,
  recordId: string,
  actionType: 'create' | 'update' | 'delete',
  beforeData?: any,
  afterData?: any
): Promise<IAuditLog> => {
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
