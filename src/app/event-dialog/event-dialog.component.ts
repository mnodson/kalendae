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
  @Output() dialogClosed = new EventEmitter<void>();

  eventTitle: any;
  eventDescription: any;
  eventLocation: any;
  eventStart: FormControl = new FormControl('');
  eventEnd: FormControl = new FormControl('');
  eventDuration: string = '';
  isAllDay: boolean = false;

  public readonly eventAttendance: {name: string, isAttending: boolean}[] = [
    {name: 'Donna', isAttending: false },
    {name: 'Mark', isAttending: false },
    {name: 'Zara', isAttending: false },
    {name: 'Macy', isAttending: false },
    {name: 'Julia', isAttending: false }
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

    this.eventStart.setValue(
      this.eventDate
        ? DateHelpers.formatHtmlDateTime(this.eventDate)
        : DateHelpers.formatHtmlDateTime(new Date())
    );
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
      this.eventLocation = event.properties.formatted;
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
    throw new Error('Method not implemented.');
  }
  saveEvent() {
    throw new Error('Method not implemented.');
  }

  closeDialog() {
    this.dialogClosed.emit();
  }

  toggleAllDay() {
    if (this.isAllDay) {
      this.eventStart.setValue(DateHelpers.formatHtmlDate(this.eventDate));
      this.eventEnd.setValue(DateHelpers.formatHtmlDate(addDays(this.eventDate, 1)));
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
