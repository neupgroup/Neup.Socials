import Link from 'next/link';
import { ArrowRight, BookUser, MessageCircle, Settings2, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '#/components/ui/card';

const settingsSections = [
  { href: '/settings/accounts', title: 'Platform accounts', description: 'View accounts created and stored on this platform.', icon: BookUser },
  { href: '/settings/whatsapp', title: 'WhatsApp', description: 'Configure WhatsApp connections and messaging preferences.', icon: MessageCircle },
  { href: '/accounts', title: 'Connected accounts', description: 'Manage social and external accounts connected to your workspace.', icon: Users },
];

export default function SettingsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="mt-2 text-muted-foreground">Manage your accounts, integrations, and workspace preferences.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {settingsSections.map(({ href, title, description, icon: Icon }) => (
          <Link key={href} href={href} className="group block">
            <Card className="h-full transition-colors group-hover:border-primary">
              <CardHeader>
                <Icon className="mb-2 h-5 w-5" />
                <CardTitle className="flex items-center justify-between gap-3">{title}<ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1" /></CardTitle>
                <CardDescription>{description}</CardDescription>
              </CardHeader>
              <CardContent className="flex items-center gap-2 text-sm text-muted-foreground"><Settings2 className="h-4 w-4" />Open settings</CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
