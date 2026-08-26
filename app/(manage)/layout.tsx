import AppLayoutClient from './AppLayoutClient';
import { application } from '@/base/application';
import { ensureCurrentAccountAction } from '@/services/accounts/actions';

export default async function AppLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const account = await ensureCurrentAccountAction();

  return <AppLayoutClient appName={application.appName} appImage={application.appLogo.mainlogo} account={account}>{children}</AppLayoutClient>;
}
