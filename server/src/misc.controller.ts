import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { StoreService } from './store.service';
import { OrgService } from './org.service';
import { RevocationsService } from './revocations.service';
import { MockConnectorsService } from './connectors.service';

@Controller('api')
export class MiscController {
  constructor(
    private readonly store: StoreService,
    private readonly org: OrgService,
    private readonly revocations: RevocationsService,
    private readonly connectors: MockConnectorsService,
  ) {}

  @Get('org/users')
  users() {
    return [...this.store.users.values()].map((u) => ({
      ...u,
      managerName: u.managerId ? this.store.userName(u.managerId) : null,
      departmentName: this.store.departments.get(u.departmentId)?.name,
    }));
  }

  @Get('org/departments')
  departments() {
    return [...this.store.departments.values()];
  }

  @Patch('org/users/:id/manager')
  changeManager(@Param('id') id: string, @Body() body: { newManagerId: string | null; actor?: string }) {
    return this.org.changeManager(id, body.newManagerId, body.actor);
  }

  @Post('org/users/:id/deactivate')
  deactivate(@Param('id') id: string, @Body() body: { actor?: string }) {
    return this.org.deactivate(id, body?.actor);
  }

  @Get('systems')
  systems() {
    return [...this.store.systems.values()];
  }

  @Get('systems/:id/permissions')
  systemPermissions(@Param('id') id: string) {
    return this.connectors.listPermissions(id);
  }

  @Get('jobs')
  jobs(@Query('campaignId') campaignId?: string) {
    return this.revocations.list(campaignId);
  }

  @Get('audit')
  audit(@Query('limit') limit?: string) {
    const n = limit ? parseInt(limit, 10) : 100;
    return this.store.auditLog.slice(-n).reverse();
  }

  @Get('notifications')
  notifications(@Query('userId') userId?: string) {
    let list = this.store.notifications;
    if (userId) list = list.filter((n) => n.toUserId === userId);
    return list.slice(-50).reverse();
  }
}
