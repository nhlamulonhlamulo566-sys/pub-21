'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Package2 } from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarInset,
} from '@/components/ui/sidebar';
import { Header } from '@/components/header';
import { Nav } from '@/components/nav';
import { useUser } from '@/firebase';
import { Skeleton } from '@/components/ui/skeleton';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isUserLoading } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/login');
    }
  }, [user, isUserLoading, router]);

  if (isUserLoading || !user) {
    return (
      <div className="grid min-h-screen w-full md:grid-cols-[220px_1fr] lg:grid-cols-[280px_1fr]">
        <div className="hidden border-r bg-muted/40 md:block">
          <div className="flex h-full max-h-screen flex-col gap-2">
            <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
              <Skeleton className="h-6 w-6" />
              <Skeleton className="ml-2 h-6 w-24" />
            </div>
            <div className="flex-1">
              <nav className="grid items-start px-2 text-sm font-medium lg:px-4">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="mb-2 h-8 w-full" />
                ))}
              </nav>
            </div>
          </div>
        </div>
        <div className="flex flex-col">
          <header className="flex h-14 items-center gap-4 border-b bg-muted/40 px-4 lg:h-[60px] lg:px-6">
            <Skeleton className="h-8 w-8 md:hidden" />
            <div className="w-full flex-1">
              {/* <Skeleton className="h-8 w-full md:w-2/3 lg:w-1/3" /> */}
            </div>
            <Skeleton className="h-8 w-8 rounded-full" />
          </header>
          <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6">
            <Skeleton className="h-full w-full" />
          </main>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="grid min-h-screen w-full md:grid-cols-[220px_1fr] lg:grid-cols-[280px_1fr]">
        <Sidebar variant="sidebar" className="hidden md:flex">
          <SidebarHeader>
            <div className="flex h-14 items-center gap-2 border-b px-4 lg:h-[60px] lg:px-6">
              <Package2 className="h-6 w-6 text-primary" />
              <span className="text-lg font-semibold text-primary">Lynross liquor store</span>
            </div>
          </SidebarHeader>
          <SidebarContent>
            <Nav />
          </SidebarContent>
        </Sidebar>
        <div className="flex flex-col">
          <Header />
          <SidebarInset>
            <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6 bg-background">
              {children}
            </main>
          </SidebarInset>
        </div>
      </div>
    </>
  );
}
