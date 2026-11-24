
import AppLayoutClient from './AppLayoutClient';
import identityConfig from '@base/identity.json';
import assetsConfig from '@base/assets.json';
import { ensureCurrentAccountAction } from '@/services/accounts/actions';
import { makeAppPath } from '@neup/core/appconfig';

export default async function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const account = await ensureCurrentAccountAction();

  return (
    <AppLayoutClient
      appName={identityConfig.name}
      appImage={makeAppPath(assetsConfig.logo.main)}
      account={account}
    >
      {children}
    </AppLayoutClient>
  );
}
