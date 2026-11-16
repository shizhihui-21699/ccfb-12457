import { Routes } from '@angular/router';
import { DashboardPage } from './pages/dashboard.page';
import { CampaignsPage } from './pages/campaigns.page';
import { MyTasksPage } from './pages/my-tasks.page';
import { TasksPage } from './pages/tasks.page';
import { JobsPage } from './pages/jobs.page';
import { OrgPage } from './pages/org.page';
import { AuditPage } from './pages/audit.page';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
  { path: 'dashboard', component: DashboardPage },
  { path: 'campaigns', component: CampaignsPage },
  { path: 'my-tasks', component: MyTasksPage },
  { path: 'tasks', component: TasksPage },
  { path: 'jobs', component: JobsPage },
  { path: 'org', component: OrgPage },
  { path: 'audit', component: AuditPage },
];
