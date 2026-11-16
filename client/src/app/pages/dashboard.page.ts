import { Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService, Campaign, CampaignStats } from '../api.service';

@Component({
  selector: 'app-dashboard',
  imports: [FormsModule, DatePipe],
  template: `
    <h2>仪表盘</h2>
    <div class="form-row">
      <label>复核活动
        <select [ngModel]="selectedId()" (ngModelChange)="pick($event)">
          @for (c of campaigns(); track c.id) {
            <option [value]="c.id">{{ c.name }} ({{ c.quarter }})</option>
          }
        </select>
      </label>
      <button class="ghost" (click)="load()">刷新</button>
    </div>

    @if (stats(); as s) {
      <div class="stat-cards">
        <div class="stat"><div class="num">{{ s.tasks.total }}</div><div class="label">任务总数</div></div>
        <div class="stat"><div class="num" style="color:#d97706">{{ s.tasks.pending }}</div><div class="label">待复核</div></div>
        <div class="stat"><div class="num" style="color:#dc2626">{{ s.tasks.overdue }}</div><div class="label">已逾期</div></div>
        <div class="stat"><div class="num" style="color:#16a34a">{{ s.tasks.confirmed }}</div><div class="label">确认保留</div></div>
        <div class="stat"><div class="num" style="color:#7c3aed">{{ s.tasks.revoked }}</div><div class="label">确认撤销</div></div>
        <div class="stat"><div class="num" style="color:#16a34a">{{ s.jobs.verified }}/{{ s.jobs.total }}</div><div class="label">撤销已回读核对</div></div>
        <div class="stat"><div class="num" style="color:#dc2626">{{ s.jobs.failed }}</div><div class="label">撤销失败</div></div>
      </div>

      <div class="card">
        <h3>各复核人进度</h3>
        <table>
          <thead><tr><th>复核人</th><th>任务数</th><th>待处理</th><th>完成率</th></tr></thead>
          <tbody>
            @for (a of s.byAssignee; track a.userId) {
              <tr>
                <td>{{ a.userName }}</td>
                <td>{{ a.total }}</td>
                <td>{{ a.pending }}</td>
                <td>
                  <div style="background:#f1f5f9;border-radius:4px;height:10px;width:160px">
                    <div style="background:#3b82f6;height:10px;border-radius:4px"
                         [style.width.%]="a.total ? (a.total - a.pending) / a.total * 100 : 0"></div>
                  </div>
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>

      <div class="card">
        <h3>活动信息</h3>
        <p>状态: <span class="tag" [class.green]="s.campaign.status==='ACTIVE'" [class.gray]="s.campaign.status==='CLOSED'">{{ s.campaign.status }}</span>
           复核期限: {{ s.campaign.taskDueDays }} 天 · 1 天 = {{ s.campaign.dayLengthSeconds }} 秒(演示加速)</p>
        <p class="muted">升级规则:
          @for (r of s.campaign.escalationRules; track $index) {
            <span class="tag yellow">逾期{{ r.afterDaysOverdue }}天 → {{ r.action }}</span>
          }
        </p>
        @if (s.campaign.startedAt) { <p class="muted">发起时间: {{ s.campaign.startedAt | date:'yyyy-MM-dd HH:mm:ss' }}</p> }
      </div>
    } @else {
      <p class="muted">还没有复核活动,请到「复核活动」页创建。</p>
    }
  `,
})
export class DashboardPage implements OnInit {
  private api = inject(ApiService);
  campaigns = signal<Campaign[]>([]);
  selectedId = signal<string>('');
  stats = signal<CampaignStats | null>(null);

  ngOnInit() {
    this.api.campaigns().subscribe((cs) => {
      this.campaigns.set(cs);
      const active = cs.find((c) => c.status === 'ACTIVE') ?? cs[0];
      if (active) this.pick(active.id);
    });
  }

  pick(id: string) {
    this.selectedId.set(id);
    this.load();
  }

  load() {
    if (!this.selectedId()) return;
    this.api.campaignStats(this.selectedId()).subscribe((s) => this.stats.set(s));
  }
}
