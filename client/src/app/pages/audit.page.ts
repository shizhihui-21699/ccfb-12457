import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ApiService, AuditEntry } from '../api.service';

@Component({
  selector: 'app-audit',
  imports: [DatePipe],
  template: `
    <h2>审计日志</h2>
    <div class="card">
      <table>
        <thead><tr><th>时间</th><th>操作人</th><th>动作</th><th>详情</th></tr></thead>
        <tbody>
          @for (a of entries(); track a.id) {
            <tr>
              <td class="muted">{{ a.at | date:'yyyy-MM-dd HH:mm:ss' }}</td>
              <td>{{ a.actor }}</td>
              <td><span class="tag gray">{{ a.action }}</span></td>
              <td>{{ a.detail }}</td>
            </tr>
          }
        </tbody>
      </table>
    </div>
  `,
})
export class AuditPage implements OnInit, OnDestroy {
  private api = inject(ApiService);
  entries = signal<AuditEntry[]>([]);
  private timer?: ReturnType<typeof setInterval>;

  ngOnInit() {
    this.load();
    this.timer = setInterval(() => this.load(), 5000);
  }
  ngOnDestroy() { clearInterval(this.timer); }
  load() { this.api.audit().subscribe((e) => this.entries.set(e)); }
}
