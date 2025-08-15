import { CommonModule, DatePipe } from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import {
  Component,
  OnInit,
  Output,
  EventEmitter,
  inject,
  effect,
  OnDestroy,
  HostListener,
} from '@angular/core';
import {
  format,
  isSameDay,
  differenceInDays,
  addDays,
  startOfDay,
} from 'date-fns';
import { AuthGoogleService } from '../auth-google.service';
import { Subscription } from 'rxjs';

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
  isGoogleCalendarEvent?: boolean;
}

@Component({
  selector: 'app-week-view',
  imports: [DatePipe, CommonModule],
  templateUrl: './week-view.component.html',
  styleUrl: './week-view.component.scss',
})
export class WeekViewComponent implements OnInit, OnDestroy {
  public currentWeek: Date[] = [];
  public today: Date = startOfDay(new Date());
  public readonly familyMembers: string[] = [
    'Donna',
    'Mark',
    'Zara',
    'Macy',
    'Julia',
  ];
  public events: Event[] = [];
  public hoveredEventId: string | null = null;
  private lastScrollTime: number = 0;
  private scrollThrottleMs: number = 200; // Minimum time between scroll actions

  @Output() eventClicked = new EventEmitter<Event>();
  @Output() cellClicked = new EventEmitter<{ date: Date; member: string }>();

  http: HttpClient = inject(HttpClient);
  authService = inject(AuthGoogleService);
  googleCalendarEvents$: Subscription | undefined;

  googleCalendarEventPoll: any;

  constructor() {
    effect(() => {
      const profile = this.authService.profile();
      if (profile) {
        // Load Google calendar events
        this.loadGoogleCalendarEvents();

        // Then setup a poll to load every 10 seconds
        this.googleCalendarEventPoll = setInterval(() => {
          this.loadGoogleCalendarEvents();
        }, 10000)
      }
    });
  }

  ngOnDestroy(): void {
    if (this.googleCalendarEvents$) {
      this.googleCalendarEvents$.unsubscribe();
    }

    clearInterval(this.googleCalendarEventPoll);
  }

  ngOnInit() {
    this.generateWeekView();
    this.loadEvents();
  }

