
import { AddAccountForm } from '@/components/add-account-form';
import { getWhatsAppEmbeddedSignupConfigId, getWhatsAppEmbeddedSignupUrl } from '@/services/whatsapp/embedded-signup-config';

export default async function AddAccountPage() {
  const [embeddedSignupUrl, embeddedSignupConfigId] = await Promise.all([
    getWhatsAppEmbeddedSignupUrl(),
    getWhatsAppEmbeddedSignupConfigId(),
  ]);

  return (
    <AddAccountForm
      embeddedSignupUrl={embeddedSignupUrl}
      embeddedSignupConfigId={embeddedSignupConfigId}
    />
  );
}
