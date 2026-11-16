import { Injectable, signal } from '@angular/core';

/** 当前登录身份(演示平台无认证,用右上角下拉切换身份) */
@Injectable({ providedIn: 'root' })
export class SessionService {
  readonly currentUserId = signal<string>(localStorage.getItem('ar-user') ?? 'u-ceo');

  setUser(id: string) {
    this.currentUserId.set(id);
    try { localStorage.setItem('ar-user', id); } catch {}
  }
}
