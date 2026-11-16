import { Injectable, OnModuleInit } from '@nestjs/common';

export interface PermissionEntry {
  account: string; // 目标系统账号(= 用户邮箱)
  permission: string; // 角色/权限
}

/**
 * 本地 Mock 系统连接器。
 * 每个"目标系统"在内存里维护一份 账号 -> 权限集 的映射,
 * revoke() 真正删除权限, readBack() 回读当前权限用于核对。
 * sys-oa 模拟老旧系统: 每个账号的第一次 revoke 会失败,用于演示失败重试。
 */
@Injectable()
export class MockConnectorsService implements OnModuleInit {
  /** systemId -> (account -> permissions) */
  private grants = new Map<string, Map<string, Set<string>>>();
  /** 记录 sys-oa 已经失败过的 account+permission,保证只失败第一次 */
  private oaFailedOnce = new Set<string>();

  onModuleInit() {
    this.seedGrants();
  }

  private seedGrants() {
    const seed: Record<string, Record<string, string[]>> = {
      'sys-git': {
        'lifeng@corp.local': ['Admin'],
        'wangfang@corp.local': ['Developer'],
        'zhangqiang@corp.local': ['Developer', 'Maintainer'],
        'zhaomin@corp.local': ['Maintainer'],
        'hebin@corp.local': ['Admin'],
      },
      'sys-erp': {
        'lifeng@corp.local': ['Viewer'],
        'wangfang@corp.local': ['Viewer'],
        'zhaomin@corp.local': ['Admin'],
        'liuyang@corp.local': ['Finance'],
        'sunli@corp.local': ['Finance'],
        'zhengjie@corp.local': ['HR'],
        'hebin@corp.local': ['Admin'],
        'chenwei@corp.local': ['Viewer'],
      },
      'sys-crm': {
        'zhoujie@corp.local': ['Manager'],
        'wuqian@corp.local': ['Sales'],
        'hebin@corp.local': ['Admin'],
      },
      'sys-oa': {
        'wangfang@corp.local': ['User'],
        'zhangqiang@corp.local': ['User'],
        'zhaomin@corp.local': ['Admin'],
        'sunli@corp.local': ['User'],
        'wuqian@corp.local': ['User'],
        'zhengjie@corp.local': ['HR'],
        'hebin@corp.local': ['Admin'],
      },
      'sys-bi': {
        'lifeng@corp.local': ['Admin'],
        'zhangqiang@corp.local': ['Viewer'],
        'liuyang@corp.local': ['Viewer'],
        'zhoujie@corp.local': ['Viewer'],
        'chenwei@corp.local': ['Viewer'],
      },
    };
    for (const [sys, accounts] of Object.entries(seed)) {
      const m = new Map<string, Set<string>>();
      for (const [acc, perms] of Object.entries(accounts)) m.set(acc, new Set(perms));
      this.grants.set(sys, m);
    }
  }

  /** 拉取某系统全部权限(复核活动发起时做快照) */
  listPermissions(systemId: string): PermissionEntry[] {
    const m = this.grants.get(systemId);
    if (!m) return [];
    const out: PermissionEntry[] = [];
    for (const [account, perms] of m) for (const p of perms) out.push({ account, permission: p });
    return out;
  }

  /** 真正收回权限;返回是否成功 */
  revoke(systemId: string, account: string, permission: string): { ok: boolean; message?: string } {
    // 模拟老 OA 系统偶发失败: 每个权限第一次 revoke 必失败
    if (systemId === 'sys-oa') {
      const key = `${account}|${permission}`;
      if (!this.oaFailedOnce.has(key)) {
        this.oaFailedOnce.add(key);
        return { ok: false, message: 'OA系统接口超时(模拟老系统故障),将自动重试' };
      }
    }
    const m = this.grants.get(systemId);
    const perms = m?.get(account);
    if (!perms || !perms.has(permission)) {
      return { ok: true, message: '权限已不存在(可能已被管理员手工收回)' };
    }
    perms.delete(permission);
    return { ok: true };
  }

  /** 回读某账号当前权限,用于核对撤销结果 */
  readBack(systemId: string, account: string): string[] {
    return [...(this.grants.get(systemId)?.get(account) ?? [])];
  }
}
