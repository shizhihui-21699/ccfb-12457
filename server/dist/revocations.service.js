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
var RevocationsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.RevocationsService = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const store_service_1 = require("./store.service");
const connectors_service_1 = require("./connectors.service");
let RevocationsService = RevocationsService_1 = class RevocationsService {
    constructor(store, connectors) {
        this.store = store;
        this.connectors = connectors;
        this.logger = new common_1.Logger(RevocationsService_1.name);
    }
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
                }
                else if (job.attempts >= RevocationsService_1.MAX_ATTEMPTS) {
                    job.status = 'FAILED';
                    job.message = `重试 ${job.attempts} 次仍失败: ${res.message}`;
                    this.store.audit('system', 'JOB_FAILED', `作业 ${job.id}: ${job.message}`);
                }
                else {
                    job.message = `${res.message}(第 ${job.attempts} 次尝试)`;
                    this.store.audit('system', 'JOB_RETRY', `作业 ${job.id}: ${job.message}`);
                }
            }
            else if (job.status === 'REVOKED') {
                const current = this.connectors.readBack(job.systemId, job.account);
                job.updatedAt = Date.now();
                if (!current.includes(job.permission)) {
                    job.status = 'VERIFIED';
                    job.message = `回读核对通过,当前权限: [${current.join(', ')}]`;
                    this.store.audit('system', 'JOB_VERIFIED', `作业 ${job.id}: 回读核对通过`);
                }
                else {
                    job.status = 'PENDING';
                    job.message = '回读发现权限仍存在,重新执行收回';
                    this.store.audit('system', 'JOB_READBACK_MISMATCH', `作业 ${job.id}: 回读发现权限仍存在`);
                }
            }
        }
    }
    list(campaignId) {
        let jobs = [...this.store.jobs.values()];
        if (campaignId)
            jobs = jobs.filter((j) => j.campaignId === campaignId);
        return jobs
            .sort((a, b) => b.createdAt - a.createdAt)
            .map((j) => ({ ...j, systemName: this.store.systems.get(j.systemId)?.name ?? j.systemId }));
    }
};
exports.RevocationsService = RevocationsService;
RevocationsService.MAX_ATTEMPTS = 3;
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_5_SECONDS),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], RevocationsService.prototype, "processJobs", null);
exports.RevocationsService = RevocationsService = RevocationsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [store_service_1.StoreService,
        connectors_service_1.MockConnectorsService])
], RevocationsService);
//# sourceMappingURL=revocations.service.js.map