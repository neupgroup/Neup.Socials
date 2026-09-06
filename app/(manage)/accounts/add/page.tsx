
import { Suspense } from 'react';
import { AddAccountForm } from '@/components/add-account-form';
import FacebookOAuthProcessor from './facebook-oauth-processor';

export default async function AddAccountPage() {
  const embeddedSignupConfigId = process.env.SOCIALS_WHATSAPP_EMBEDDED_SIGNUP_CONFIG_ID ?? null;

  return (
    <>
      <Suspense fallback={null}>
        <FacebookOAuthProcessor />
      </Suspense>
      <AddAccountForm embeddedSignupConfigId={embeddedSignupConfigId} />
    </>
  );
}
