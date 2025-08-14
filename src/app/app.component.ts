import { Component, ElementRef, inject, OnInit, signal, ViewChild } from '@angular/core';
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
  public selectedDate: Date = new Date();
  public selectedEvent: any = null;
  public selectedMember: string | null = null;
  public eventDialogOpen = signal(false);

  @ViewChild(WeekViewComponent) weekViewComponent!: WeekViewComponent;

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
    this.selectedEvent = null;
    this.selectedMember = null;
    this.eventDialogOpen.set(true);
    this.selectedDate = event;
  }

  handleCellClick(cellData: {date: Date, member: string}) {
    this.selectedEvent = null;
    this.selectedMember = cellData.member;
    this.selectedDate = cellData.date;
    this.eventDialogOpen.set(true);
  }

  handleEventClick(event: any) {
    this.selectedEvent = event;
    this.selectedMember = null;
    this.selectedDate = new Date(event.startTime);
    this.eventDialogOpen.set(true);
  }

  handleEventDialogClose() {
    this.selectedEvent = null;
    this.selectedMember = null;
    this.eventDialogOpen.set(false);
  }

  handleEventSaved() {
    this.weekViewComponent.refreshEvents();
  }

  handleEventDeleted() {
    this.weekViewComponent.refreshEvents();
  }
}
