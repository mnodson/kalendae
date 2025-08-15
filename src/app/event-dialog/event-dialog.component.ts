import { CommonModule } from '@angular/common';
import {
  Form,
  FormControl,
  FormsModule,
  ReactiveFormsModule,
} from '@angular/forms';
import {
  Component,
  ElementRef,
  EventEmitter,
  Input,
  Output,
  ViewChild,
} from '@angular/core';

import {
  formatDistanceStrict,
  startOfToday,
  startOfDay,
  addHours,
  formatISO,
  formatRFC3339,
  format,
  intervalToDuration,
  formatDuration,
  addDays,
} from 'date-fns';
import {
  GeocoderAutocomplete,
  GeocoderAutocompleteOptions,
} from '@geoapify/geocoder-autocomplete';

@Component({
  selector: 'app-event-dialog',
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './event-dialog.component.html',
  styleUrl: './event-dialog.component.scss',
})
export class EventDialogComponent {
  @Input() eventDate: Date = new Date();
  @Input() existingEvent: any = null;
  @Input() preSelectedMember: string | null = null;
  @Output() dialogClosed = new EventEmitter<void>();
  @Output() eventSaved = new EventEmitter<void>();
  @Output() eventDeleted = new EventEmitter<void>();

  eventTitle: any;
  eventDescription: any;
  eventLocation: any;
  eventStart: FormControl = new FormControl('');
  eventEnd: FormControl = new FormControl('');
  eventDuration: string = '';
  isAllDay: boolean = false;

  public readonly eventAttendance: { name: string, isAttending: boolean }[] = [
    { name: 'Donna', isAttending: false },
    { name: 'Mark', isAttending: false },
    { name: 'Zara', isAttending: false },
    { name: 'Macy', isAttending: false },
    { name: 'Julia', isAttending: false }
  ];

  private geocoderAutocomplete!: GeocoderAutocomplete;

  @ViewChild('autocompleteContainer', { static: true })
  autocompleteContainer!: ElementRef;

  constructor() {
    this.handleEscapeKey = this.handleEscapeKey.bind(this);
  }

  ngOnInit() {
    window.addEventListener('keydown', this.handleEscapeKey);

    this.registerFormEventHandlers();
    this.setupGeocoder();

    if (this.existingEvent) {
      this.populateExistingEvent();
    } else {
      this.eventStart.setValue(
        this.eventDate
          ? DateHelpers.formatHtmlDateTime(this.eventDate)
          : DateHelpers.formatHtmlDateTime(new Date())
      );
      
      // Pre-select the participant if one was specified
      if (this.preSelectedMember) {
        this.preSelectParticipant(this.preSelectedMember);
      }
    }
  }

  private setupGeocoder() {
    const container = this.autocompleteContainer.nativeElement;
    const options: GeocoderAutocompleteOptions = {
      placeholder: 'Search for a location',
      limit: 3,
      countryCodes: ['us'],
    };
    const apiKey = '720d9e0de1ea486c9a402797b1a9620b';

    this.geocoderAutocomplete = new GeocoderAutocomplete(
      container,
      apiKey,
      options
    );

    this.geocoderAutocomplete.on('select', (event) => {
      if (event) {
        this.eventLocation = event.properties.formatted;

      }
    });
  }

  registerFormEventHandlers() {
    this.eventStart.valueChanges.subscribe((value: Date | null) => {
      if (!value || this.isAllDay) return;

      const endTime = addHours(value, 1);
      this.eventEnd.setValue(DateHelpers.formatHtmlDateTime(endTime)); // Default end time is 1 hour after start time

      this.eventDuration = formatDuration(
        intervalToDuration({
          start: new Date(value),
          end: new Date(this.eventEnd.value),
        })
      );
    });

    this.eventEnd.valueChanges.subscribe((value: Date | null) => {
      if (!value) return;

      this.eventDuration = formatDuration(
        intervalToDuration({
          start: new Date(this.eventStart.value),
          end: new Date(value),
        })
      );
    });
  }

  ngOnDestroy() {
    window.removeEventListener('keydown', this.handleEscapeKey);
  }

