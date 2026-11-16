import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

const BASE = location.port === '4200' ? 'http://localhost:3000' : '';

export interface User {
  id: string; name: string; email: string; departmentId: string;
  managerId: string | null; active: boolean;
  managerName?: string; departmentName?: string;
}
export interface Department { id: string; name: string; parentId: string | null; }
export interface SystemInfo { id: string; name: string; description: string; }
export interface EscalationRule { afterDaysOverdue: number; action: 'REMIND' | 'ESCALATE_TO_MANAGER' | 'ESCALATE_TO_OWNER'; }
export interface Campaign {
  id: string; name: string; quarter: string; ownerId: string;
  status: 'DRAFT' | 'ACTIVE' | 'CLOSED';
  createdAt: number; startedAt?: number; closedAt?: number;
  taskDueDays: number; dayLengthSeconds: number;
  escalationRules: EscalationRule[];
}
export interface TaskEvent { at: number; actor: string; action: string; detail?: string; }
export interface ReviewTask {
  id: string; campaignId: string; subjectUserId: string; systemId: string;
  account: string; permission: string; assigneeId: string;
  status: 'PENDING' | 'CONFIRMED' | 'REVOKED' | 'CANCELLED';
  assignedAt: number; decidedAt?: number; decidedBy?: string; decisionNote?: string;
  escalationLevel: number; history: TaskEvent[];
  subjectName?: string; assigneeName?: string; systemName?: string;
  dueAt?: number; overdue?: boolean;
}
export interface RevocationJob {
  id: string; taskId: string; campaignId: string; systemId: string;
  account: string; permission: string;
  status: 'PENDING' | 'REVOKED' | 'VERIFIED' | 'FAILED';
  attempts: number; createdAt: number; updatedAt: number; message?: string; systemName?: string;
}
export interface AuditEntry { id: number; at: number; actor: string; action: string; detail: string; }
export interface Notification { id: number; at: number; toUserId: string; message: string; read: boolean; }
export interface CampaignStats {
  campaign: Campaign;
  tasks: { total: number; pending: number; confirmed: number; revoked: number; overdue: number };
  jobs: { total: number; pending: number; revoked: number; verified: number; failed: number };
  byAssignee: { userId: string; userName: string; total: number; pending: number }[];
}

@Injectable({ providedIn: 'root' })
export class ApiService {
  private http = inject(HttpClient);

  users(): Observable<User[]> { return this.http.get<User[]>(`${BASE}/api/org/users`); }
  departments(): Observable<Department[]> { return this.http.get<Department[]>(`${BASE}/api/org/departments`); }
  changeManager(userId: string, newManagerId: string | null, actor: string) {
    return this.http.patch(`${BASE}/api/org/users/${userId}/manager`, { newManagerId, actor });
  }
  deactivate(userId: string, actor: string) {
    return this.http.post(`${BASE}/api/org/users/${userId}/deactivate`, { actor });
  }

  systems(): Observable<SystemInfo[]> { return this.http.get<SystemInfo[]>(`${BASE}/api/systems`); }
  systemPermissions(id: string): Observable<{ account: string; permission: string }[]> {
    return this.http.get<{ account: string; permission: string }[]>(`${BASE}/api/systems/${id}/permissions`);
  }

  campaigns(): Observable<Campaign[]> { return this.http.get<Campaign[]>(`${BASE}/api/campaigns`); }
  createCampaign(body: Partial<Campaign> & { actor: string }): Observable<Campaign> {
    return this.http.post<Campaign>(`${BASE}/api/campaigns`, body);
  }
  startCampaign(id: string, actor: string) { return this.http.post(`${BASE}/api/campaigns/${id}/start`, { actor }); }
  closeCampaign(id: string, actor: string) { return this.http.post(`${BASE}/api/campaigns/${id}/close`, { actor }); }
  campaignStats(id: string): Observable<CampaignStats> { return this.http.get<CampaignStats>(`${BASE}/api/campaigns/${id}/stats`); }

  tasks(filter: { campaignId?: string; assigneeId?: string; status?: string }): Observable<ReviewTask[]> {
    const params: Record<string, string> = {};
    if (filter.campaignId) params['campaignId'] = filter.campaignId;
    if (filter.assigneeId) params['assigneeId'] = filter.assigneeId;
    if (filter.status) params['status'] = filter.status;
    return this.http.get<ReviewTask[]>(`${BASE}/api/tasks`, { params });
  }
  confirmTask(id: string, actor: string, note?: string) { return this.http.post(`${BASE}/api/tasks/${id}/confirm`, { actor, note }); }
  revokeTask(id: string, actor: string, note?: string) { return this.http.post(`${BASE}/api/tasks/${id}/revoke`, { actor, note }); }
  delegateTask(id: string, actor: string, toUserId: string, note?: string) {
    return this.http.post(`${BASE}/api/tasks/${id}/delegate`, { actor, toUserId, note });
  }

  jobs(campaignId?: string): Observable<RevocationJob[]> {
    return this.http.get<RevocationJob[]>(`${BASE}/api/jobs`, { params: campaignId ? { campaignId } : {} });
  }
  audit(): Observable<AuditEntry[]> { return this.http.get<AuditEntry[]>(`${BASE}/api/audit`, { params: { limit: '200' } }); }
  notifications(userId: string): Observable<Notification[]> {
    return this.http.get<Notification[]>(`${BASE}/api/notifications`, { params: { userId } });
  }
}
