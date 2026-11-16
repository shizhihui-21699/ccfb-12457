import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { StoreService } from './store.service';

/**
 * 组织架构服务。
 * 关键规则: 复核活动进行中组织架构调整时,未完成的复核任务跟着人走 ——
 *  - 员工换了主管: 该员工名下所有 PENDING 任务改派给新主管
 *  - 主管离职/停用: 他名下所有 PENDING 任务改派给他的上级(没有上级则给活动负责人)
 */
@Injectable()
export class OrgService {
  constructor(private readonly store: StoreService) {}

  changeManager(userId: string, newManagerId: string, actor = 'system') {
    const user = this.store.users.get(userId);
    if (!user) throw new NotFoundException('用户不存在');
    if (newManagerId) {
      const m = this.store.users.get(newManagerId);
      if (!m || !m.active) throw new BadRequestException('新主管不存在或已离职');
      if (newManagerId === userId) throw new BadRequestException('主管不能是自己');
    }
    const oldManagerId = user.managerId;
    user.managerId = newManagerId;
    this.store.audit(actor, 'ORG_MANAGER_CHANGED',
      `${user.name} 的主管从 ${oldManagerId ? this.store.userName(oldManagerId) : '无'} 变更为 ${newManagerId ? this.store.userName(newManagerId) : '无'}`);

    // 任务跟着转: 该员工作为被复核人的未完成任务,改派给新主管
    let moved = 0;
    for (const t of this.store.tasks.values()) {
      if (t.subjectUserId === userId && t.status === 'PENDING' && t.assigneeId === oldManagerId) {
        const campaign = this.store.campaigns.get(t.campaignId);
        if (campaign?.status !== 'ACTIVE') continue;
        const target = newManagerId ?? campaign.ownerId;
        t.assigneeId = target;
        t.history.push({
          at: Date.now(), actor: 'system', action: 'REASSIGNED',
          detail: `组织架构调整: ${user.name} 换主管,任务转给 ${this.store.userName(target)}`,
        });
        this.store.notify(target, `组织架构调整,${user.name} 的复核任务转到你处`);
        moved++;
      }
    }
    if (moved) this.store.audit('system', 'TASKS_REASSIGNED', `${user.name} 换主管,${moved} 条复核任务跟随转移`);
    return { user, movedTasks: moved };
  }

  deactivate(userId: string, actor = 'system') {
    const user = this.store.users.get(userId);
    if (!user) throw new NotFoundException('用户不存在');
    user.active = false;
    this.store.audit(actor, 'ORG_USER_DEACTIVATED', `${user.name} 离职/停用`);

    // 他名下未完成的复核任务,转给他的上级;没有上级则转给活动负责人
    let moved = 0;
    for (const t of this.store.tasks.values()) {
      if (t.assigneeId !== userId || t.status !== 'PENDING') continue;
      const campaign = this.store.campaigns.get(t.campaignId);
      if (campaign?.status !== 'ACTIVE') continue;
      const target = user.managerId ?? campaign.ownerId;
      t.assigneeId = target;
      t.history.push({
        at: Date.now(), actor: 'system', action: 'REASSIGNED',
        detail: `${user.name} 离职,任务转给 ${this.store.userName(target)}`,
      });
      this.store.notify(target, `${user.name} 离职,其名下复核任务转到你处`);
      moved++;
    }
    if (moved) this.store.audit('system', 'TASKS_REASSIGNED', `${user.name} 离职,${moved} 条复核任务转移`);
    return { user, movedTasks: moved };
  }
}
