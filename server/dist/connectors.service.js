"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MockConnectorsService = void 0;
const common_1 = require("@nestjs/common");
let MockConnectorsService = class MockConnectorsService {
    constructor() {
        this.grants = new Map();
        this.oaFailedOnce = new Set();
    }
    onModuleInit() {
        this.seedGrants();
    }
    seedGrants() {
        const seed = {
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
            const m = new Map();
            for (const [acc, perms] of Object.entries(accounts))
                m.set(acc, new Set(perms));
            this.grants.set(sys, m);
        }
    }
    listPermissions(systemId) {
        const m = this.grants.get(systemId);
        if (!m)
            return [];
        const out = [];
        for (const [account, perms] of m)
            for (const p of perms)
                out.push({ account, permission: p });
        return out;
    }
    revoke(systemId, account, permission) {
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
    readBack(systemId, account) {
        return [...(this.grants.get(systemId)?.get(account) ?? [])];
    }
};
exports.MockConnectorsService = MockConnectorsService;
exports.MockConnectorsService = MockConnectorsService = __decorate([
    (0, common_1.Injectable)()
], MockConnectorsService);
//# sourceMappingURL=connectors.service.js.map