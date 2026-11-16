import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { TasksService } from './tasks.service';

@Controller('api/tasks')
export class TasksController {
  constructor(private readonly svc: TasksService) {}

  @Get()
  query(
    @Query('campaignId') campaignId?: string,
    @Query('assigneeId') assigneeId?: string,
    @Query('subjectUserId') subjectUserId?: string,
    @Query('status') status?: string,
  ) {
    return this.svc.query({ campaignId, assigneeId, subjectUserId, status });
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.svc.get(id);
  }

  @Post(':id/confirm')
  confirm(@Param('id') id: string, @Body() body: { actor: string; note?: string }) {
    return this.svc.confirm(id, body.actor, body.note);
  }

  @Post(':id/revoke')
  revoke(@Param('id') id: string, @Body() body: { actor: string; note?: string }) {
    return this.svc.revoke(id, body.actor, body.note);
  }

  @Post(':id/delegate')
  delegate(@Param('id') id: string, @Body() body: { actor: string; toUserId: string; note?: string }) {
    return this.svc.delegate(id, body.actor, body.toUserId, body.note);
  }
}
