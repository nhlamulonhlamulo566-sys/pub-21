
import { initializeApp, getApps, App, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

let adminApp: App;

export function initializeFirebaseAdmin() {
  if (getApps().length === 0) {
    // In a managed environment like App Hosting, initializeApp() with no arguments
    // will automatically use the available service account credentials.
    adminApp = initializeApp();
  } else {
    adminApp = getApps()[0];
  }

  return getSdks(adminApp);
}

function getSdks(app: App) {
  return {
    app,
    auth: getAuth(app),
    firestore: getFirestore(app),
  };
}
