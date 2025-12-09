
'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Skeleton } from '@/components/ui/skeleton';

export default function SettingsPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/settings/users');
  }, [router]);

  return (
    <div className="flex flex-col gap-4 lg:gap-6">
      <div className="flex items-center">
        <h1 className="text-lg font-semibold md:text-2xl">Settings</h1>
      </div>
      <div className="grid gap-6">
        <Skeleton className="w-full h-24" />
      </div>
    </div>
  );
}
