import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { StoreService } from './store.service';

/**
 * 超时升级调度器: 每 5 秒扫描一次进行中的活动,
 * 按活动配置的升级规则(escalationRules)逐级处理逾期任务。
 * "天"的长度由活动的 dayLengthSeconds 决定,演示时可设为几十秒。
 */
@Injectable()
export class EscalationService {
  private readonly logger = new Logger(EscalationService.name);

  constructor(private readonly store: StoreService) {}

  @Cron(CronExpression.EVERY_5_SECONDS)
  tick() {
    const now = Date.now();
    for (const campaign of this.store.campaigns.values()) {
      if (campaign.status !== 'ACTIVE') continue;
      const dayMs = campaign.dayLengthSeconds * 1000;
      const tasks = [...this.store.tasks.values()].filter(
        (t) => t.campaignId === campaign.id && t.status === 'PENDING',
      );
      for (const t of tasks) {
        const overdueDays = (now - t.assignedAt - campaign.taskDueDays * dayMs) / dayMs;
        // 依次应用已达到触发条件的规则
        while (t.escalationLevel < campaign.escalationRules.length) {
          const rule = campaign.escalationRules[t.escalationLevel];
          if (overdueDays < rule.afterDaysOverdue) break;
          this.applyRule(t.id, rule.action, campaign.ownerId, campaign.name);
          t.escalationLevel++;
        }
      }
    }
  }

  private applyRule(taskId: string, action: string, ownerId: string, campaignName: string) {
    const t = this.store.tasks.get(taskId)!;
    const subject = this.store.userName(t.subjectUserId);
    if (action === 'REMIND') {
      this.store.notify(t.assigneeId, `【${campaignName}】你有一条复核任务已逾期: ${subject} 的 ${t.permission}`);
      t.history.push({ at: Date.now(), actor: 'system', action: 'REMINDED', detail: `提醒 ${this.store.userName(t.assigneeId)}` });
      this.store.audit('system', 'TASK_REMINDED', `任务 ${t.id} 逾期,提醒 ${this.store.userName(t.assigneeId)}`);
    } else if (action === 'ESCALATE_TO_MANAGER') {
      const assignee = this.store.users.get(t.assigneeId);
      const target = assignee?.managerId ?? ownerId;
      if (target === t.assigneeId) return;
      const from = this.store.userName(t.assigneeId);
      t.assigneeId = target;
      t.history.push({ at: Date.now(), actor: 'system', action: 'ESCALATED', detail: `逾期升级: ${from} -> ${this.store.userName(target)}` });
      this.store.notify(target, `【${campaignName}】复核任务逾期升级到你处: ${subject} 的 ${t.permission}`);
      this.store.audit('system', 'TASK_ESCALATED', `任务 ${t.id} 从 ${from} 升级到 ${this.store.userName(target)}`);
    } else if (action === 'ESCALATE_TO_OWNER') {
      if (t.assigneeId === ownerId) return;
      const from = this.store.userName(t.assigneeId);
      t.assigneeId = ownerId;
      t.history.push({ at: Date.now(), actor: 'system', action: 'ESCALATED', detail: `逾期升级到活动负责人 ${this.store.userName(ownerId)}` });
      this.store.notify(ownerId, `【${campaignName}】复核任务升级到活动负责人: ${subject} 的 ${t.permission}`);
      this.store.audit('system', 'TASK_ESCALATED', `任务 ${t.id} 从 ${from} 升级到活动负责人`);
    }
  }
}
