import { CommonModule, DatePipe } from '@angular/common';
import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-week-view',
  imports: [DatePipe, CommonModule],
  templateUrl: './week-view.component.html',
  styleUrl: './week-view.component.scss'
})
export class WeekViewComponent implements OnInit {
  
  public currentWeek: Date[] = [];
  public today: Date = new Date();
  public readonly familyMembers: string[] = [
    'Donna',
    'Mark',
    'Zara',
    'Macy',
    'Julia'
  ];
  
  consutrctor() {}

  ngOnInit() {
    this.generateWeekView();
  }

  generateWeekView() {
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay() + 1); // Set to Monday

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
      case 1: return 'st';
      case 2: return 'nd';
      case 3: return 'rd';
      default: return 'th';
    }
  }

}
