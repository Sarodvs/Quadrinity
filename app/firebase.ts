// firebase.ts
// Initialize Firebase for both web and native (React Native) environments.
// For Expo-managed apps you will still need to add the
// `google-services.json` (Android) and `GoogleService-Info.plist` (iOS) files
// and run `expo prebuild`/`eas build` so that the native Firebase SDK can
// pick them up. The web config is only used when running in a browser.

import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCJL1BgdxPzFdYg7GVXyKdXLfIZKDZ-IMU",
  authDomain: "haritham-74b4d.firebaseapp.com",
  projectId: "haritham-74b4d",
  storageBucket: "haritham-74b4d.firebasestorage.app",
  messagingSenderId: "555317842101",
  appId: "1:555317842101:web:d2208c9cf790e2d1726efc",
  measurementId: "G-QE6L859P3B",
};

let firebaseApp;
if (!getApps().length) {
  firebaseApp = initializeApp(firebaseConfig);
} else {
  firebaseApp = getApp();
}

// export the auth instance that other modules can use
export const auth: Auth = getAuth(firebaseApp);

// you can optionally export other services here (firestore, storage, etc.)
