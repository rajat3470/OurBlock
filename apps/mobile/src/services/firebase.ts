import { getApps, initializeApp } from "firebase/app";
import { getAuth, initializeAuth } from "@firebase/auth";
import { initializeFirestore, getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyAMjYMO7auCqR0popzIAHQOIP6ung6zlIo",
  authDomain: "our-block-app.firebaseapp.com",
  projectId: "our-block-app",
  storageBucket: "our-block-app.firebasestorage.app",
  messagingSenderId: "1007523518094",
  appId: "1:1007523518094:ios:7d3b215317d0620fd49bdf",
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

// Must be called before any getFirestore() call.
// experimentalForceLongPolling fixes WebChannelConnection transport errors on React Native.
try {
  initializeFirestore(app, { experimentalForceLongPolling: true });
} catch {
  // Already initialized — safe to ignore
}

export const getAuthInstance = () => {
  try {
    return getAuth(app);
  } catch {
    return initializeAuth(app);
  }
};
export const getFirestoreInstance = () => getFirestore(app);
export const getStorageInstance = () => getStorage(app);

export default app;
