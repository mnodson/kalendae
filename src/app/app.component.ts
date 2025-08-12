import { Component, ElementRef, inject, OnInit, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { trigger, transition, style, animate } from '@angular/animations';

import { Firestore } from '@angular/fire/firestore';
import { CalendarComponent } from './calendar/calendar.component';
import { WeekViewComponent } from './week-view/week-view.component';
import { CommonModule } from '@angular/common';
import { EventDialogComponent } from './event-dialog/event-dialog.component';

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
  public calendarFullscreen: boolean = false;
  public selectedDate: Date | null = null;
  public eventDialogOpen = signal(false);

  constructor(private firestore: Firestore) {}
  
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
    this.eventDialogOpen.set(true);
    this.selectedDate = event;
  }

  handleEventDialogClose() {
    this.eventDialogOpen.set(false);
  }
}
