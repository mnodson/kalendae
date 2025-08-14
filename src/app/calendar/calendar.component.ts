import { CommonModule, DatePipe } from '@angular/common';
import { Component, EventEmitter, Output } from '@angular/core';
import { endOfHour, roundToNearestHours } from 'date-fns';

@Component({
  selector: 'app-calendar',
  imports: [DatePipe, CommonModule],
  templateUrl: './calendar.component.html',
  styleUrl: './calendar.component.scss',
})
export class CalendarComponent {
  @Output() openEventDialog = new EventEmitter<Date>();

  days: any[] = [];
  dates: any[] = [];
  currentMonth: Date = new Date();
  startOfMonthOffset: number = 0;
  daysOfWeek: string[] = [
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
    'Sunday',
  ];
  datesInCurrentMonth: Date[] = [];

  constructor() {
    this.generateCalendar();
  }

  generateCalendar() {
    const firstDayOfMonth = new Date(
      this.currentMonth.getFullYear(),
      this.currentMonth.getMonth(),
      1
    );
    const lastDayOfMonth = new Date(
      this.currentMonth.getFullYear(),
      this.currentMonth.getMonth() + 1,
      1
    );
    lastDayOfMonth.setDate(lastDayOfMonth.getDate() - 1);

    const startDay = firstDayOfMonth.toLocaleString('en-US', {
      weekday: 'long',
    });
    this.startOfMonthOffset = this.daysOfWeek.indexOf(startDay) + 1;

    this.datesInCurrentMonth = Array.from(
      { length: lastDayOfMonth.getDate() },
      (_, i) =>
        new Date(
          this.currentMonth.getFullYear(),
          this.currentMonth.getMonth(),
          i + 1
        )
    );
  }

  prevMonth() {
    const current = this.currentMonth.getMonth();
    this.currentMonth = new Date(
      this.currentMonth.getFullYear(),
      current - 1,
      this.currentMonth.getDate()
    );

    this.generateCalendar();
  }

  nextMonth() {
    const current = this.currentMonth.getMonth();
    this.currentMonth = new Date(
      this.currentMonth.getFullYear(),
      current + 1,
      this.currentMonth.getDate()
    );

    this.generateCalendar();
  }

  today() {
    this.currentMonth = new Date();
    this.generateCalendar();
  }

  isToday(date: Date): any {
    return (
      date.getDate() === new Date().getDate() &&
      date.getMonth() === new Date().getMonth() &&
      date.getFullYear() === new Date().getFullYear()
    );
  }

  selectDate(selectedDate: Date) {
    const nextClosetHour = roundToNearestHours(new Date(), { roundingMethod: 'ceil' });
    
    const selectedDateWithTime = new Date(
      selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate(),
      nextClosetHour.getHours(), nextClosetHour.getMinutes());
    this.openEventDialog.emit(selectedDateWithTime);
  }
}
