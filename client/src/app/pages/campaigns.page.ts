import { Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService, Campaign, EscalationRule, User } from '../api.service';
import { SessionService } from '../session.service';

@Component({
  selector: 'app-campaigns',
  imports: [FormsModule, DatePipe],
  template: `
    <h2>复核活动</h2>

    <div class="card">
      <h3>发起新活动</h3>
      <div class="form-row">
        <label>活动名称 <input [(ngModel)]="form.name" placeholder="2026年Q4权限复核" /></label>
        <label>季度 <input [(ngModel)]="form.quarter" placeholder="2026Q4" /></label>
        <label>负责人
          <select [(ngModel)]="form.ownerId">
            @for (u of users(); track u.id) { <option [value]="u.id">{{ u.name }}</option> }
          </select>
        </label>
        <label>复核期限(天) <input type="number" [(ngModel)]="form.taskDueDays" style="width:70px" /></label>
        <label>1天 = N 秒(演示加速) <input type="number" [(ngModel)]="form.dayLengthSeconds" style="width:80px" /></label>
      </div>
      <h3>超时升级规则</h3>
      @for (r of form.escalationRules; track $index; let i = $index) {
        <div class="form-row">
          <label>逾期(天) <input type="number" [(ngModel)]="r.afterDaysOverdue" style="width:70px" /></label>
          <label>动作
            <select [(ngModel)]="r.action">
              <option value="REMIND">提醒复核人</option>
              <option value="ESCALATE_TO_MANAGER">升级给复核人的上级</option>
              <option value="ESCALATE_TO_OWNER">升级给活动负责人</option>
            </select>
          </label>
          <button class="ghost small" (click)="form.escalationRules.splice(i, 1)">删除</button>
        </div>
      }
      <div class="form-row">
        <button class="ghost small" (click)="addRule()">+ 加一级规则</button>
        <button (click)="create()">创建活动</button>
        <span class="muted">{{ message() }}</span>
      </div>
    </div>

    <div class="card">
      <h3>活动列表</h3>
      <table>
        <thead><tr><th>名称</th><th>季度</th><th>状态</th><th>负责人</th><th>创建时间</th><th>操作</th></tr></thead>
        <tbody>
          @for (c of campaigns(); track c.id) {
            <tr>
              <td>{{ c.name }}</td>
              <td>{{ c.quarter }}</td>
              <td><span class="tag" [class.green]="c.status==='ACTIVE'" [class.gray]="c.status==='CLOSED'">{{ c.status }}</span></td>
              <td>{{ userName(c.ownerId) }}</td>
              <td>{{ c.createdAt | date:'yyyy-MM-dd HH:mm' }}</td>
              <td>
                @if (c.status === 'DRAFT') {
                  <button class="small" (click)="start(c)">发起(生成任务)</button>
                }
                @if (c.status === 'ACTIVE') {
                  <button class="small danger" (click)="close(c)">关闭</button>
                }
              </td>
            </tr>
          }
        </tbody>
      </table>
    </div>
  `,
})
export class CampaignsPage implements OnInit {
  private api = inject(ApiService);
  private session = inject(SessionService);
  campaigns = signal<Campaign[]>([]);
  users = signal<User[]>([]);
  message = signal('');
  form = {
    name: '', quarter: '', ownerId: 'u-ceo', taskDueDays: 7, dayLengthSeconds: 30,
    escalationRules: [
      { afterDaysOverdue: 0, action: 'REMIND' },
      { afterDaysOverdue: 2, action: 'ESCALATE_TO_MANAGER' },
      { afterDaysOverdue: 4, action: 'ESCALATE_TO_OWNER' },
    ] as EscalationRule[],
  };

  ngOnInit() {
    this.load();
    this.api.users().subscribe((u) => this.users.set(u.filter((x) => x.active)));
  }

  load() { this.api.campaigns().subscribe((cs) => this.campaigns.set(cs)); }
  userName(id: string) { return this.users().find((u) => u.id === id)?.name ?? id; }
  addRule() { this.form.escalationRules.push({ afterDaysOverdue: 1, action: 'REMIND' }); }

  create() {
    this.api.createCampaign({ ...this.form, actor: this.session.currentUserId() }).subscribe({
      next: () => { this.message.set('创建成功'); this.load(); },
      error: (e) => this.message.set(e.error?.message ?? '创建失败'),
    });
  }
  start(c: Campaign) {
    this.api.startCampaign(c.id, this.session.currentUserId()).subscribe({
      next: () => this.load(),
      error: (e) => alert(e.error?.message ?? '发起失败'),
    });
  }
  close(c: Campaign) {
    this.api.closeCampaign(c.id, this.session.currentUserId()).subscribe({
      next: () => this.load(),
      error: (e) => alert(e.error?.message ?? '关闭失败'),
    });
  }
}
