import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService, SystemInfo, User } from '../api.service';
import { SessionService } from '../session.service';

@Component({
  selector: 'app-org',
  imports: [FormsModule],
  template: `
    <h2>组织架构</h2>
    <p class="muted">
      复核活动进行中调整组织架构,未完成的复核任务会跟着转:
      换主管 → 任务转给新主管;员工离职 → 其名下任务转给其上级。
    </p>

    <div class="card">
      <h3>人员</h3>
      <table>
        <thead><tr><th>姓名</th><th>邮箱</th><th>部门</th><th>直属主管</th><th>状态</th><th>操作</th></tr></thead>
        <tbody>
          @for (u of users(); track u.id) {
            <tr [style.opacity]="u.active ? 1 : 0.45">
              <td>{{ u.name }}</td>
              <td class="muted">{{ u.email }}</td>
              <td>{{ u.departmentName }}</td>
              <td>
                <select [ngModel]="u.managerId" (ngModelChange)="changeManager(u, $event)" [disabled]="!u.active">
                  <option [ngValue]="null">(无)</option>
                  @for (m of users(); track m.id) {
                    @if (m.id !== u.id && m.active) { <option [ngValue]="m.id">{{ m.name }}</option> }
                  }
                </select>
              </td>
              <td><span class="tag" [class.green]="u.active" [class.gray]="!u.active">{{ u.active ? '在职' : '离职' }}</span></td>
              <td>
                @if (u.active) {
                  <button class="small ghost" (click)="deactivate(u)">办理离职</button>
                }
              </td>
            </tr>
          }
        </tbody>
      </table>
      <p class="muted">{{ message() }}</p>
    </div>

    <div class="card">
      <h3>目标系统当前权限(连接器实时回读)</h3>
      <div class="form-row">
        <label>系统
          <select [(ngModel)]="systemId" (ngModelChange)="loadPerms()">
            @for (s of systems(); track s.id) { <option [value]="s.id">{{ s.name }}</option> }
          </select>
        </label>
        <button class="ghost" (click)="loadPerms()">回读</button>
      </div>
      <table>
        <thead><tr><th>账号</th><th>权限</th></tr></thead>
        <tbody>
          @for (p of perms(); track p.account + p.permission) {
            <tr><td>{{ p.account }}</td><td><span class="tag blue">{{ p.permission }}</span></td></tr>
          }
        </tbody>
      </table>
    </div>
  `,
})
export class OrgPage implements OnInit {
  private api = inject(ApiService);
  private session = inject(SessionService);
  users = signal<User[]>([]);
  systems = signal<SystemInfo[]>([]);
  perms = signal<{ account: string; permission: string }[]>([]);
  message = signal('');
  systemId = 'sys-erp';

  ngOnInit() {
    this.load();
    this.api.systems().subscribe((s) => this.systems.set(s));
    this.loadPerms();
  }

  load() { this.api.users().subscribe((u) => this.users.set(u)); }
  loadPerms() { this.api.systemPermissions(this.systemId).subscribe((p) => this.perms.set(p)); }

  changeManager(u: User, newManagerId: string | null) {
    this.api.changeManager(u.id, newManagerId, this.session.currentUserId()).subscribe({
      next: (r: any) => {
        this.message.set(`${u.name} 的主管已调整,${r.movedTasks} 条复核任务跟随转移`);
        this.load();
      },
      error: (e) => { this.message.set(e.error?.message ?? '调整失败'); this.load(); },
    });
  }

  deactivate(u: User) {
    if (!confirm(`确认 ${u.name} 离职?其名下未完成的复核任务将转给其上级。`)) return;
    this.api.deactivate(u.id, this.session.currentUserId()).subscribe({
      next: (r: any) => {
        this.message.set(`${u.name} 已离职,${r.movedTasks} 条复核任务转移给上级`);
        this.load();
      },
      error: (e) => this.message.set(e.error?.message ?? '操作失败'),
    });
  }
}
