
import { initializeApp, getApps, App, cert, ServiceAccount } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

let adminApp: App;

export function initializeFirebaseAdmin() {
  if (getApps().find(app => app?.name === 'admin')) {
    adminApp = getApps().find(app => app?.name === 'admin')!;
    return getSdks(adminApp);
  }

  // Check if all required environment variables are present.
  if (
    !process.env.FIREBASE_PROJECT_ID ||
    !process.env.FIREBASE_CLIENT_EMAIL ||
    !process.env.FIREBASE_PRIVATE_KEY
  ) {
    throw new Error(
      'Firebase Admin SDK credentials are not fully set in .env file. Please provide FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY.'
    );
  }

  const serviceAccount: ServiceAccount = {
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
  };

  // Initialize the admin app with a specific name and the explicit credentials.
  // This prevents it from conflicting with or using any default credentials.
  adminApp = initializeApp(
    {
      credential: cert(serviceAccount),
    },
    'admin'
  );

  return getSdks(adminApp);
}

function getSdks(app: App) {
  return {
    app,
    auth: getAuth(app),
    firestore: getFirestore(app),
  };
}
