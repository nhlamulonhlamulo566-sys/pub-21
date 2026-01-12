
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BarChart3,
  LayoutDashboard,
  Package,
  ScanLine,
  ShoppingCart,
  History,
  Settings,
  Users,
} from 'lucide-react';
import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { useDoc, useFirestore, useUser } from '@/firebase';
import { useMemoFirebase } from '@/firebase/provider';
import { doc } from 'firebase/firestore';
import { UserProfile } from '@/lib/types';
import { Skeleton } from './ui/skeleton';

const topLevelLinks = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['administrator'] },
  { href: '/pos', label: 'Point of Sale', icon: ShoppingCart, roles: ['administrator', 'sales'] },
  { href: '/products', label: 'Products', icon: Package, roles: ['administrator'] },
  { href: '/stock-count', label: 'Stock Count', icon: ScanLine, roles: ['administrator'] },
  { href: '/reports', label: 'Reports', icon: BarChart3, roles: ['administrator'] },
  { href: '/sales', label: 'Completed Sales', icon: History, roles: ['administrator'] },
];

const settingsLinks = [
    { href: '/settings/users', label: 'Users', icon: Users, roles: ['administrator'] },
]


export function Nav() {
  const pathname = usePathname();
  const { setOpenMobile, isMobile } = useSidebar();
  const [openCollapsibles, setOpenCollapsibles] = useState({
      settings: pathname.startsWith('/settings'),
  });

  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();

  const userProfileRef = useMemoFirebase(
    () => (firestore && user ? doc(firestore, 'users', user.uid) : null),
    [firestore, user]
  );
  const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userProfileRef);

  const userRole = userProfile?.role || 'sales';
  const isLoading = isUserLoading || isProfileLoading;

  const isSettingsActive = pathname.startsWith('/settings');

  const handleOpenChange = (collapsible: 'settings') => {
      setOpenCollapsibles(prev => ({ ...prev, [collapsible]: !prev[collapsible] }));
  }

  const handleLinkClick = () => {
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col gap-2 p-2">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-8 w-full" />
        ))}
      </div>
    )
  }


  return (
    <SidebarMenu>
      {topLevelLinks.filter(link => link.roles.includes(userRole)).map((link) => (
        <SidebarMenuItem key={link.href} onClick={handleLinkClick}>
          <SidebarMenuButton
            asChild
            isActive={pathname === link.href}
            className="w-full justify-start"
            tooltip={link.label}
          >
            <Link href={link.href}>
              <link.icon />
              <span>{link.label}</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      ))}
      
      {userRole === 'administrator' && (
        <>          
          <Collapsible open={openCollapsibles.settings} onOpenChange={() => handleOpenChange('settings')}>
            <SidebarMenuItem>
              <CollapsibleTrigger asChild>
                    <SidebarMenuButton
                        isActive={isSettingsActive}
                        className="w-full justify-start"
                        tooltip="Settings"
                    >
                        <Settings />
                        <span>Settings</span>
                        <ChevronRight className={cn("ml-auto h-4 w-4 transition-transform", openCollapsibles.settings && "rotate-90")} />
                    </SidebarMenuButton>
              </CollapsibleTrigger>
            </SidebarMenuItem>
            <CollapsibleContent>
                <SidebarMenuSub>
                    {settingsLinks.map(link => (
                        <SidebarMenuSubItem key={link.href} onClick={handleLinkClick}>
                            <SidebarMenuSubButton asChild isActive={pathname.startsWith('/settings/users')}>
                                <Link href={link.href}>{link.label}</Link>
                            </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                    ))}
                </SidebarMenuSub>
            </CollapsibleContent>
          </Collapsible>
        </>
      )}
    </SidebarMenu>
  );
}
