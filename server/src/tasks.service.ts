import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { StoreService } from './store.service';
import { ReviewTask, RevocationJob } from './model';

@Injectable()
export class TasksService {
  constructor(private readonly store: StoreService) {}

  query(filter: { campaignId?: string; assigneeId?: string; subjectUserId?: string; status?: string }) {
    let list = [...this.store.tasks.values()];
    if (filter.campaignId) list = list.filter((t) => t.campaignId === filter.campaignId);
    if (filter.assigneeId) list = list.filter((t) => t.assigneeId === filter.assigneeId);
    if (filter.subjectUserId) list = list.filter((t) => t.subjectUserId === filter.subjectUserId);
    if (filter.status) list = list.filter((t) => t.status === filter.status);
    return list.map((t) => this.decorate(t));
  }

  get(id: string) {
    return this.decorate(this.mustGet(id));
  }

  private decorate(t: ReviewTask) {
    const c = this.store.campaigns.get(t.campaignId);
    const dayMs = (c?.dayLengthSeconds ?? 86400) * 1000;
    const dueAt = t.assignedAt + (c?.taskDueDays ?? 7) * dayMs;
    return {
      ...t,
      subjectName: this.store.userName(t.subjectUserId),
      assigneeName: this.store.userName(t.assigneeId),
      systemName: this.store.systems.get(t.systemId)?.name ?? t.systemId,
      dueAt,
      overdue: t.status === 'PENDING' && Date.now() > dueAt,
    };
  }

  confirm(id: string, actor: string, note?: string) {
    const t = this.mustPending(id);
    t.status = 'CONFIRMED';
    t.decidedAt = Date.now();
    t.decidedBy = actor;
    t.decisionNote = note;
    t.history.push({ at: Date.now(), actor, action: 'CONFIRMED', detail: note ?? '确认保留权限' });
    this.store.audit(actor, 'TASK_CONFIRMED', `确认保留 ${this.store.userName(t.subjectUserId)} 在 ${t.systemId} 的 ${t.permission}`);
    return this.decorate(t);
  }

  /** 确认撤销: 生成撤销作业,由作业处理器调用连接器真正收回并回读核对 */
  revoke(id: string, actor: string, note?: string) {
    const t = this.mustPending(id);
    t.status = 'REVOKED';
    t.decidedAt = Date.now();
    t.decidedBy = actor;
    t.decisionNote = note;
    t.history.push({ at: Date.now(), actor, action: 'REVOKED', detail: note ?? '确认撤销权限' });
    const job: RevocationJob = {
      id: this.store.nextId('job'),
      taskId: t.id,
      campaignId: t.campaignId,
      systemId: t.systemId,
      account: t.account,
      permission: t.permission,
      status: 'PENDING',
      attempts: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    this.store.jobs.set(job.id, job);
    this.store.audit(actor, 'TASK_REVOKED', `撤销 ${this.store.userName(t.subjectUserId)} 在 ${t.systemId} 的 ${t.permission},已生成撤销作业 ${job.id}`);
    return this.decorate(t);
  }

  /** 委托他人复核 */
  delegate(id: string, actor: string, toUserId: string, note?: string) {
    const t = this.mustPending(id);
    const to = this.store.users.get(toUserId);
    if (!to || !to.active) throw new BadRequestException('被委托人不存在或已离职');
    if (toUserId === t.subjectUserId) throw new BadRequestException('不能委托给被复核人本人');
    const from = t.assigneeId;
    t.assigneeId = toUserId;
    t.assignedAt = Date.now(); // 重新计时
    t.escalationLevel = 0;
    t.history.push({
      at: Date.now(), actor, action: 'DELEGATED',
      detail: `${this.store.userName(from)} 委托给 ${to.name}${note ? ': ' + note : ''}`,
    });
    this.store.notify(toUserId, `${this.store.userName(actor)} 委托你复核 ${this.store.userName(t.subjectUserId)} 的权限`);
    this.store.audit(actor, 'TASK_DELEGATED', `任务 ${t.id} 从 ${this.store.userName(from)} 委托给 ${to.name}`);
    return this.decorate(t);
  }

  mustGet(id: string): ReviewTask {
    const t = this.store.tasks.get(id);
    if (!t) throw new NotFoundException('复核任务不存在');
    return t;
  }

  private mustPending(id: string): ReviewTask {
    const t = this.mustGet(id);
    if (t.status !== 'PENDING') throw new BadRequestException('任务已处理,不能重复操作');
    return t;
  }
}
