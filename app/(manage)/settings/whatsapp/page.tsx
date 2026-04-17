import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  getWhatsAppEmbeddedSignupLink,
  updateWhatsAppEmbeddedSignupLinkAction,
} from '@/services/system-config';

export default async function WhatsAppSettingsPage() {
  const embeddedSignupLink = await getWhatsAppEmbeddedSignupLink();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">WhatsApp Settings</h1>
        <p className="text-muted-foreground">Configure WhatsApp embedded signup.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Embedded Signup Link</CardTitle>
          <CardDescription>
            This link is used to launch the embedded signup flow.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={updateWhatsAppEmbeddedSignupLinkAction} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="embedded-signup-link">WhatsApp embedded signup link</Label>
              <Input
                id="embedded-signup-link"
                name="embeddedSignupLink"
                type="url"
                required
                defaultValue={embeddedSignupLink ?? ''}
                placeholder="https://www.facebook.com/v20.0/dialog/oauth?client_id=..."
              />
            </div>
            <Button type="submit">Save</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
