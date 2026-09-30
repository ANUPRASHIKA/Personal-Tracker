import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// These are public client identifiers, safe to keep in source (not secrets).
const firebaseConfig = {
  apiKey: 'AIzaSyBaPjSkL485KZiuBauDU_gzhOESnKRNgmU',
  authDomain: 'personal-tracker-a2137.firebaseapp.com',
  projectId: 'personal-tracker-a2137',
  storageBucket: 'personal-tracker-a2137.firebasestorage.app',
  messagingSenderId: '922451621369',
  appId: '1:922451621369:web:9ddbec9888f9a217a9f928',
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);
