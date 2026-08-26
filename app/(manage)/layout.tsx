
'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  Calendar,
  Inbox,
  LayoutGrid,
  Settings,
  Users,
  PlusSquare,
  FileText,
  AlertTriangle,
  Upload,
  ArrowRightLeft,
  Boxes,
} from 'lucide-react';
import { usePathname, notFound } from 'next/navigation';
import { Button } from '@/components/ui/button';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Toaster } from "@/components/ui/toaster";
import { cn } from '@/core/lib/utils';
import { getAppLogo, getAppName } from '@/core/lib/application';

const navItems = [
  { href: '/', icon: LayoutGrid, label: 'Dashboard' },
  { href: '/analytics', icon: LayoutGrid, label: 'Analytics' },
  { href: '/schedule', icon: Calendar, label: 'Schedule' },
  { href: '/feed', icon: PlusSquare, label: 'Feed' },
  { href: '/content', icon: FileText, label: 'Content' },
  { href: '/inbox', icon: Inbox, label: 'Inbox' },
  { href: '/uploads', icon: Upload, label: 'Uploads' },
  { href: '/accounts', icon: Users, label: 'Accounts' },
  { href: '/space', icon: Boxes, label: 'Spaces' },
  { href: '/switch', icon: ArrowRightLeft, label: 'Switch' },
  { href: '/settings', icon: Settings, label: 'Settings' },
  { href: '/root/errors', icon: AlertTriangle, label: 'Errors' },
];

const allowedPaths = navItems.map(item => item.href);

export default function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  const appName = getAppName();
  // This check allows nested routes like /accounts/[id]
  const isAllowed = allowedPaths.some(path => pathname.startsWith(path));

  if (!isAllowed) {
    notFound();
  }

  const isActive = (href: string) => href === '/' ? pathname === '/' : pathname.startsWith(href);

  const renderNavLink = (item: typeof navItems[number]) => (
    <Link
      key={item.href}
      href={item.href}
      className={cn(
        'flex h-11 items-center gap-3 rounded-lg px-4 text-[13px] font-medium transition-colors',
        isActive(item.href)
          ? 'bg-primary/10 font-semibold text-primary'
          : 'text-[#1f2937] hover:bg-[#f5f7fa]'
      )}
    >
      <item.icon className="h-[17px] w-[17px] shrink-0" strokeWidth={1.8} />
      <span>{item.label}</span>
    </Link>
  );

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="fixed inset-x-0 top-0 z-10 h-[70px] bg-background shadow-[var(--app-box-shadow)]">
        <div className="mx-auto flex h-full w-full max-w-[1440px] items-center justify-between px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2.5" aria-label={`${appName} home`}>
            <img
              src={getAppLogo('mainlogo')}
              alt={appName}
              className="max-h-8 max-w-[180px] object-contain"
              onError={(event) => { event.currentTarget.style.display = 'none'; }}
            />
            <span className="text-[19px] font-bold tracking-[-0.04em] text-primary">{appName}</span>
          </Link>

          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-[13px] font-semibold leading-5 text-[#1d2939]">Neup Admin</p>
              <p className="text-[11px] leading-4 text-[#8a98a8]">@KHANALCWANI</p>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-9 w-9 rounded-full p-0 outline-none focus-visible:ring-0 focus-visible:ring-offset-0">
                  <Avatar className="h-9 w-9">
                    <AvatarImage src="https://placehold.co/40x40" alt="User Avatar" />
                    <AvatarFallback>NS</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">Neup Admin</p>
                    <p className="text-xs leading-none text-muted-foreground">@KHANALCWANI</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>Profile</DropdownMenuItem>
                <DropdownMenuItem>Billing</DropdownMenuItem>
                <DropdownMenuItem>Settings</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem>Log out</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <main className="mx-auto grid min-h-[calc(100vh-70px)] w-full max-w-[1440px] grid-cols-1 pt-[70px] lg:grid-cols-[345px_minmax(0,1fr)]">
          <aside className="hidden lg:block">
            <nav className="fixed bottom-0 left-[max(0px,calc((100vw-1440px)/2))] top-[70px] z-[5] w-[345px] overflow-y-auto overscroll-contain border-r border-border bg-background px-5 py-7" aria-label="Primary navigation">
              <p className="mb-5 px-4 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#7d8da0]">@KHANALCWANI</p>
              <div className="space-y-1">
                {navItems.slice(0, 1).map(renderNavLink)}
                <p className="mb-2 mt-8 px-4 text-[11px] font-semibold uppercase tracking-[0.1em] text-[#7d8da0]">Root</p>
                {navItems.slice(1, 10).map(renderNavLink)}
                <p className="mb-2 mt-8 px-4 text-[11px] font-semibold uppercase tracking-[0.1em] text-[#7d8da0]">Account</p>
                {navItems.slice(10).map(renderNavLink)}
              </div>
            </nav>
          </aside>

          <section className="min-w-0 px-6 py-8 lg:px-9 lg:py-9">{children}</section>
      </main>
      <Toaster />
    </div>
  );
}
