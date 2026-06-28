import prisma from '@/lib/db/prisma';

/** Log an action in the audit_log table. Fire-and-forget — errors are silenced. */
export async function auditLog(params: {
  user_id: number;
  action: 'create' | 'update' | 'delete';
  table_name: string;
  row_id: number | string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
}) {
  try {
    await prisma.audit_log.create({
      data: {
        user_id: params.user_id,
        action: params.action,
        table_name: params.table_name,
        row_id: String(params.row_id),
        before_json: params.before ? JSON.parse(JSON.stringify(params.before)) : undefined,
        after_json: params.after ? JSON.parse(JSON.stringify(params.after)) : undefined,
      },
    });
  } catch {
    // Silently fail — audit is not critical-path
  }
}
