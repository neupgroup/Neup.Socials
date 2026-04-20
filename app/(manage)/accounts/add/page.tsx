
import { AddAccountForm } from '@/components/add-account-form';
import { getWhatsAppEmbeddedSignupUrl } from '@/services/whatsapp/embedded-signup-config';

export default async function AddAccountPage() {
  const embeddedSignupUrl = await getWhatsAppEmbeddedSignupUrl();

  return (
    <AddAccountForm
      embeddedSignupUrl={embeddedSignupUrl}
    />
  );
}
