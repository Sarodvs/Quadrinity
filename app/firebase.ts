import { getApp, getApps, initializeApp } from 'firebase/app';
import { Auth, getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: 'AIzaSyCJL1BgdxPzFdYg7GVXyKdXLfIZKDZ-IMU',
  authDomain: 'haritham-74b4d.firebaseapp.com',
  projectId: 'haritham-74b4d',
  storageBucket: 'haritham-74b4d.firebasestorage.app',
  messagingSenderId: '555317842101',
  appId: '1:555317842101:web:d2208c9cf790e2d1726efc',
  measurementId: 'G-QE6L859P3B',
};

const firebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const auth: Auth = getAuth(firebaseApp);
