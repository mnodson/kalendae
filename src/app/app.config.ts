import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { initializeApp, provideFirebaseApp } from '@angular/fire/app';
import { getStorage, provideStorage } from '@angular/fire/storage';
import { provideFirestore, getFirestore } from '@angular/fire/firestore';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }), 
    provideRouter(routes), 
    provideFirebaseApp(() => initializeApp({ projectId: "kalendae-da135", appId: "1:860250158150:web:714f198575dda6ed550647", storageBucket: "kalendae-da135.firebasestorage.app", apiKey: "AIzaSyB4zLr3eG4jgWyv1TFO_fufMwqTfnwgEhI", authDomain: "kalendae-da135.firebaseapp.com", messagingSenderId: "860250158150", measurementId: "G-PLNTKJCDW8" })), provideStorage(() => getStorage()),
    provideFirestore(() => getFirestore())]
};
