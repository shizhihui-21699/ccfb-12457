import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService, ReviewTask, User } from '../api.service';
import { SessionService } from '../session.service';

@Component({
  selector: 'app-my-tasks',
  imports: [FormsModule, DatePipe],
  template: `
    <h2>我的复核任务</h2>
    <p class="muted">待我处理 {{ pending().length }} 条 · 已处理 {{ done().length }} 条(每 5 秒自动刷新)</p>

    <div class="card">
      <h3>待处理</h3>
      @if (!pending().length) { <p class="muted">没有待处理的复核任务 🎉</p> }
      @for (t of pending(); track t.id) {
        <div class="task-row" [class.overdue]="t.overdue">
          <div class="task-main">
            <strong>{{ t.subjectName }}</strong> 在 <strong>{{ t.systemName }}</strong> 的权限
            <span class="tag blue">{{ t.permission }}</span>
            @if (t.overdue) { <span class="tag red">已逾期</span> }
            @if (t.escalationLevel > 0) { <span class="tag yellow">已升级 {{ t.escalationLevel }} 次</span> }
            <div class="muted">截止: {{ t.dueAt | date:'MM-dd HH:mm:ss' }} · 任务 {{ t.id }}</div>
          </div>
          <div class="task-actions">
            <button class="small" (click)="confirm(t)">确认保留</button>
            <button class="small danger" (click)="revoke(t)">确认撤销</button>
            <span class="delegate">
              <select [(ngModel)]="delegateTo[t.id]">
                <option value="">委托给…</option>
                @for (u of users(); track u.id) {
                  @if (u.id !== t.subjectUserId) { <option [value]="u.id">{{ u.name }}</option> }
                }
              </select>
              <button class="small ghost" (click)="delegate(t)">委托</button>
            </span>
          </div>
        </div>
      }
    </div>

    <div class="card">
      <h3>已处理</h3>
      <table>
        <thead><tr><th>被复核人</th><th>系统</th><th>权限</th><th>结论</th><th>处理时间</th></tr></thead>
        <tbody>
          @for (t of done(); track t.id) {
            <tr>
              <td>{{ t.subjectName }}</td><td>{{ t.systemName }}</td><td>{{ t.permission }}</td>
              <td><span class="tag" [class.green]="t.status==='CONFIRMED'" [class.red]="t.status==='REVOKED'">
                {{ t.status === 'CONFIRMED' ? '保留' : '撤销' }}
              </span></td>
              <td>{{ t.decidedAt | date:'MM-dd HH:mm:ss' }}</td>
            </tr>
          }
        </tbody>
      </table>
    </div>
  `,
  styles: [`
    .task-row { display: flex; justify-content: space-between; align-items: center; gap: 12px;
      padding: 10px 0; border-bottom: 1px solid #f1f5f9; flex-wrap: wrap; }
    .task-row.overdue { background: #fff7ed; }
    .task-main .muted { font-size: 12px; margin-top: 2px; }
    .task-actions { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
    .delegate { display: inline-flex; gap: 4px; }
  `],
})
export class MyTasksPage implements OnInit, OnDestroy {
  private api = inject(ApiService);
  private session = inject(SessionService);
  pending = signal<ReviewTask[]>([]);
  done = signal<ReviewTask[]>([]);
  users = signal<User[]>([]);
  delegateTo: Record<string, string> = {};
  private timer?: ReturnType<typeof setInterval>;

  ngOnInit() {
    this.load();
    this.api.users().subscribe((u) => this.users.set(u.filter((x) => x.active)));
    this.timer = setInterval(() => this.load(), 5000);
  }
  ngOnDestroy() { clearInterval(this.timer); }

  load() {
    const me = this.session.currentUserId();
    this.api.tasks({ assigneeId: me }).subscribe((ts) => {
      this.pending.set(ts.filter((t) => t.status === 'PENDING'));
      this.done.set(ts.filter((t) => t.status !== 'PENDING').slice().reverse());
    });
  }

  confirm(t: ReviewTask) {
    this.api.confirmTask(t.id, this.session.currentUserId()).subscribe({ next: () => this.load(), error: (e) => alert(e.error?.message) });
  }
  revoke(t: ReviewTask) {
    if (!confirm(`确认撤销 ${t.subjectName} 在 ${t.systemName} 的 ${t.permission}?撤销后将由连接器真正收回。`)) return;
    this.api.revokeTask(t.id, this.session.currentUserId()).subscribe({ next: () => this.load(), error: (e) => alert(e.error?.message) });
  }
  delegate(t: ReviewTask) {
    const to = this.delegateTo[t.id];
    if (!to) { alert('先选择被委托人'); return; }
    this.api.delegateTask(t.id, this.session.currentUserId(), to).subscribe({ next: () => this.load(), error: (e) => alert(e.error?.message) });
  }
}
