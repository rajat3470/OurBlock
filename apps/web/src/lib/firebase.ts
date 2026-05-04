/**
 * Firebase Client Configuration for Web Admin
 * Used for client-side authentication
 */

export const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// You can initialize Firebase here if needed
// import { initializeApp } from 'firebase/app';
// import { getAuth } from 'firebase/auth';
// 
// const app = initializeApp(firebaseConfig);
// export const auth = getAuth(app);
