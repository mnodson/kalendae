import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Component, EventEmitter, Input, Output } from '@angular/core';

import { formatDistance, formatDistanceStrict, subDays } from 'date-fns';

@Component({
  selector: 'app-event-dialog',
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './event-dialog.component.html',
  styleUrl: './event-dialog.component.scss',
})
export class EventDialogComponent {
  @Input() eventDate: Date | null = null;
  @Output() dialogClosed = new EventEmitter<void>();

  eventTitle: any;
  eventDescription: any;
  eventTime: any;
eventLocation: any;

  deleteEvent() {
    throw new Error('Method not implemented.');
  }
  saveEvent() {
    throw new Error('Method not implemented.');
  }

  closeDialog() {
    this.eventDate = null; // Reset the date when closing
    this.dialogClosed.emit();
  }

  relativeDateDisplay() {
    const today = new Date();
    let distanceString = '';
    if (this.eventDate) {
      distanceString = formatDistanceStrict(
        new Date(
          this.eventDate.getFullYear(),
          this.eventDate.getMonth(),
          this.eventDate.getDate(),
          0,
          0,
          0
        ),
        new Date(
          today.getFullYear(),
          today.getMonth(),
          today.getDate(),
          0,
          0,
          0
        ),
        { addSuffix: true, unit: 'day', roundingMethod: 'ceil' }
      );
    }

    if (distanceString === '0 days ago') {
      distanceString = 'Today';
    } else if (distanceString === 'in 1 day') {
      distanceString = 'Tomorrow';
    } else if (distanceString === '1 day ago') {
      distanceString = 'Yesterday';
    }

    return distanceString;
  }
}
