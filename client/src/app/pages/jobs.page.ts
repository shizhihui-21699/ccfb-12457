import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService, Campaign, RevocationJob } from '../api.service';

@Component({
  selector: 'app-jobs',
  imports: [FormsModule, DatePipe],
  template: `
    <h2>撤销作业(连接器执行 + 回读核对)</h2>
    <div class="form-row">
      <label>活动
        <select [(ngModel)]="campaignId" (ngModelChange)="load()">
          <option value="">全部</option>
          @for (c of campaigns(); track c.id) { <option [value]="c.id">{{ c.name }}</option> }
        </select>
      </label>
      <button class="ghost" (click)="load()">刷新</button>
      <span class="muted">每 5 秒自动刷新 · 状态流转: PENDING → REVOKED → VERIFIED(回读核对通过) / FAILED</span>
    </div>

    <div class="card">
      <table>
        <thead><tr><th>作业</th><th>系统</th><th>账号</th><th>权限</th><th>状态</th><th>尝试</th><th>信息</th><th>更新时间</th></tr></thead>
        <tbody>
          @for (j of jobs(); track j.id) {
            <tr>
              <td>{{ j.id }}</td>
              <td>{{ j.systemName }}</td>
              <td>{{ j.account }}</td>
              <td><span class="tag blue">{{ j.permission }}</span></td>
              <td>
                <span class="tag"
                  [class.yellow]="j.status==='PENDING' || j.status==='REVOKED'"
                  [class.green]="j.status==='VERIFIED'"
                  [class.red]="j.status==='FAILED'">{{ j.status }}</span>
              </td>
              <td>{{ j.attempts }}</td>
              <td class="muted">{{ j.message }}</td>
              <td>{{ j.updatedAt | date:'MM-dd HH:mm:ss' }}</td>
            </tr>
          }
        </tbody>
      </table>
      @if (!jobs().length) { <p class="muted">暂无撤销作业 —— 在「我的复核」里确认撤销一条权限试试</p> }
    </div>
  `,
})
export class JobsPage implements OnInit, OnDestroy {
  private api = inject(ApiService);
  campaigns = signal<Campaign[]>([]);
  jobs = signal<RevocationJob[]>([]);
  campaignId = '';
  private timer?: ReturnType<typeof setInterval>;

  ngOnInit() {
    this.api.campaigns().subscribe((cs) => this.campaigns.set(cs));
    this.load();
    this.timer = setInterval(() => this.load(), 5000);
  }
  ngOnDestroy() { clearInterval(this.timer); }
  load() {
    this.api.jobs(this.campaignId || undefined).subscribe((j) => this.jobs.set(j));
  }
}
