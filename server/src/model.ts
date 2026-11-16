// ---------- 领域模型 ----------

export interface Department {
  id: string;
  name: string;
  parentId: string | null;
}

export interface User {
  id: string;
  name: string;
  email: string;
  departmentId: string;
  managerId: string | null;
  active: boolean;
}

export interface SystemInfo {
  id: string;
  name: string;
  description: string;
}

export type TaskStatus = 'PENDING' | 'CONFIRMED' | 'REVOKED' | 'CANCELLED';

export interface TaskEvent {
  at: number;
  actor: string; // userId 或 'system'
  action: string; // CREATED / CONFIRMED / REVOKED / DELEGATED / ESCALATED / REASSIGNED / REMINDED
  detail?: string;
}

export interface ReviewTask {
  id: string;
  campaignId: string;
  subjectUserId: string; // 被复核人
  systemId: string;
  account: string; // 目标系统账号
  permission: string; // 权限/角色
  assigneeId: string; // 当前复核人
  status: TaskStatus;
  assignedAt: number;
  decidedAt?: number;
  decidedBy?: string;
  decisionNote?: string;
  escalationLevel: number; // 已应用到的升级规则层级
  history: TaskEvent[];
}

export type EscalationAction = 'REMIND' | 'ESCALATE_TO_MANAGER' | 'ESCALATE_TO_OWNER';

export interface EscalationRule {
  afterDaysOverdue: number; // 逾期多少天后触发
  action: EscalationAction;
}

export type CampaignStatus = 'DRAFT' | 'ACTIVE' | 'CLOSED';

export interface Campaign {
  id: string;
  name: string;
  quarter: string; // 例如 2026Q4
  ownerId: string;
  status: CampaignStatus;
  createdAt: number;
  startedAt?: number;
  closedAt?: number;
  taskDueDays: number; // 任务复核期限(天)
  dayLengthSeconds: number; // 演示加速器: 1个"复核日"对应的真实秒数
  escalationRules: EscalationRule[];
}

export type JobStatus = 'PENDING' | 'REVOKED' | 'VERIFIED' | 'FAILED';

export interface RevocationJob {
  id: string;
  taskId: string;
  campaignId: string;
  systemId: string;
  account: string;
  permission: string;
  status: JobStatus;
  attempts: number;
  createdAt: number;
  updatedAt: number;
  message?: string;
}

export interface AuditEntry {
  id: number;
  at: number;
  actor: string;
  action: string;
  detail: string;
}

export interface Notification {
  id: number;
  at: number;
  toUserId: string;
  message: string;
  read: boolean;
}
