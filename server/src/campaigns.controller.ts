import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { CampaignsService } from './campaigns.service';
import { EscalationRule } from './model';

@Controller('api/campaigns')
export class CampaignsController {
  constructor(private readonly svc: CampaignsService) {}

  @Get()
  list() {
    return this.svc.list();
  }

  @Post()
  create(@Body() body: {
    name: string; quarter: string; ownerId: string;
    taskDueDays?: number; dayLengthSeconds?: number;
    escalationRules?: EscalationRule[]; actor?: string;
  }) {
    return this.svc.create(body);
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.svc.mustGet(id);
  }

  @Get(':id/stats')
  stats(@Param('id') id: string) {
    return this.svc.stats(id);
  }

  @Post(':id/start')
  start(@Param('id') id: string, @Body() body: { actor?: string }) {
    return this.svc.start(id, body?.actor);
  }

  @Post(':id/close')
  close(@Param('id') id: string, @Body() body: { actor?: string }) {
    return this.svc.close(id, body?.actor);
  }
}
