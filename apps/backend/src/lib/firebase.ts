import { initializeApp, getApps, cert, type App } from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";

let app: App;
if (!getApps().length) {
  app = initializeApp({ projectId: "mohallamitr-13ea4" });
} else {
  app = getApps()[0]!;
}

export const firebaseAuth: Auth = getAuth(app);
