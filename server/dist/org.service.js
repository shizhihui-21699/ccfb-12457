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
exports.OrgService = void 0;
const common_1 = require("@nestjs/common");
const store_service_1 = require("./store.service");
let OrgService = class OrgService {
    constructor(store) {
        this.store = store;
    }
    changeManager(userId, newManagerId, actor = 'system') {
        const user = this.store.users.get(userId);
        if (!user)
            throw new common_1.NotFoundException('用户不存在');
        if (newManagerId) {
            const m = this.store.users.get(newManagerId);
            if (!m || !m.active)
                throw new common_1.BadRequestException('新主管不存在或已离职');
            if (newManagerId === userId)
                throw new common_1.BadRequestException('主管不能是自己');
        }
        const oldManagerId = user.managerId;
        user.managerId = newManagerId;
        this.store.audit(actor, 'ORG_MANAGER_CHANGED', `${user.name} 的主管从 ${oldManagerId ? this.store.userName(oldManagerId) : '无'} 变更为 ${newManagerId ? this.store.userName(newManagerId) : '无'}`);
        let moved = 0;
        for (const t of this.store.tasks.values()) {
            if (t.subjectUserId === userId && t.status === 'PENDING' && t.assigneeId === oldManagerId) {
                const campaign = this.store.campaigns.get(t.campaignId);
                if (campaign?.status !== 'ACTIVE')
                    continue;
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
        if (moved)
            this.store.audit('system', 'TASKS_REASSIGNED', `${user.name} 换主管,${moved} 条复核任务跟随转移`);
        return { user, movedTasks: moved };
    }
    deactivate(userId, actor = 'system') {
        const user = this.store.users.get(userId);
        if (!user)
            throw new common_1.NotFoundException('用户不存在');
        user.active = false;
        this.store.audit(actor, 'ORG_USER_DEACTIVATED', `${user.name} 离职/停用`);
        let moved = 0;
        for (const t of this.store.tasks.values()) {
            if (t.assigneeId !== userId || t.status !== 'PENDING')
                continue;
            const campaign = this.store.campaigns.get(t.campaignId);
            if (campaign?.status !== 'ACTIVE')
                continue;
            const target = user.managerId ?? campaign.ownerId;
            t.assigneeId = target;
            t.history.push({
                at: Date.now(), actor: 'system', action: 'REASSIGNED',
                detail: `${user.name} 离职,任务转给 ${this.store.userName(target)}`,
            });
            this.store.notify(target, `${user.name} 离职,其名下复核任务转到你处`);
            moved++;
        }
        if (moved)
            this.store.audit('system', 'TASKS_REASSIGNED', `${user.name} 离职,${moved} 条复核任务转移`);
        return { user, movedTasks: moved };
    }
};
exports.OrgService = OrgService;
exports.OrgService = OrgService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [store_service_1.StoreService])
], OrgService);
//# sourceMappingURL=org.service.js.map