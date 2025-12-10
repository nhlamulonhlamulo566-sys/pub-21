import { initializeApp, getApps, App, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { firebaseConfig } from './config';

let adminApp: App;

export function initializeFirebaseAdmin() {
  if (!getApps().length || !getApps().find(app => app.name === 'admin')) {
    try {
      // Initialize the admin app when running in a Google Cloud environment
      adminApp = initializeApp({
        projectId: firebaseConfig.projectId,
      }, 'admin');
    } catch (e) {
      console.error(
        'Automatic initialization failed. Check your environment variables.',
        e
      );
      throw new Error('Failed to initialize Firebase Admin SDK. Ensure your server environment is set up with Application Default Credentials.');
    }
  } else {
    adminApp = getApps().find(app => app.name === 'admin')!;
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
