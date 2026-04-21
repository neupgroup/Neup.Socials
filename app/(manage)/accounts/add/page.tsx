
import { AddAccountForm } from '@/components/add-account-form';

export default async function AddAccountPage() {
  const embeddedSignupConfigId = process.env.WHATSAPP_EMBEDDED_SIGNUP_CONFIG_ID ?? null;

  return (
    <AddAccountForm
      embeddedSignupConfigId={embeddedSignupConfigId}
    />
  );
}
