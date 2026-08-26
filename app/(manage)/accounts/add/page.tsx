
import { AddAccountForm } from '@/components/add-account-form';

export default async function AddAccountPage() {
  const embeddedSignupConfigId = process.env.SOCIALS_WHATSAPP_EMBEDDED_SIGNUP_CONFIG_ID ?? null;

  return (
    <AddAccountForm
      embeddedSignupConfigId={embeddedSignupConfigId}
    />
  );
}
