"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CampaignsService = exports.DEFAULT_ESCALATION_RULES = void 0;
const common_1 = require("@nestjs/common");
const store_service_1 = require("./store.service");
const connectors_service_1 = require("./connectors.service");
exports.DEFAULT_ESCALATION_RULES = [
    { afterDaysOverdue: 0, action: 'REMIND' },
    { afterDaysOverdue: 2, action: 'ESCALATE_TO_MANAGER' },
    { afterDaysOverdue: 4, action: 'ESCALATE_TO_OWNER' },
];
let CampaignsService = class CampaignsService {
    constructor(store, connectors) {
        this.store = store;
        this.connectors = connectors;
    }
    create(dto) {
        if (!this.store.users.get(dto.ownerId))
            throw new common_1.BadRequestException('负责人不存在');
        const c = {
            id: this.store.nextId('camp'),
            name: dto.name,
            quarter: dto.quarter,
            ownerId: dto.ownerId,
            status: 'DRAFT',
            createdAt: Date.now(),
            taskDueDays: dto.taskDueDays ?? 7,
            dayLengthSeconds: dto.dayLengthSeconds ?? 86400,
            escalationRules: (dto.escalationRules?.length ? dto.escalationRules : exports.DEFAULT_ESCALATION_RULES)
                .slice()
                .sort((a, b) => a.afterDaysOverdue - b.afterDaysOverdue),
        };
        this.store.campaigns.set(c.id, c);
        this.store.audit(dto.actor ?? 'system', 'CAMPAIGN_CREATED', `创建复核活动「${c.name}」(${c.quarter})`);
        return c;
    }
    start(id, actor = 'system') {
        const c = this.mustGet(id);
        if (c.status !== 'DRAFT')
            throw new common_1.BadRequestException('只有草稿状态的活动可以发起');
        c.status = 'ACTIVE';
        c.startedAt = Date.now();
        let count = 0;
        for (const system of this.store.systems.values()) {
            for (const entry of this.connectors.listPermissions(system.id)) {
                const subject = [...this.store.users.values()].find((u) => u.email === entry.account && u.active);
                if (!subject)
                    continue;
                const task = {
                    id: this.store.nextId('task'),
                    campaignId: c.id,
                    subjectUserId: subject.id,
                    systemId: system.id,
                    account: entry.account,
                    permission: entry.permission,
                    assigneeId: subject.managerId ?? c.ownerId,
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
    close(id, actor = 'system') {
        const c = this.mustGet(id);
        if (c.status !== 'ACTIVE')
            throw new common_1.BadRequestException('只有进行中的活动可以关闭');
        const pending = [...this.store.tasks.values()].filter((t) => t.campaignId === id && t.status === 'PENDING');
        if (pending.length) {
            throw new common_1.BadRequestException(`还有 ${pending.length} 条任务未处理,不能关闭`);
        }
        c.status = 'CLOSED';
        c.closedAt = Date.now();
        this.store.audit(actor, 'CAMPAIGN_CLOSED', `活动「${c.name}」关闭`);
        return c;
    }
    mustGet(id) {
        const c = this.store.campaigns.get(id);
        if (!c)
            throw new common_1.NotFoundException('复核活动不存在');
        return c;
    }
    list() {
        return [...this.store.campaigns.values()].sort((a, b) => b.createdAt - a.createdAt);
    }
    stats(id) {
        const tasks = [...this.store.tasks.values()].filter((t) => t.campaignId === id);
        const jobs = [...this.store.jobs.values()].filter((j) => j.campaignId === id);
        const c = this.mustGet(id);
        const dayMs = c.dayLengthSeconds * 1000;
        const now = Date.now();
        const overdue = tasks.filter((t) => t.status === 'PENDING' && now > t.assignedAt + c.taskDueDays * dayMs);
        const byAssignee = new Map();
        for (const t of tasks) {
            const e = byAssignee.get(t.assigneeId) ?? { total: 0, pending: 0 };
            e.total++;
            if (t.status === 'PENDING')
                e.pending++;
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
};
exports.CampaignsService = CampaignsService;
exports.CampaignsService = CampaignsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [store_service_1.StoreService,
        connectors_service_1.MockConnectorsService])
], CampaignsService);
//# sourceMappingURL=campaigns.service.js.map