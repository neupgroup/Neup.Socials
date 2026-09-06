'use server';

import type React from 'react';
import { ensureCurrentAccountAction } from '@/services/accounts/actions';
import InboxLayoutClient from './InboxLayoutClient';

export default async function InboxLayout({ children }: Readonly<{ children: React.ReactNode }>) {
    const account = await ensureCurrentAccountAction();
    return <InboxLayoutClient initialAccount={account}>{children}</InboxLayoutClient>;
}
