"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StoreService = void 0;
const common_1 = require("@nestjs/common");
let StoreService = class StoreService {
    constructor() {
        this.departments = new Map();
        this.users = new Map();
        this.systems = new Map();
        this.campaigns = new Map();
        this.tasks = new Map();
        this.jobs = new Map();
        this.auditLog = [];
        this.notifications = [];
        this.seq = 0;
    }
    nextId(prefix) {
        return `${prefix}-${++this.seq}-${Date.now().toString(36)}`;
    }
    audit(actor, action, detail) {
        this.auditLog.push({ id: this.auditLog.length + 1, at: Date.now(), actor, action, detail });
    }
    notify(toUserId, message) {
        this.notifications.push({
            id: this.notifications.length + 1,
            at: Date.now(), toUserId, message, read: false,
        });
    }
    userName(id) {
        return this.users.get(id)?.name ?? id;
    }
    onModuleInit() {
        this.seed();
    }
    seed() {
        const depts = [
            { id: 'd-root', name: '总部', parentId: null },
            { id: 'd-tech', name: '技术部', parentId: 'd-root' },
            { id: 'd-fin', name: '财务部', parentId: 'd-root' },
            { id: 'd-sales', name: '销售部', parentId: 'd-root' },
            { id: 'd-hr', name: '人事部', parentId: 'd-root' },
        ];
        depts.forEach((d) => this.departments.set(d.id, d));
        const users = [
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
        const systems = [
            { id: 'sys-erp', name: 'ERP系统', description: '财务/供应链核心系统' },
            { id: 'sys-crm', name: 'CRM系统', description: '客户关系管理' },
            { id: 'sys-git', name: 'GitLab代码仓库', description: '源码与CI/CD' },
            { id: 'sys-oa', name: 'OA办公系统', description: '老系统,连接器偶发失败(演示重试)' },
            { id: 'sys-bi', name: 'BI报表平台', description: '数据分析与报表' },
        ];
        systems.forEach((s) => this.systems.set(s.id, s));
        this.audit('system', 'SEED', `初始化 ${users.length} 个用户, ${systems.length} 个系统`);
    }
};
exports.StoreService = StoreService;
exports.StoreService = StoreService = __decorate([
    (0, common_1.Injectable)()
], StoreService);
//# sourceMappingURL=store.service.js.map