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
exports.TasksService = void 0;
const common_1 = require("@nestjs/common");
const store_service_1 = require("./store.service");
let TasksService = class TasksService {
    constructor(store) {
        this.store = store;
    }
    query(filter) {
        let list = [...this.store.tasks.values()];
        if (filter.campaignId)
            list = list.filter((t) => t.campaignId === filter.campaignId);
        if (filter.assigneeId)
            list = list.filter((t) => t.assigneeId === filter.assigneeId);
        if (filter.subjectUserId)
            list = list.filter((t) => t.subjectUserId === filter.subjectUserId);
        if (filter.status)
            list = list.filter((t) => t.status === filter.status);
        return list.map((t) => this.decorate(t));
    }
    get(id) {
        return this.decorate(this.mustGet(id));
    }
    decorate(t) {
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
    confirm(id, actor, note) {
        const t = this.mustPending(id);
        t.status = 'CONFIRMED';
        t.decidedAt = Date.now();
        t.decidedBy = actor;
        t.decisionNote = note;
        t.history.push({ at: Date.now(), actor, action: 'CONFIRMED', detail: note ?? '确认保留权限' });
        this.store.audit(actor, 'TASK_CONFIRMED', `确认保留 ${this.store.userName(t.subjectUserId)} 在 ${t.systemId} 的 ${t.permission}`);
        return this.decorate(t);
    }
    revoke(id, actor, note) {
        const t = this.mustPending(id);
        t.status = 'REVOKED';
        t.decidedAt = Date.now();
        t.decidedBy = actor;
        t.decisionNote = note;
        t.history.push({ at: Date.now(), actor, action: 'REVOKED', detail: note ?? '确认撤销权限' });
        const job = {
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
    delegate(id, actor, toUserId, note) {
        const t = this.mustPending(id);
        const to = this.store.users.get(toUserId);
        if (!to || !to.active)
            throw new common_1.BadRequestException('被委托人不存在或已离职');
        if (toUserId === t.subjectUserId)
            throw new common_1.BadRequestException('不能委托给被复核人本人');
        const from = t.assigneeId;
        t.assigneeId = toUserId;
        t.assignedAt = Date.now();
        t.escalationLevel = 0;
        t.history.push({
            at: Date.now(), actor, action: 'DELEGATED',
            detail: `${this.store.userName(from)} 委托给 ${to.name}${note ? ': ' + note : ''}`,
        });
        this.store.notify(toUserId, `${this.store.userName(actor)} 委托你复核 ${this.store.userName(t.subjectUserId)} 的权限`);
        this.store.audit(actor, 'TASK_DELEGATED', `任务 ${t.id} 从 ${this.store.userName(from)} 委托给 ${to.name}`);
        return this.decorate(t);
    }
    mustGet(id) {
        const t = this.store.tasks.get(id);
        if (!t)
            throw new common_1.NotFoundException('复核任务不存在');
        return t;
    }
    mustPending(id) {
        const t = this.mustGet(id);
        if (t.status !== 'PENDING')
            throw new common_1.BadRequestException('任务已处理,不能重复操作');
        return t;
    }
};
exports.TasksService = TasksService;
exports.TasksService = TasksService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [store_service_1.StoreService])
], TasksService);
//# sourceMappingURL=tasks.service.js.map