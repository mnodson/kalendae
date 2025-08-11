import { Component, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { Firestore } from '@angular/fire/firestore';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
  standalone: true
})
export class AppComponent implements OnInit {
    constructor(private firestore: Firestore) {}


    ngOnInit() {
        // Initialize Firestore or perform any setup needed
        // this.firestore.collection('exampleCollection').valueChanges().subscribe(data => {
        //     console.log('Data from Firestore:', data);
        // });
    }
}
