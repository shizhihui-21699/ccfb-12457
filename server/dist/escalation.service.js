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
var EscalationService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.EscalationService = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const store_service_1 = require("./store.service");
let EscalationService = EscalationService_1 = class EscalationService {
    constructor(store) {
        this.store = store;
        this.logger = new common_1.Logger(EscalationService_1.name);
    }
    tick() {
        const now = Date.now();
        for (const campaign of this.store.campaigns.values()) {
            if (campaign.status !== 'ACTIVE')
                continue;
            const dayMs = campaign.dayLengthSeconds * 1000;
            const tasks = [...this.store.tasks.values()].filter((t) => t.campaignId === campaign.id && t.status === 'PENDING');
            for (const t of tasks) {
                const overdueDays = (now - t.assignedAt - campaign.taskDueDays * dayMs) / dayMs;
                while (t.escalationLevel < campaign.escalationRules.length) {
                    const rule = campaign.escalationRules[t.escalationLevel];
                    if (overdueDays < rule.afterDaysOverdue)
                        break;
                    this.applyRule(t.id, rule.action, campaign.ownerId, campaign.name);
                    t.escalationLevel++;
                }
            }
        }
    }
    applyRule(taskId, action, ownerId, campaignName) {
        const t = this.store.tasks.get(taskId);
        const subject = this.store.userName(t.subjectUserId);
        if (action === 'REMIND') {
            this.store.notify(t.assigneeId, `【${campaignName}】你有一条复核任务已逾期: ${subject} 的 ${t.permission}`);
            t.history.push({ at: Date.now(), actor: 'system', action: 'REMINDED', detail: `提醒 ${this.store.userName(t.assigneeId)}` });
            this.store.audit('system', 'TASK_REMINDED', `任务 ${t.id} 逾期,提醒 ${this.store.userName(t.assigneeId)}`);
        }
        else if (action === 'ESCALATE_TO_MANAGER') {
            const assignee = this.store.users.get(t.assigneeId);
            const target = assignee?.managerId ?? ownerId;
            if (target === t.assigneeId)
                return;
            const from = this.store.userName(t.assigneeId);
            t.assigneeId = target;
            t.history.push({ at: Date.now(), actor: 'system', action: 'ESCALATED', detail: `逾期升级: ${from} -> ${this.store.userName(target)}` });
            this.store.notify(target, `【${campaignName}】复核任务逾期升级到你处: ${subject} 的 ${t.permission}`);
            this.store.audit('system', 'TASK_ESCALATED', `任务 ${t.id} 从 ${from} 升级到 ${this.store.userName(target)}`);
        }
        else if (action === 'ESCALATE_TO_OWNER') {
            if (t.assigneeId === ownerId)
                return;
            const from = this.store.userName(t.assigneeId);
            t.assigneeId = ownerId;
            t.history.push({ at: Date.now(), actor: 'system', action: 'ESCALATED', detail: `逾期升级到活动负责人 ${this.store.userName(ownerId)}` });
            this.store.notify(ownerId, `【${campaignName}】复核任务升级到活动负责人: ${subject} 的 ${t.permission}`);
            this.store.audit('system', 'TASK_ESCALATED', `任务 ${t.id} 从 ${from} 升级到活动负责人`);
        }
    }
};
exports.EscalationService = EscalationService;
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_5_SECONDS),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], EscalationService.prototype, "tick", null);
exports.EscalationService = EscalationService = EscalationService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [store_service_1.StoreService])
], EscalationService);
//# sourceMappingURL=escalation.service.js.map