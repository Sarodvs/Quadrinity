import { getApp, getApps, initializeApp } from 'firebase/app';
import { Auth, getAuth, initializeAuth, getReactNativePersistence } from 'firebase/auth';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';

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

let firebaseAuth: Auth;
try {
  firebaseAuth = initializeAuth(firebaseApp, {
    persistence: getReactNativePersistence(ReactNativeAsyncStorage),
  });
} catch (e) {
  firebaseAuth = getAuth(firebaseApp);
}

export const auth: Auth = firebaseAuth;

export default function FirebaseConfigRoute() {
  return null;
}
