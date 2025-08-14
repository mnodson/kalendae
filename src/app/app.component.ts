import {
  Component,
  ElementRef,
  inject,
  OnInit,
  signal,
  ViewChild,
} from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { trigger, transition, style, animate } from '@angular/animations';

import { Firestore } from '@angular/fire/firestore';
import { CalendarComponent } from './calendar/calendar.component';
import { WeekViewComponent } from './week-view/week-view.component';
import { CommonModule } from '@angular/common';
import { EventDialogComponent } from './event-dialog/event-dialog.component';
import { AuthGoogleService } from './auth-google.service';

@Component({
  selector: 'app-root',
  imports: [
    RouterOutlet,
    CalendarComponent,
    WeekViewComponent,
    CommonModule,
    EventDialogComponent,
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
  standalone: true,
})
export class AppComponent implements OnInit {
  public calendarFullscreen: boolean = true;
  public selectedDate: Date = new Date();
  public selectedEvent: any = null;
  public selectedMember: string | null = null;
  public eventDialogOpen = signal(false);
  private authService = inject(AuthGoogleService);

  profile = this.authService.profile;
  name = this.authService.name;

  @ViewChild(WeekViewComponent) weekViewComponent!: WeekViewComponent;
  @ViewChild(CalendarComponent) calendarComponent!: CalendarComponent;

  constructor(private firestore: Firestore) {}

  loginWithGoogle() {
    this.authService.login();
  }

  logout() {
    this.authService.logout();
  }

  ngOnInit() {
    // Initialize Firestore or perform any setup needed
    // this.firestore.collection('exampleCollection').valueChanges().subscribe(data => {
    //     console.log('Data from Firestore:', data);
    // });
  }

  toggleCalendarFullscreen() {
    this.calendarFullscreen = !this.calendarFullscreen;
    if (this.calendarFullscreen) {
    } else {
    }
  }

  handleEventDialogOpen(event: Date) {
    this.selectedEvent = null;
    this.selectedMember = null;
    this.eventDialogOpen.set(true);
    this.selectedDate = event;

    // Update week view to show the selected date's week
    this.weekViewComponent.updateToDate(event);
  }

  handleCellClick(cellData: { date: Date; member: string }) {
    this.selectedEvent = null;
    this.selectedMember = cellData.member;
    this.selectedDate = cellData.date;
    this.eventDialogOpen.set(true);

    // Ensure week view is showing the correct week for the selected date
    //this.weekViewComponent.updateToDate(cellData.date);
  }

  handleEventClick(event: any) {
    this.selectedEvent = event;
    this.selectedMember = null;
    this.selectedDate = new Date(event.startTime);
    this.eventDialogOpen.set(true);

    // Update week view to show the event's week
    this.weekViewComponent.updateToDate(new Date(event.startTime));
  }

  handleEventDialogClose() {
    this.selectedEvent = null;
    this.selectedMember = null;
    this.eventDialogOpen.set(false);
  }

  handleEventSaved() {
    this.weekViewComponent.refreshEvents();
    this.calendarComponent.refreshEvents();
  }

  handleEventDeleted() {
    this.weekViewComponent.refreshEvents();
    this.calendarComponent.refreshEvents();
  }
}