  loadGoogleCalendarEvents() {
    // Check if token is valid before making the request
    if (!this.authService.isTokenValid()) {
      console.log('Token is invalid, attempting refresh...');
      this.authService.refreshToken().then((success) => {
        if (success) {
          this.loadGoogleCalendarEvents(); // Retry after successful refresh
        } else {
          console.error('Failed to refresh token, skipping Google Calendar sync');
        }
      });
      return;
    }

    const header = new HttpHeaders({
      Authorization: `Bearer ${this.authService.getAccessToken()}`,
    });

    this.googleCalendarEvents$ = this.http
      .get('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
        headers: header,
      })
      .subscribe({
        next: (events) => {
        const items = (events as any).items || [];
        for (const item of items) {
          const kalendaeEvent: Event = {
            id: item.id,
            title: item.summary || 'No Title',
            description: item.description,
            startTime: item.start?.dateTime || item.start?.date || null,
            endTime: item.end?.dateTime || item.end?.date || null,
            createdAt: item.created,
            isAllDay: !!item.start?.date,
            location: item.location || '',
            participants: item.description.split(',').map((p: string) => p.trim()),
            isGoogleCalendarEvent: true,
          };

          if (this.events.find(e => e.id === kalendaeEvent.id) === undefined) {
            this.events.push(
              kalendaeEvent,
            );
          }
        }
      },
      error: (error) => {
        console.error('Error loading Google Calendar events:', error);
        if (error.status === 401) {
          console.log('Unauthorized - attempting token refresh...');
          this.authService.refreshToken().then((success) => {
            if (success) {
              this.loadGoogleCalendarEvents(); // Retry after successful refresh
            }
          });
        }
      }
    });
  }

  generateWeekView(targetDate?: Date) {
    const baseDate = targetDate || new Date();
    const startOfWeek = new Date(baseDate);
    startOfWeek.setDate(baseDate.getDate() - baseDate.getDay() + 1); // Set to Monday

    this.currentWeek = Array.from({ length: 7 }, (_, i) => {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      return date;
    });
  }

  getDatesSuffix(date: Date): string {
    const day = date.getDate();
    if (day > 3 && day < 21) return 'th'; // Special case for 11th to 13th
    switch (day % 10) {
      case 1:
        return 'st';
      case 2:
        return 'nd';
      case 3:
        return 'rd';
      default:
        return 'th';
    }
  }

  private loadEvents(): void {
    const stored = localStorage.getItem('kalendae_events');
    this.events = stored ? JSON.parse(stored) : [];
  }

  public refreshEvents(): void {
    // Preserve Google Calendar events when refreshing
    const googleEvents = this.events.filter(event => event.isGoogleCalendarEvent);
    this.loadEvents();
    // Re-add Google Calendar events that aren't duplicates
    googleEvents.forEach(googleEvent => {
      if (!this.events.find(e => e.id === googleEvent.id)) {
        this.events.push(googleEvent);
      }
    });
  }

  public updateToDate(date: Date): void {
    this.generateWeekView(date);
    this.refreshEvents();
  }

  prevWeek(): void {
    const currentWeekStart = this.currentWeek[0];
    const prevWeekStart = new Date(currentWeekStart);
    prevWeekStart.setDate(currentWeekStart.getDate() - 7);
    this.generateWeekView(prevWeekStart);
  }

  nextWeek(): void {
    const currentWeekStart = this.currentWeek[0];
    const nextWeekStart = new Date(currentWeekStart);
    nextWeekStart.setDate(currentWeekStart.getDate() + 7);
    this.generateWeekView(nextWeekStart);
  }

  getCurrentWeekLabel(): string {
    if (this.currentWeek.length === 0) return '';
    const startDate = this.currentWeek[0];
    const endDate = this.currentWeek[6];
    return `${format(startDate, 'MMM d')} - ${format(endDate, 'MMM d, yyyy')}`;
  }

  getEventsForDateAndParticipant(date: Date, participant: string): Event[] {
    const filteredEvents = this.events.filter((event) => {
      if (!event.startTime) return false;

      let eventDate: Date;
      if (event.isAllDay) {
        // For all-day events, parse the date string as local date to avoid timezone issues
        const dateString = event.startTime.split('T')[0]; // Get just the date part (yyyy-MM-dd)
        const [year, month, day] = dateString.split('-').map(Number);
        eventDate = new Date(year, month - 1, day); // month is 0-indexed
      } else {
        eventDate = new Date(event.startTime);
      }

      return (
        event.participants.includes(participant) && isSameDay(eventDate, date)
      );
    });

    return filteredEvents.sort((a, b) => {
      // All-day events come first
      if (a.isAllDay && !b.isAllDay) return -1;
      if (!a.isAllDay && b.isAllDay) return 1;

      // If both are all-day, sort by creation time (or could be alphabetical by title)
      if (a.isAllDay && b.isAllDay) {
        return (
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
      }

      // If both are timed events, sort by start time
      const aStartTime = new Date(a.startTime!).getTime();
      const bStartTime = new Date(b.startTime!).getTime();
      return aStartTime - bStartTime;
    });
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
    return event.participants.filter(
      (participant) => participant !== currentMember
    );
  }

  getFamilyMemberAvatarIndex(memberName: string): number {
    const memberMap: { [key: string]: number } = {
      Donna: 0,
      Mark: 1,
      Zara: 2,
      Macy: 3,
      Julia: 4,
    };
    return memberMap[memberName] ?? 0;
  }

  onEventClick(event: Event): void {
    this.eventClicked.emit(event);
  }

  onCellClick(date: Date, member: string, event: MouseEvent): void {
    // Check if the click target is the cell itself, not an event inside it
    const target = event.target as HTMLElement;
    if (target.closest('.event-wrapper') || target.closest('.event-item')) {
      return; // Don't trigger cell click if clicking on an event
    }

    this.cellClicked.emit({ date, member });
  }

  onEventMouseEnter(event: Event): void {
    // Highlight multi-day events OR Google Calendar events
    if (this.isMultiDayEvent(event) || event.isGoogleCalendarEvent) {
      this.hoveredEventId = event.id;
    }
  }

  onEventMouseLeave(event: Event): void {
    // Clear highlight for multi-day events OR Google Calendar events
    if (this.isMultiDayEvent(event) || event.isGoogleCalendarEvent) {
      this.hoveredEventId = null;
    }
  }

  isEventHighlighted(event: Event): boolean {
    return this.hoveredEventId === event.id;
  }

  @HostListener('wheel', ['$event'])
  onWheelScroll(event: WheelEvent): void {
    // Prevent default scrolling behavior
    event.preventDefault();
    
    // Throttle scroll events to prevent rapid navigation
    const currentTime = Date.now();
    if (currentTime - this.lastScrollTime < this.scrollThrottleMs) {
      return;
    }
    this.lastScrollTime = currentTime;
    
    // Determine scroll direction
    if (event.deltaY > 0) {
      // Scroll down = previous week
      this.prevWeek();
    } else if (event.deltaY < 0) {
      // Scroll up = next week
      this.nextWeek();
    }
  }

  isMultiDayEvent(event: Event): boolean {
    if (!event.startTime || !event.endTime) return false;

    let startDate: Date;
    let endDate: Date;

    if (event.isAllDay) {
      // For all-day events, parse dates as local to avoid timezone issues
      const startDateString = event.startTime.split('T')[0];
      const [startYear, startMonth, startDay] = startDateString
        .split('-')
        .map(Number);
      startDate = new Date(startYear, startMonth - 1, startDay);

      const endDateString = event.endTime.split('T')[0];
      const [endYear, endMonth, endDay] = endDateString.split('-').map(Number);
      endDate = new Date(endYear, endMonth - 1, endDay);
    } else {
      startDate = startOfDay(new Date(event.startTime));
      endDate = startOfDay(new Date(event.endTime));
    }

    return differenceInDays(endDate, startDate) > 0;
  }

  getEventDaysInWeek(event: Event, weekDates: Date[]): Date[] {
    if (!event.startTime || !event.endTime) return [];

    let eventStart: Date;
    let eventEnd: Date;

    if (event.isAllDay) {
      // For all-day events, parse dates as local to avoid timezone issues
      const startDateString = event.startTime.split('T')[0];
      const [startYear, startMonth, startDay] = startDateString
        .split('-')
        .map(Number);
      eventStart = new Date(startYear, startMonth - 1, startDay);

      const endDateString = event.endTime.split('T')[0];
      const [endYear, endMonth, endDay] = endDateString.split('-').map(Number);
      eventEnd = new Date(endYear, endMonth - 1, endDay);
    } else {
      eventStart = startOfDay(new Date(event.startTime));
      eventEnd = startOfDay(new Date(event.endTime));
    }

    return weekDates.filter((date) => {
      const dayStart = startOfDay(date);
      return dayStart >= eventStart && dayStart <= eventEnd;
    });
  }

  getEventDayNumber(
    event: Event,
    currentDate: Date
  ): { dayNumber: number; totalDays: number } {
    if (!event.startTime || !event.endTime)
      return { dayNumber: 1, totalDays: 1 };

    let eventStart: Date;
    let eventEnd: Date;

    if (event.isAllDay) {
      // For all-day events, parse dates as local to avoid timezone issues
      const startDateString = event.startTime.split('T')[0];
      const [startYear, startMonth, startDay] = startDateString
        .split('-')
        .map(Number);
      eventStart = new Date(startYear, startMonth - 1, startDay);

      const endDateString = event.endTime.split('T')[0];
      const [endYear, endMonth, endDay] = endDateString.split('-').map(Number);
      eventEnd = new Date(endYear, endMonth - 1, endDay);
    } else {
      eventStart = startOfDay(new Date(event.startTime));
      eventEnd = startOfDay(new Date(event.endTime));
    }

    const currentDay = startOfDay(currentDate);

    const totalDays = differenceInDays(eventEnd, eventStart) + 1;
    const dayNumber = differenceInDays(currentDay, eventStart) + 1;

    return { dayNumber, totalDays };
  }

  getMultiDayEventsForParticipant(participant: string): Event[] {
    return this.events.filter(
      (event) =>
        event.participants.includes(participant) && this.isMultiDayEvent(event)
    );
  }

  getEventColumn(event: Event, participant: string): number {
    if (!this.isMultiDayEvent(event)) return 0;

    const multiDayEvents = this.getMultiDayEventsForParticipant(participant);

    // Sort all multi-day events by start time to get consistent column assignment
    const sortedEvents = multiDayEvents.sort(
      (a, b) =>
        new Date(a.startTime!).getTime() - new Date(b.startTime!).getTime()
    );

    // Assign columns based on overlaps
    const eventColumns: { [eventId: string]: number } = {};

    for (const evt of sortedEvents) {
      let column = 0;

      // Find the first available column for this event
      while (this.isColumnOccupied(evt, column, eventColumns, sortedEvents)) {
        column++;
      }

      eventColumns[evt.id] = column;
    }

    return eventColumns[event.id] || 0;
  }

  private isColumnOccupied(
    event: Event,
    column: number,
    eventColumns: { [eventId: string]: number },
    allEvents: Event[]
  ): boolean {
    for (const otherEvent of allEvents) {
      if (otherEvent.id === event.id) continue;
      if (
        eventColumns[otherEvent.id] === column &&
        this.eventsOverlap(event, otherEvent)
      ) {
        return true;
      }
    }
    return false;
  }

  private eventsOverlap(event1: Event, event2: Event): boolean {
    if (
      !event1.startTime ||
      !event1.endTime ||
      !event2.startTime ||
      !event2.endTime
    )
      return false;

    let event1Start: Date, event1End: Date, event2Start: Date, event2End: Date;

    if (event1.isAllDay) {
      const startDateString = event1.startTime.split('T')[0];
      const [startYear, startMonth, startDay] = startDateString
        .split('-')
        .map(Number);
      event1Start = new Date(startYear, startMonth - 1, startDay);

      const endDateString = event1.endTime.split('T')[0];
      const [endYear, endMonth, endDay] = endDateString.split('-').map(Number);
      event1End = new Date(endYear, endMonth - 1, endDay);
    } else {
      event1Start = startOfDay(new Date(event1.startTime));
      event1End = startOfDay(new Date(event1.endTime));
    }

    if (event2.isAllDay) {
      const startDateString = event2.startTime.split('T')[0];
      const [startYear, startMonth, startDay] = startDateString
        .split('-')
        .map(Number);
      event2Start = new Date(startYear, startMonth - 1, startDay);

      const endDateString = event2.endTime.split('T')[0];
      const [endYear, endMonth, endDay] = endDateString.split('-').map(Number);
      event2End = new Date(endYear, endMonth - 1, endDay);
    } else {
      event2Start = startOfDay(new Date(event2.startTime));
      event2End = startOfDay(new Date(event2.endTime));
    }

    return event1Start <= event2End && event2Start <= event1End;
  }

  doEventsOverlapOnDate(event1: Event, event2: Event, date: Date): boolean {
    const currentDay = startOfDay(date);

    // Check if both events span the current date
    const event1SpansDate = this.eventSpansDate(event1, currentDay);
    const event2SpansDate = this.eventSpansDate(event2, currentDay);

    return event1SpansDate && event2SpansDate;
  }

  eventSpansDate(event: Event, date: Date): boolean {
    if (!event.startTime || !event.endTime) return false;

    let eventStart: Date;
    let eventEnd: Date;

    if (event.isAllDay) {
      const startDateString = event.startTime.split('T')[0];
      const [startYear, startMonth, startDay] = startDateString
        .split('-')
        .map(Number);
      eventStart = new Date(startYear, startMonth - 1, startDay);

      const endDateString = event.endTime.split('T')[0];
      const [endYear, endMonth, endDay] = endDateString.split('-').map(Number);
      eventEnd = new Date(endYear, endMonth - 1, endDay);
    } else {
      eventStart = startOfDay(new Date(event.startTime));
      eventEnd = startOfDay(new Date(event.endTime));
    }

    const currentDay = startOfDay(date);
    return currentDay >= eventStart && currentDay <= eventEnd;
  }

  shouldShowVerticalConnection(
    event: Event,
    date: Date
  ): { showTop: boolean; showBottom: boolean } {
    if (!this.isMultiDayEvent(event))
      return { showTop: false, showBottom: false };

    const dayInfo = this.getEventDayNumber(event, date);
    const isFirstDay = dayInfo.dayNumber === 1;
    const isLastDay = dayInfo.dayNumber === dayInfo.totalDays;

    return {
      showTop: !isFirstDay,
      showBottom: !isLastDay,
    };
  }

  getEventsForDateAndParticipantIncludingMultiDay(
    date: Date,
    participant: string
  ): Event[] {
    const filteredEvents = this.events.filter((event) => {
      if (!event.startTime) return false;

      if (this.isMultiDayEvent(event)) {
        // For multi-day events, check if the current date falls within the event range
        let eventStart: Date;
        let eventEnd: Date;

        if (event.isAllDay) {
          // For all-day events, parse dates as local to avoid timezone issues
          const startDateString = event.startTime!.split('T')[0];
          const [startYear, startMonth, startDay] = startDateString
            .split('-')
            .map(Number);
          eventStart = new Date(startYear, startMonth - 1, startDay);

          const endDateString = event.endTime!.split('T')[0];
          const [endYear, endMonth, endDay] = endDateString
            .split('-')
            .map(Number);
          eventEnd = new Date(endYear, endMonth - 1, endDay);
        } else {
          eventStart = startOfDay(new Date(event.startTime!));
          eventEnd = startOfDay(new Date(event.endTime!));
        }

        const currentDay = startOfDay(date);
        return (
          event.participants.includes(participant) &&
          currentDay >= eventStart &&
          currentDay <= eventEnd
        );
      } else {
        // For single-day events, use the existing logic
        let eventDate: Date;
        if (event.isAllDay) {
          const dateString = event.startTime.split('T')[0];
          const [year, month, day] = dateString.split('-').map(Number);
          eventDate = new Date(year, month - 1, day);
        } else {
          eventDate = new Date(event.startTime);
        }
        return (
          event.participants.includes(participant) && isSameDay(eventDate, date)
        );
      }
    });

    return filteredEvents.sort((a, b) => {
      // All-day events come first
      if (a.isAllDay && !b.isAllDay) return -1;
      if (!a.isAllDay && b.isAllDay) return 1;

      // If both are all-day, sort by creation time
      if (a.isAllDay && b.isAllDay) {
        return (
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
      }

      // If both are timed events, sort by start time
      const aStartTime = new Date(a.startTime!).getTime();
      const bStartTime = new Date(b.startTime!).getTime();
      return aStartTime - bStartTime;
    });
  }

  getUpcomingEventsForMember(member: string, daysAhead: number = 7): Event[] {
    const today = startOfDay(new Date());
    const futureDate = addDays(today, daysAhead);

    const upcomingEvents = this.events.filter((event) => {
      if (!event.startTime || !event.participants.includes(member))
        return false;

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

    return upcomingEvents
      .sort((a, b) => {
        const aDate = new Date(a.startTime!).getTime();
        const bDate = new Date(b.startTime!).getTime();
        return aDate - bDate;
      })
      .slice(0, 3); // Limit to 3 upcoming events per member
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
    } else if (
      eventDate.getTime() - today.getTime() <
      7 * 24 * 60 * 60 * 1000
    ) {
      return format(eventDate, 'EEEE'); // Day name for this week
    } else {
      return format(eventDate, 'MMM d'); // Month and day for further dates
    }
  }
}
