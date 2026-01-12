'use client';

import React, { useMemo, useState, useEffect, type ReactNode } from 'react';
import { FirebaseProvider } from '@/firebase/provider';
import { initializeFirebase } from '@/firebase';

interface FirebaseClientProviderProps {
  children: ReactNode;
}

export function FirebaseClientProvider({ children }: FirebaseClientProviderProps) {
  const [firebaseServices, setFirebaseServices] = useState<any | null>(null);

  useEffect(() => {
    // Initialize Firebase on the client after mount to avoid server-side initialization
    const services = initializeFirebase();
    setFirebaseServices(services);
  }, []);

  // If services are not ready (during SSR or hydration), don't render children yet.
  // This prevents downstream components from calling `useAuth`/`useFirestore`
  // before the Firebase services are available, which would cause runtime errors.
  if (!firebaseServices) {
    return null;
  }

  return (
    <FirebaseProvider
      firebaseApp={firebaseServices.firebaseApp}
      auth={firebaseServices.auth}
      firestore={firebaseServices.firestore}
    >
      {children}
    </FirebaseProvider>
  );
}
