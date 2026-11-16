"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const serve_static_1 = require("@nestjs/serve-static");
const path_1 = require("path");
const store_service_1 = require("./store.service");
const connectors_service_1 = require("./connectors.service");
const campaigns_service_1 = require("./campaigns.service");
const tasks_service_1 = require("./tasks.service");
const revocations_service_1 = require("./revocations.service");
const escalation_service_1 = require("./escalation.service");
const org_service_1 = require("./org.service");
const campaigns_controller_1 = require("./campaigns.controller");
const tasks_controller_1 = require("./tasks.controller");
const misc_controller_1 = require("./misc.controller");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            schedule_1.ScheduleModule.forRoot(),
            serve_static_1.ServeStaticModule.forRoot({
                rootPath: (0, path_1.join)(__dirname, '..', '..', 'client', 'dist', 'client', 'browser'),
                exclude: ['/api/{*path}'],
            }),
        ],
        controllers: [campaigns_controller_1.CampaignsController, tasks_controller_1.TasksController, misc_controller_1.MiscController],
        providers: [
            store_service_1.StoreService, connectors_service_1.MockConnectorsService, campaigns_service_1.CampaignsService, tasks_service_1.TasksService,
            revocations_service_1.RevocationsService, escalation_service_1.EscalationService, org_service_1.OrgService,
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map