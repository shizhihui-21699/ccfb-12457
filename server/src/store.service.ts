import { Injectable, OnModuleInit } from '@nestjs/common';
import {
  AuditEntry, Campaign, Department, Notification, ReviewTask,
  RevocationJob, SystemInfo, User,
} from './model';

/**
 * 内存数据存储 —— 演示用,重启即重置。
 * 真实场景替换为 TypeORM/Prisma 即可,Service 层接口不变。
 */
@Injectable()
export class StoreService implements OnModuleInit {
  departments = new Map<string, Department>();
  users = new Map<string, User>();
  systems = new Map<string, SystemInfo>();
  campaigns = new Map<string, Campaign>();
  tasks = new Map<string, ReviewTask>();
  jobs = new Map<string, RevocationJob>();
  auditLog: AuditEntry[] = [];
  notifications: Notification[] = [];

  private seq = 0;
  nextId(prefix: string): string {
    return `${prefix}-${++this.seq}-${Date.now().toString(36)}`;
  }

  audit(actor: string, action: string, detail: string) {
    this.auditLog.push({ id: this.auditLog.length + 1, at: Date.now(), actor, action, detail });
  }

  notify(toUserId: string, message: string) {
    this.notifications.push({
      id: this.notifications.length + 1,
      at: Date.now(), toUserId, message, read: false,
    });
  }

  userName(id: string): string {
    return this.users.get(id)?.name ?? id;
  }

  onModuleInit() {
    this.seed();
  }

  private seed() {
    const depts: Department[] = [
      { id: 'd-root', name: '总部', parentId: null },
      { id: 'd-tech', name: '技术部', parentId: 'd-root' },
      { id: 'd-fin', name: '财务部', parentId: 'd-root' },
      { id: 'd-sales', name: '销售部', parentId: 'd-root' },
      { id: 'd-hr', name: '人事部', parentId: 'd-root' },
    ];
    depts.forEach((d) => this.departments.set(d.id, d));

    const users: User[] = [
      { id: 'u-ceo', name: '陈伟', email: 'chenwei@corp.local', departmentId: 'd-root', managerId: null, active: true },
      { id: 'u-cto', name: '李峰', email: 'lifeng@corp.local', departmentId: 'd-tech', managerId: 'u-ceo', active: true },
      { id: 'u-dev1', name: '王芳', email: 'wangfang@corp.local', departmentId: 'd-tech', managerId: 'u-cto', active: true },
      { id: 'u-dev2', name: '张强', email: 'zhangqiang@corp.local', departmentId: 'd-tech', managerId: 'u-cto', active: true },
      { id: 'u-ops', name: '赵敏', email: 'zhaomin@corp.local', departmentId: 'd-tech', managerId: 'u-cto', active: true },
      { id: 'u-it', name: '何斌', email: 'hebin@corp.local', departmentId: 'd-tech', managerId: 'u-cto', active: true },
      { id: 'u-cfo', name: '刘洋', email: 'liuyang@corp.local', departmentId: 'd-fin', managerId: 'u-ceo', active: true },
      { id: 'u-fin1', name: '孙丽', email: 'sunli@corp.local', departmentId: 'd-fin', managerId: 'u-cfo', active: true },
      { id: 'u-svp', name: '周杰', email: 'zhoujie@corp.local', departmentId: 'd-sales', managerId: 'u-ceo', active: true },
      { id: 'u-sales1', name: '吴倩', email: 'wuqian@corp.local', departmentId: 'd-sales', managerId: 'u-svp', active: true },
      { id: 'u-hr', name: '郑洁', email: 'zhengjie@corp.local', departmentId: 'd-hr', managerId: 'u-ceo', active: true },
    ];
    users.forEach((u) => this.users.set(u.id, u));

    const systems: SystemInfo[] = [
      { id: 'sys-erp', name: 'ERP系统', description: '财务/供应链核心系统' },
      { id: 'sys-crm', name: 'CRM系统', description: '客户关系管理' },
      { id: 'sys-git', name: 'GitLab代码仓库', description: '源码与CI/CD' },
      { id: 'sys-oa', name: 'OA办公系统', description: '老系统,连接器偶发失败(演示重试)' },
      { id: 'sys-bi', name: 'BI报表平台', description: '数据分析与报表' },
    ];
    systems.forEach((s) => this.systems.set(s.id, s));

    this.audit('system', 'SEED', `初始化 ${users.length} 个用户, ${systems.length} 个系统`);
  }
}
