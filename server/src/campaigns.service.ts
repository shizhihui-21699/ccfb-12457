import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { StoreService } from './store.service';
import { MockConnectorsService } from './connectors.service';
import { Campaign, EscalationRule, ReviewTask } from './model';

export const DEFAULT_ESCALATION_RULES: EscalationRule[] = [
  { afterDaysOverdue: 0, action: 'REMIND' },
  { afterDaysOverdue: 2, action: 'ESCALATE_TO_MANAGER' },
  { afterDaysOverdue: 4, action: 'ESCALATE_TO_OWNER' },
];

@Injectable()
export class CampaignsService {
  constructor(
    private readonly store: StoreService,
    private readonly connectors: MockConnectorsService,
  ) {}

  create(dto: {
    name: string; quarter: string; ownerId: string;
    taskDueDays?: number; dayLengthSeconds?: number; escalationRules?: EscalationRule[];
    actor?: string;
  }): Campaign {
    if (!this.store.users.get(dto.ownerId)) throw new BadRequestException('负责人不存在');
    const c: Campaign = {
      id: this.store.nextId('camp'),
      name: dto.name,
      quarter: dto.quarter,
      ownerId: dto.ownerId,
      status: 'DRAFT',
      createdAt: Date.now(),
      taskDueDays: dto.taskDueDays ?? 7,
      dayLengthSeconds: dto.dayLengthSeconds ?? 86400,
      escalationRules: (dto.escalationRules?.length ? dto.escalationRules : DEFAULT_ESCALATION_RULES)
        .slice()
        .sort((a, b) => a.afterDaysOverdue - b.afterDaysOverdue),
    };
    this.store.campaigns.set(c.id, c);
    this.store.audit(dto.actor ?? 'system', 'CAMPAIGN_CREATED', `创建复核活动「${c.name}」(${c.quarter})`);
    return c;
  }

  /** 发起活动: 从各系统连接器拉取权限快照,为每条权限生成复核任务,派给被复核人的直属主管 */
  start(id: string, actor = 'system'): Campaign {
    const c = this.mustGet(id);
    if (c.status !== 'DRAFT') throw new BadRequestException('只有草稿状态的活动可以发起');
    c.status = 'ACTIVE';
    c.startedAt = Date.now();

    let count = 0;
    for (const system of this.store.systems.values()) {
      for (const entry of this.connectors.listPermissions(system.id)) {
        const subject = [...this.store.users.values()].find(
          (u) => u.email === entry.account && u.active,
        );
        if (!subject) continue; // 账号不属于任何在职员工,跳过(真实场景可进孤儿账号清单)
        const task: ReviewTask = {
          id: this.store.nextId('task'),
          campaignId: c.id,
          subjectUserId: subject.id,
          systemId: system.id,
          account: entry.account,
          permission: entry.permission,
          assigneeId: subject.managerId ?? c.ownerId, // 无主管(如CEO)则派给活动负责人
          status: 'PENDING',
          assignedAt: Date.now(),
          escalationLevel: 0,
          history: [{ at: Date.now(), actor, action: 'CREATED', detail: `派给 ${this.store.userName(subject.managerId ?? c.ownerId)}` }],
        };
        this.store.tasks.set(task.id, task);
        count++;
      }
    }
    this.store.audit(actor, 'CAMPAIGN_STARTED', `活动「${c.name}」发起,生成 ${count} 条复核任务`);
    return c;
  }

  close(id: string, actor = 'system'): Campaign {
    const c = this.mustGet(id);
    if (c.status !== 'ACTIVE') throw new BadRequestException('只有进行中的活动可以关闭');
    const pending = [...this.store.tasks.values()].filter(
      (t) => t.campaignId === id && t.status === 'PENDING',
    );
    if (pending.length) {
      throw new BadRequestException(`还有 ${pending.length} 条任务未处理,不能关闭`);
    }
    c.status = 'CLOSED';
    c.closedAt = Date.now();
    this.store.audit(actor, 'CAMPAIGN_CLOSED', `活动「${c.name}」关闭`);
    return c;
  }

  mustGet(id: string): Campaign {
    const c = this.store.campaigns.get(id);
    if (!c) throw new NotFoundException('复核活动不存在');
    return c;
  }

  list(): Campaign[] {
    return [...this.store.campaigns.values()].sort((a, b) => b.createdAt - a.createdAt);
  }

  /** 活动统计(仪表盘) */
  stats(id: string) {
    const tasks = [...this.store.tasks.values()].filter((t) => t.campaignId === id);
    const jobs = [...this.store.jobs.values()].filter((j) => j.campaignId === id);
    const c = this.mustGet(id);
    const dayMs = c.dayLengthSeconds * 1000;
    const now = Date.now();
    const overdue = tasks.filter(
      (t) => t.status === 'PENDING' && now > t.assignedAt + c.taskDueDays * dayMs,
    );
    const byAssignee = new Map<string, { total: number; pending: number }>();
    for (const t of tasks) {
      const e = byAssignee.get(t.assigneeId) ?? { total: 0, pending: 0 };
      e.total++;
      if (t.status === 'PENDING') e.pending++;
      byAssignee.set(t.assigneeId, e);
    }
    return {
      campaign: c,
      tasks: {
        total: tasks.length,
        pending: tasks.filter((t) => t.status === 'PENDING').length,
        confirmed: tasks.filter((t) => t.status === 'CONFIRMED').length,
        revoked: tasks.filter((t) => t.status === 'REVOKED').length,
        overdue: overdue.length,
      },
      jobs: {
        total: jobs.length,
        pending: jobs.filter((j) => j.status === 'PENDING').length,
        revoked: jobs.filter((j) => j.status === 'REVOKED').length,
        verified: jobs.filter((j) => j.status === 'VERIFIED').length,
        failed: jobs.filter((j) => j.status === 'FAILED').length,
      },
      byAssignee: [...byAssignee.entries()].map(([userId, v]) => ({
        userId,
        userName: this.store.userName(userId),
        ...v,
      })),
    };
  }
}
