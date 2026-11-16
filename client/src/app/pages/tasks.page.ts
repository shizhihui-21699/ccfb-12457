import { Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService, Campaign, ReviewTask } from '../api.service';

@Component({
  selector: 'app-tasks',
  imports: [FormsModule, DatePipe],
  template: `
    <h2>全部复核任务</h2>
    <div class="form-row">
      <label>活动
        <select [(ngModel)]="campaignId" (ngModelChange)="load()">
          <option value="">全部</option>
          @for (c of campaigns(); track c.id) { <option [value]="c.id">{{ c.name }}</option> }
        </select>
      </label>
      <label>状态
        <select [(ngModel)]="status" (ngModelChange)="load()">
          <option value="">全部</option>
          <option value="PENDING">待复核</option>
          <option value="CONFIRMED">确认保留</option>
          <option value="REVOKED">确认撤销</option>
        </select>
      </label>
      <button class="ghost" (click)="load()">刷新</button>
    </div>

    <div class="card">
      <table>
        <thead>
          <tr><th>被复核人</th><th>系统</th><th>权限</th><th>当前复核人</th><th>状态</th><th>逾期</th><th>流转记录</th></tr>
        </thead>
        <tbody>
          @for (t of tasks(); track t.id) {
            <tr>
              <td>{{ t.subjectName }}</td>
              <td>{{ t.systemName }}</td>
              <td><span class="tag blue">{{ t.permission }}</span></td>
              <td>{{ t.assigneeName }}</td>
              <td><span class="tag" [class.yellow]="t.status==='PENDING'" [class.green]="t.status==='CONFIRMED'" [class.red]="t.status==='REVOKED'">{{ t.status }}</span></td>
              <td>@if (t.overdue) { <span class="tag red">逾期</span> }</td>
              <td>
                <details>
                  <summary class="muted">{{ t.history.length }} 条</summary>
                  @for (h of t.history; track $index) {
                    <div class="muted" style="font-size:12px">
                      {{ h.at | date:'MM-dd HH:mm:ss' }} · {{ h.action }} · {{ h.detail }}
                    </div>
                  }
                </details>
              </td>
            </tr>
          }
        </tbody>
      </table>
      @if (!tasks().length) { <p class="muted">没有符合条件的任务</p> }
    </div>
  `,
})
export class TasksPage implements OnInit {
  private api = inject(ApiService);
  campaigns = signal<Campaign[]>([]);
  tasks = signal<ReviewTask[]>([]);
  campaignId = '';
  status = '';

  ngOnInit() {
    this.api.campaigns().subscribe((cs) => this.campaigns.set(cs));
    this.load();
  }
  load() {
    this.api.tasks({ campaignId: this.campaignId || undefined, status: this.status || undefined })
      .subscribe((ts) => this.tasks.set(ts));
  }
}
