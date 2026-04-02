
'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  Menu,
  Calendar,
  Inbox,
  LayoutGrid,
  Settings,
  Users,
  MessageSquareText,
  PlusSquare,
  AlertTriangle,
  Upload,
  ArrowRightLeft,
  Plus,
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
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/', icon: LayoutGrid, label: 'Dashboard' },
  { href: '/analytics', icon: LayoutGrid, label: 'Analytics' },
  { href: '/schedule', icon: Calendar, label: 'Schedule' },
  { href: '/content', icon: PlusSquare, label: 'Content' },
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
  const [mobileNavOpen, setMobileNavOpen] = React.useState(false);

  // This check allows nested routes like /accounts/[id]
  const isAllowed = allowedPaths.some(path => pathname.startsWith(path));

  if (!isAllowed) {
    notFound();
  }

  const mainNavItems = [
    { href: '/', label: 'Dashboard' },
    { href: '/analytics', label: 'Analytics' },
    { href: '/content', label: 'Content' },
    { href: '/schedule', label: 'Schedule' },
    { href: '/accounts', label: 'Accounts' },
    { href: '/uploads', label: 'Uploads' },
  ];

  return (
    <div className="min-h-screen bg-white text-foreground">
      <header className="fixed inset-x-0 top-0 z-50 w-full border-b border-border/60 bg-card/80 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-[1440px] items-center px-5 md:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="lg:hidden">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[300px] p-0">
                <div className="flex h-full flex-col bg-background">
                  <div className="border-b p-4">
                    <Link href="/" className="flex items-center gap-2" onClick={() => setMobileNavOpen(false)}>
                      <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                        <MessageSquareText className="size-5" />
                      </div>
                      <span className="font-headline text-lg font-semibold">Neup.Socials</span>
                    </Link>
                  </div>
                  <nav className="space-y-1 p-3">
                    {navItems.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMobileNavOpen(false)}
                        className={cn(
                          'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                          pathname.startsWith(item.href)
                            ? 'bg-primary/10 text-primary'
                            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                        )}
                      >
                        <item.icon className="h-4 w-4" />
                        <span>{item.label}</span>
                      </Link>
                    ))}
                  </nav>
                </div>
              </SheetContent>
            </Sheet>

            <Link href="/" className="flex items-center gap-2">
              <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <MessageSquareText className="size-5" />
              </div>
              <span className="font-headline text-lg font-semibold">Neup.Socials</span>
            </Link>
          </div>

          <nav className="ml-10 hidden items-center gap-1 lg:flex">
            {mainNavItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  pathname.startsWith(item.href)
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <Button className="hidden sm:inline-flex" asChild>
              <Link href="/content/create">
                <Plus className="mr-2 h-4 w-4" />
                New Post
              </Link>
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src="https://placehold.co/40x40" alt="User Avatar" />
                    <AvatarFallback>NS</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">Neup Admin</p>
                    <p className="text-xs leading-none text-muted-foreground">admin@neup.socials</p>
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

      <main className="w-full pt-16">
        <div className="mx-auto grid w-full max-w-[1440px] grid-cols-1 px-5 py-6 md:px-6 lg:grid-cols-[280px_minmax(0,1fr)] lg:gap-8 lg:px-8 lg:py-8">
          <aside className="hidden self-start lg:sticky lg:top-24 lg:block">
            <div className="rounded-2xl border border-border/70 bg-card p-3">
              <nav className="space-y-1">
                {navItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors',
                      pathname.startsWith(item.href)
                        ? 'bg-primary/10 text-primary'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </Link>
                ))}
              </nav>
            </div>
          </aside>

          <section className="min-w-0">{children}</section>
        </div>
      </main>
      <Toaster />
    </div>
  );
}
