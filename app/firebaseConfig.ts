import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyCTdrvwofVH7iMgB4Vmai00S6rDGcA-Wr0",
    authDomain: "haritham-51481.firebaseapp.com",
    projectId: "haritham-51481",
    storageBucket: "haritham-51481.firebasestorage.app",
    messagingSenderId: "905858409211",
    appId: "1:905858409211:web:e62bb0f400da22e35d865e",
    measurementId: "G-6YXXMHR7HQ"
};

// Initialize Firebase (safely for Expo hot-reloading)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);

export { auth, db };
