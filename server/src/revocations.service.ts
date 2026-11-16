import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { StoreService } from './store.service';
import { MockConnectorsService } from './connectors.service';

/**
 * 撤销作业处理器:
 * PENDING -> 调用连接器真正收回 -> REVOKED
 * REVOKED -> 回读核对 -> VERIFIED(权限确实没了) / FAILED(重试,最多3次)
 */
@Injectable()
export class RevocationsService {
  private readonly logger = new Logger(RevocationsService.name);
  private static readonly MAX_ATTEMPTS = 3;

  constructor(
    private readonly store: StoreService,
    private readonly connectors: MockConnectorsService,
  ) {}

  @Cron(CronExpression.EVERY_5_SECONDS)
  processJobs() {
    for (const job of this.store.jobs.values()) {
      if (job.status === 'PENDING') {
        job.attempts++;
        const res = this.connectors.revoke(job.systemId, job.account, job.permission);
        job.updatedAt = Date.now();
        if (res.ok) {
          job.status = 'REVOKED';
          job.message = res.message;
          this.store.audit('system', 'JOB_REVOKED', `作业 ${job.id}: 已在 ${job.systemId} 收回 ${job.account} 的 ${job.permission}`);
        } else if (job.attempts >= RevocationsService.MAX_ATTEMPTS) {
          job.status = 'FAILED';
          job.message = `重试 ${job.attempts} 次仍失败: ${res.message}`;
          this.store.audit('system', 'JOB_FAILED', `作业 ${job.id}: ${job.message}`);
        } else {
          job.message = `${res.message}(第 ${job.attempts} 次尝试)`;
          this.store.audit('system', 'JOB_RETRY', `作业 ${job.id}: ${job.message}`);
        }
      } else if (job.status === 'REVOKED') {
        // 回读核对: 权限必须真的不在目标系统里了
        const current = this.connectors.readBack(job.systemId, job.account);
        job.updatedAt = Date.now();
        if (!current.includes(job.permission)) {
          job.status = 'VERIFIED';
          job.message = `回读核对通过,当前权限: [${current.join(', ')}]`;
          this.store.audit('system', 'JOB_VERIFIED', `作业 ${job.id}: 回读核对通过`);
        } else {
          job.status = 'PENDING'; // 收回未生效,重新执行
          job.message = '回读发现权限仍存在,重新执行收回';
          this.store.audit('system', 'JOB_READBACK_MISMATCH', `作业 ${job.id}: 回读发现权限仍存在`);
        }
      }
    }
  }

  list(campaignId?: string) {
    let jobs = [...this.store.jobs.values()];
    if (campaignId) jobs = jobs.filter((j) => j.campaignId === campaignId);
    return jobs
      .sort((a, b) => b.createdAt - a.createdAt)
      .map((j) => ({ ...j, systemName: this.store.systems.get(j.systemId)?.name ?? j.systemId }));
  }
}
