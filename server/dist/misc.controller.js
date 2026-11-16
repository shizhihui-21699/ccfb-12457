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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MiscController = void 0;
const common_1 = require("@nestjs/common");
const store_service_1 = require("./store.service");
const org_service_1 = require("./org.service");
const revocations_service_1 = require("./revocations.service");
const connectors_service_1 = require("./connectors.service");
let MiscController = class MiscController {
    constructor(store, org, revocations, connectors) {
        this.store = store;
        this.org = org;
        this.revocations = revocations;
        this.connectors = connectors;
    }
    users() {
        return [...this.store.users.values()].map((u) => ({
            ...u,
            managerName: u.managerId ? this.store.userName(u.managerId) : null,
            departmentName: this.store.departments.get(u.departmentId)?.name,
        }));
    }
    departments() {
        return [...this.store.departments.values()];
    }
    changeManager(id, body) {
        return this.org.changeManager(id, body.newManagerId, body.actor);
    }
    deactivate(id, body) {
        return this.org.deactivate(id, body?.actor);
    }
    systems() {
        return [...this.store.systems.values()];
    }
    systemPermissions(id) {
        return this.connectors.listPermissions(id);
    }
    jobs(campaignId) {
        return this.revocations.list(campaignId);
    }
    audit(limit) {
        const n = limit ? parseInt(limit, 10) : 100;
        return this.store.auditLog.slice(-n).reverse();
    }
    notifications(userId) {
        let list = this.store.notifications;
        if (userId)
            list = list.filter((n) => n.toUserId === userId);
        return list.slice(-50).reverse();
    }
};
exports.MiscController = MiscController;
__decorate([
    (0, common_1.Get)('org/users'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], MiscController.prototype, "users", null);
__decorate([
    (0, common_1.Get)('org/departments'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], MiscController.prototype, "departments", null);
__decorate([
    (0, common_1.Patch)('org/users/:id/manager'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], MiscController.prototype, "changeManager", null);
__decorate([
    (0, common_1.Post)('org/users/:id/deactivate'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], MiscController.prototype, "deactivate", null);
__decorate([
    (0, common_1.Get)('systems'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], MiscController.prototype, "systems", null);
__decorate([
    (0, common_1.Get)('systems/:id/permissions'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], MiscController.prototype, "systemPermissions", null);
__decorate([
    (0, common_1.Get)('jobs'),
    __param(0, (0, common_1.Query)('campaignId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], MiscController.prototype, "jobs", null);
__decorate([
    (0, common_1.Get)('audit'),
    __param(0, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], MiscController.prototype, "audit", null);
__decorate([
    (0, common_1.Get)('notifications'),
    __param(0, (0, common_1.Query)('userId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], MiscController.prototype, "notifications", null);
exports.MiscController = MiscController = __decorate([
    (0, common_1.Controller)('api'),
    __metadata("design:paramtypes", [store_service_1.StoreService,
        org_service_1.OrgService,
        revocations_service_1.RevocationsService,
        connectors_service_1.MockConnectorsService])
], MiscController);
//# sourceMappingURL=misc.controller.js.map