  handleEscapeKey(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      this.closeDialog();
    }
  }

  deleteEvent() {
    if (this.existingEvent && this.existingEvent.id) {
      this.deleteFromStorage(this.existingEvent.id);
      this.eventDeleted.emit();
      this.closeDialog();
    }
  }
  saveEvent() {
    const eventData = {
      id: this.existingEvent ? this.existingEvent.id : this.generateEventId(),
      title: this.eventTitle || '',
      description: this.eventDescription || '',
      location: this.eventLocation || '',
      isAllDay: this.isAllDay,
      startTime: this.eventStart.value,
      endTime: this.eventEnd.value,
      participants: this.eventAttendance.filter(participant => participant.isAttending).map(participant => participant.name),
      createdAt: this.existingEvent ? this.existingEvent.createdAt : new Date().toISOString()
    };

    if (this.existingEvent) {
      this.updateInStorage(eventData);
    } else {
      this.saveToStorage(eventData);
    }
    
    this.eventSaved.emit();
    this.closeDialog();
  }

  private generateEventId(): string {
    return `event_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
  }

  private saveToStorage(eventData: any): void {
    const existingEvents = this.getEventsFromStorage();
    existingEvents.push(eventData);
    localStorage.setItem('kalendae_events', JSON.stringify(existingEvents));
  }

  private getEventsFromStorage(): any[] {
    const stored = localStorage.getItem('kalendae_events');
    return stored ? JSON.parse(stored) : [];
  }

  private updateInStorage(eventData: any): void {
    const existingEvents = this.getEventsFromStorage();
    const eventIndex = existingEvents.findIndex(event => event.id === eventData.id);
    if (eventIndex !== -1) {
      existingEvents[eventIndex] = eventData;
      localStorage.setItem('kalendae_events', JSON.stringify(existingEvents));
    }
  }

  private deleteFromStorage(eventId: string): void {
    const existingEvents = this.getEventsFromStorage();
    const filteredEvents = existingEvents.filter(event => event.id !== eventId);
    localStorage.setItem('kalendae_events', JSON.stringify(filteredEvents));
  }

  private populateExistingEvent(): void {
    this.eventTitle = this.existingEvent.title;
    this.eventDescription = this.existingEvent.description;
    this.eventLocation = this.existingEvent.location;
    this.isAllDay = this.existingEvent.isAllDay;
    
    // Format date/time properly for HTML inputs
    if (this.existingEvent.startTime) {
      if (this.isAllDay) {
        // For all-day events, use date format
        const startDate = new Date(this.existingEvent.startTime);
        this.eventStart.setValue(DateHelpers.formatHtmlDate(startDate));
      } else {
        // For timed events, convert to local datetime format
        const startDate = new Date(this.existingEvent.startTime);
        this.eventStart.setValue(DateHelpers.formatHtmlDateTime(startDate));
      }
    }
    
    if (this.existingEvent.endTime) {
      if (this.isAllDay) {
        // For all-day events, use date format
        const endDate = new Date(this.existingEvent.endTime);
        this.eventEnd.setValue(DateHelpers.formatHtmlDate(endDate));
      } else {
        // For timed events, convert to local datetime format
        const endDate = new Date(this.existingEvent.endTime);
        this.eventEnd.setValue(DateHelpers.formatHtmlDateTime(endDate));
      }
    }
    
    // Set participant attendance
    this.eventAttendance.forEach(member => {
      member.isAttending = this.existingEvent.participants.includes(member.name);
    });
  }

  private preSelectParticipant(memberName: string): void {
    const member = this.eventAttendance.find(m => m.name === memberName);
    if (member) {
      member.isAttending = true;
    }
  }

  closeDialog() {
    this.dialogClosed.emit();
  }

  toggleAllDay() {
    if (this.isAllDay) {
      this.eventStart.setValue(DateHelpers.formatHtmlDate(this.eventDate));
      this.eventEnd.setValue(DateHelpers.formatHtmlDate(this.eventDate));
    } else {
      this.eventStart.setValue(DateHelpers.formatHtmlDateTime(this.eventDate));
      this.eventEnd.setValue(DateHelpers.formatHtmlDateTime(addDays(this.eventDate, 1)));
    }
  }

  relativeDateDisplay() {
    let distanceString = '';
    if (this.eventDate) {
      distanceString = formatDistanceStrict(
        startOfDay(this.eventDate),
        startOfToday(),
        { addSuffix: true }
      );
    }

    if (distanceString === '0 seconds ago') {
      distanceString = 'Today';
    } else if (distanceString === 'in 1 day') {
      distanceString = 'Tomorrow';
    } else if (distanceString === '1 day ago') {
      distanceString = 'Yesterday';
    }

    return distanceString;
  }
}

export class DateHelpers {
  static formatHtmlDateTime(date: Date): string {
    return format(date, "yyyy-MM-dd'T'HH:mm");
  }
  static formatHtmlDate(date: Date): string {
    return format(date, 'yyyy-MM-dd');
  }
}
