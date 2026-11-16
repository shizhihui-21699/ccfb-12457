import { Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApiService, User, Notification } from './api.service';
import { SessionService } from './session.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, FormsModule, DatePipe],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App implements OnInit {
  readonly api = inject(ApiService);
  readonly session = inject(SessionService);
  users = signal<User[]>([]);
  notifications = signal<Notification[]>([]);
  showNotifications = signal(false);

  ngOnInit() {
    this.api.users().subscribe((u) => this.users.set(u));
    setInterval(() => this.loadNotifications(), 5000);
    this.loadNotifications();
  }

  loadNotifications() {
    this.api.notifications(this.session.currentUserId()).subscribe((n) => this.notifications.set(n));
  }

  onUserChange(id: string) {
    this.session.setUser(id);
    this.loadNotifications();
  }
}
