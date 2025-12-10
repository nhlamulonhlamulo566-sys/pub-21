'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser, useFirestore, useDoc } from '@/firebase';
import { Skeleton } from '@/components/ui/skeleton';
import { doc } from 'firebase/firestore';
import { useMemoFirebase } from '@/firebase/provider';
import type { UserProfile } from '@/lib/types';

export default function RootPage() {
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const firestore = useFirestore();

  const userProfileRef = useMemoFirebase(
    () => (firestore && user ? doc(firestore, 'users', user.uid) : null),
    [firestore, user]
  );
  const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userProfileRef);

  useEffect(() => {
    const isLoading = isUserLoading || isProfileLoading;
    if (isLoading) {
      return; // Wait until all data is loaded
    }

    if (user && userProfile) {
      // User is logged in and we have their profile
      if (userProfile.role === 'sales') {
        router.replace('/pos');
      } else {
        router.replace('/dashboard');
      }
    } else if (!isUserLoading && !user) {
      // No user is logged in
      router.replace('/login');
    }
    // If `user` exists but `userProfile` doesn't, it might mean the profile document
    // is still being created or hasn't been fetched. The `isLoading` check handles this.
  }, [user, userProfile, isUserLoading, isProfileLoading, router]);

  return (
    <div className="flex h-screen w-full items-center justify-center">
      <Skeleton className="h-full w-full" />
    </div>
  );
}
