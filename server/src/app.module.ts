import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { StoreService } from './store.service';
import { MockConnectorsService } from './connectors.service';
import { CampaignsService } from './campaigns.service';
import { TasksService } from './tasks.service';
import { RevocationsService } from './revocations.service';
import { EscalationService } from './escalation.service';
import { OrgService } from './org.service';
import { CampaignsController } from './campaigns.controller';
import { TasksController } from './tasks.controller';
import { MiscController } from './misc.controller';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    // 生产模式: 直接托管 Angular 构建产物,一个端口跑全栈
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', '..', 'client', 'dist', 'client', 'browser'),
      exclude: ['/api/{*path}'],
    }),
  ],
  controllers: [CampaignsController, TasksController, MiscController],
  providers: [
    StoreService, MockConnectorsService, CampaignsService, TasksService,
    RevocationsService, EscalationService, OrgService,
  ],
})
export class AppModule {}
