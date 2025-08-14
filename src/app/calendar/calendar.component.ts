import { CommonModule, DatePipe } from '@angular/common';
import { Component, EventEmitter, Output, OnInit } from '@angular/core';
import { endOfHour, roundToNearestHours, isSameDay, startOfDay, addDays, format } from 'date-fns';

interface Event {
  id: string;
  title: string;
  description: string;
  location: string;
  isAllDay: boolean;
  startTime: string | null;
  endTime: string | null;
  participants: string[];
  createdAt: string;
}

@Component({
  selector: 'app-calendar',
  imports: [DatePipe, CommonModule],
  templateUrl: './calendar.component.html',
  styleUrl: './calendar.component.scss',
})
export class CalendarComponent implements OnInit {
  @Output() openEventDialog = new EventEmitter<Date>();
  @Output() eventClicked = new EventEmitter<Event>();

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
  events: Event[] = [];
  
  public readonly familyMembers: string[] = [
    'Donna',
    'Mark',
    'Zara',
    'Macy',
    'Julia'
  ];

  constructor() {}
  
  ngOnInit() {
    this.generateCalendar();
    this.loadEvents();
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

  private loadEvents(): void {
    const stored = localStorage.getItem('kalendae_events');
    this.events = stored ? JSON.parse(stored) : [];
  }

  public refreshEvents(): void {
    this.loadEvents();
  }

  getFamilyMembersWithEventsOnDate(date: Date): string[] {
    const membersWithEvents: string[] = [];
    
    for (const member of this.familyMembers) {
      const hasEvents = this.events.some(event => {
        if (!event.startTime || !event.participants.includes(member)) return false;
        
        // Handle both single-day and multi-day events
        let eventStartDate: Date;
        let eventEndDate: Date;
        
        if (event.isAllDay) {
          // For all-day events, parse dates as local to avoid timezone issues
          const startDateString = event.startTime.split('T')[0];
          const [startYear, startMonth, startDay] = startDateString.split('-').map(Number);
          eventStartDate = new Date(startYear, startMonth - 1, startDay);
          
          if (event.endTime) {
            const endDateString = event.endTime.split('T')[0];
            const [endYear, endMonth, endDay] = endDateString.split('-').map(Number);
            eventEndDate = new Date(endYear, endMonth - 1, endDay);
          } else {
            eventEndDate = eventStartDate;
          }
        } else {
          eventStartDate = startOfDay(new Date(event.startTime));
          eventEndDate = event.endTime ? startOfDay(new Date(event.endTime)) : eventStartDate;
        }
        
        const currentDay = startOfDay(date);
        return currentDay >= eventStartDate && currentDay <= eventEndDate;
      });
      
      if (hasEvents) {
        membersWithEvents.push(member);
      }
    }
    
    return membersWithEvents;
  }

  getFamilyMemberColor(memberName: string): string {
    const colorMap: { [key: string]: string } = {
      'Donna': '#ff9800', // Orange
      'Mark': '#4caf50',  // Green
      'Zara': '#2196f3',  // Blue
      'Macy': '#e91e63',  // Pink
      'Julia': '#9c27b0'  // Purple
    };
    return colorMap[memberName] || '#757575';
  }

  getUpcomingEventsForMember(member: string, daysAhead: number = 7): Event[] {
    const today = startOfDay(new Date());
    const futureDate = addDays(today, daysAhead);

    const upcomingEvents = this.events.filter(event => {
      if (!event.startTime || !event.participants.includes(member)) return false;
      
      let eventDate: Date;
      if (event.isAllDay) {
        const dateString = event.startTime.split('T')[0];
        const [year, month, day] = dateString.split('-').map(Number);
        eventDate = new Date(year, month - 1, day);
      } else {
        eventDate = startOfDay(new Date(event.startTime));
      }
      
      return eventDate > today && eventDate <= futureDate;
    });

    return upcomingEvents.sort((a, b) => {
      const aDate = new Date(a.startTime!).getTime();
      const bDate = new Date(b.startTime!).getTime();
      return aDate - bDate;
    }).slice(0, 3); // Limit to 3 upcoming events per member
  }

  formatUpcomingEventDate(event: Event): string {
    if (!event.startTime) return '';
    
    let eventDate: Date;
    if (event.isAllDay) {
      const dateString = event.startTime.split('T')[0];
      const [year, month, day] = dateString.split('-').map(Number);
      eventDate = new Date(year, month - 1, day);
    } else {
      eventDate = new Date(event.startTime);
    }
    
    const today = startOfDay(new Date());
    const tomorrow = addDays(today, 1);
    
    if (isSameDay(eventDate, tomorrow)) {
      return 'Tomorrow';
    } else if (eventDate.getTime() - today.getTime() < 7 * 24 * 60 * 60 * 1000) {
      return format(eventDate, 'EEEE'); // Day name for this week
    } else {
      return format(eventDate, 'MMM d'); // Month and day for further dates
    }
  }

  formatEventTime(event: Event): string {
    if (event.isAllDay) {
      return 'All Day';
    }
    const startTime = new Date(event.startTime!);
    const endTime = new Date(event.endTime!);
    return `${format(startTime, 'h:mm a')} - ${format(endTime, 'h:mm a')}`;
  }

  getOtherParticipants(event: Event, currentMember: string): string[] {
    return event.participants.filter(participant => participant !== currentMember);
  }

  getFamilyMemberAvatarIndex(memberName: string): number {
    const memberMap: { [key: string]: number } = {
      'Donna': 0,
      'Mark': 1,
      'Zara': 2,
      'Macy': 3,
      'Julia': 4
    };
    return memberMap[memberName] ?? 0;
  }

  onEventClick(event: Event): void {
    this.eventClicked.emit(event);
  }

  getAllUpcomingEvents(daysAhead: number = 14): Event[] {
    const today = startOfDay(new Date());
    const futureDate = addDays(today, daysAhead);

    const upcomingEvents = this.events.filter(event => {
      if (!event.startTime) return false;
      
      let eventDate: Date;
      if (event.isAllDay) {
        const dateString = event.startTime.split('T')[0];
        const [year, month, day] = dateString.split('-').map(Number);
        eventDate = new Date(year, month - 1, day);
      } else {
        eventDate = startOfDay(new Date(event.startTime));
      }
      
      return eventDate > today && eventDate <= futureDate;
    });

    return upcomingEvents.sort((a, b) => {
      const aDate = new Date(a.startTime!).getTime();
      const bDate = new Date(b.startTime!).getTime();
      return aDate - bDate;
    });
  }

  getEventParticipantColors(event: Event): string[] {
    return event.participants.map(participant => this.getFamilyMemberColor(participant));
  }

  formatEventDateTime(event: Event): string {
    if (!event.startTime) return '';
    
    let eventDate: Date;
    if (event.isAllDay) {
      const dateString = event.startTime.split('T')[0];
      const [year, month, day] = dateString.split('-').map(Number);
      eventDate = new Date(year, month - 1, day);
    } else {
      eventDate = new Date(event.startTime);
    }
    
    const today = startOfDay(new Date());
    const tomorrow = addDays(today, 1);
    
    let dateStr = '';
    if (isSameDay(eventDate, tomorrow)) {
      dateStr = 'Tomorrow';
    } else if (eventDate.getTime() - today.getTime() < 7 * 24 * 60 * 60 * 1000) {
      dateStr = format(eventDate, 'EEEE'); // Day name for this week
    } else {
      dateStr = format(eventDate, 'MMM d'); // Month and day for further dates
    }
    
    const timeStr = this.formatEventTime(event);
    return `${dateStr} • ${timeStr}`;
  }
}
