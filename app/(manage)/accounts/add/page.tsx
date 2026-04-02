
'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Script from 'next/script';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowLeft, Loader2, Facebook, Instagram, Twitter, Linkedin } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getFacebookAuthUrl } from '@/actions/facebook/auth';
import { FACEBOOK_AUTH_INTENTS } from '@/actions/facebook/auth-intents';
import { getInstagramAuthUrl } from '@/actions/instagram/auth';
import { getLinkedInAuthUrl } from '@/actions/linkedin/auth';
import { encrypt } from '@/lib/crypto';
import { getWhatsAppAccountName } from '@/core/whatsapp/api';
import { createConnectedAccountAction } from '@/actions/db';


const formSchema = z.object({
  platform: z.enum(['Facebook', 'Instagram', 'Twitter', 'LinkedIn', 'WhatsApp'], {required_error: "Please select a platform."}),
  facebookIntents: z.array(z.enum(FACEBOOK_AUTH_INTENTS)).optional(),
  whatsappConnectMode: z.enum(['manual', 'embedded']).optional(),
  username: z.string().optional(),
  password: z.string().optional(),
  phoneNumberId: z.string().optional(),
  accessToken: z.string().optional(),
}).refine(data => {
    if (data.platform === 'Twitter') {
        return !!data.username && !!data.password;
    }
    return true;
}, {
    message: 'Username and password are required for Twitter.',
    path: ['username'],
}).refine(data => {
    if (data.platform === 'WhatsApp') {
    if (data.whatsappConnectMode === 'embedded') {
      return true;
    }
    return !!data.phoneNumberId && !!data.accessToken;
    }
    return true;
}, {
  message: 'Phone Number ID and Access Token are required for manual mode.',
    path: ['phoneNumberId'],
}).refine(data => {
  if (data.platform === 'Facebook') {
    return !!data.facebookIntents && data.facebookIntents.length > 0;
  }
  return true;
}, {
  message: 'Select at least one Facebook intention.',
  path: ['facebookIntents'],
});


type FormValues = z.infer<typeof formSchema>;

const WhatsAppIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M.052 24l1.688-6.164a11.91 11.91 0 01-1.74-6.36C.002 5.075 5.373 0 12.002 0s11.998 5.074 11.998 11.474c0 6.4-5.372 11.475-11.998 11.475a11.859 11.859 0 01-5.94-1.542L.052 24zm6.65-3.666a9.888 9.888 0 0011.082-9.556c0-5.473-4.437-9.91-9.91-9.91-5.473 0-9.91 4.437-9.91 9.91a9.89 9.89 0 003.834 7.62l-1.12 4.09 4.2-1.074zM12.002 2.148c4.34 0 7.864 3.525 7.864 7.864s-3.524 7.864-7.864 7.864-7.864-3.525-7.864-7.864c0-2.12.842-4.045 2.215-5.48a7.765 7.765 0 015.65-2.384zm-3.097 2.922c-.15-.002-.325.042-.47.27-.144.228-.48.77-.582.92-.102.148-.204.168-.346.102-.143-.064-1.012-.468-1.928-1.19a6.685 6.685 0 01-1.39-1.623c-.144-.246-.072-.38.06-.504.12-.11.264-.288.396-.432.108-.12.144-.204.216-.348.072-.143.036-.264-.012-.348-.05-.084-.468-.996-.636-1.356-.156-.324-.312-.276-.432-.282-.11-.006-.24-.006-.372-.006-.131 0-.347.042-.522.282-.174.24-.66.636-.66 1.542 0 .906.672 1.782.768 1.902.096.12 1.32 2.016 3.204 2.82.42.18.768.288 1.032.372.432.144.828.12 1.14.072.36-.06.996-.528 1.14-1.032.143-.504.143-.924.108-1.008-.036-.084-.144-.132-.3-.216z"/>
    </svg>
);


const platformDetails = {
    Facebook: { icon: <Facebook className="h-5 w-5 text-blue-600" />, isOauth: true, handler: getFacebookAuthUrl },
    Instagram: { icon: <Instagram className="h-5 w-5 text-pink-500" />, isOauth: true, handler: getInstagramAuthUrl },
    LinkedIn: { icon: <Linkedin className="h-5 w-5 text-blue-700" />, isOauth: true, handler: getLinkedInAuthUrl },
    Twitter: { icon: <Twitter className="h-5 w-5 text-blue-400" />, isOauth: false },
    WhatsApp: { icon: <WhatsAppIcon className="h-5 w-5 text-green-500" />, isOauth: false }
}

export default function AddAccountPage() {
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const router = useRouter();
  const { toast } = useToast();
  const embeddedSignupUrl = 'https://business.facebook.com/messaging/whatsapp/onboard/?app_id=1460023928746399&config_id=1316777340482161&extras=%7B%22featureType%22%3A%22whatsapp_business_app_onboarding%22%2C%22sessionInfoVersion%22%3A%223%22%2C%22version%22%3A%22v3%22%2C%22features%22%3A[%7B%22name%22%3A%22marketing_messages_lite%22%7D%2C%7B%22name%22%3A%22app_only_install%22%7D]%7D';
  
  const userId = 'neupkishor';

  const { control, handleSubmit, watch, setValue, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      platform: undefined,
      facebookIntents: ['posts'],
      whatsappConnectMode: 'manual',
    }
  });
  
  const selectedPlatform = watch('platform');
  const selectedFacebookIntents = watch('facebookIntents') || [];
  const whatsappConnectMode = watch('whatsappConnectMode') || 'manual';

  React.useEffect(() => {
    if (selectedPlatform !== 'WhatsApp') return;

    const win = window as Window & { fbAsyncInit?: () => void; FB?: { init: (config: Record<string, unknown>) => void } };
    win.fbAsyncInit = function() {
      if (!win.FB) return;
      win.FB.init({
        appId: '1460023928746399',
        autoLogAppEvents: true,
        xfbml: true,
        version: 'v25.0',
      });
    };
  }, [selectedPlatform]);

  const handleWhatsAppEmbeddedSignup = () => {
    const popup = window.open(embeddedSignupUrl, '_blank', 'noopener,noreferrer');
    if (!popup) {
      window.location.href = embeddedSignupUrl;
    }
  };

  const handleOAuthConnect = async () => {
    if (!selectedPlatform) return;
    const platform = platformDetails[selectedPlatform];
    if (!platform || !platform.isOauth || !('handler' in platform) || !platform.handler) return;

    setIsSubmitting(true);
    try {
      const authUrl = selectedPlatform === 'Facebook'
        ? await getFacebookAuthUrl(userId, selectedFacebookIntents)
        : await platform.handler(userId);
      window.location.href = authUrl;
    } catch (error) {
        console.error(`Error getting ${selectedPlatform} auth URL: `, error);
        toast({
            title: `Could not connect to ${selectedPlatform}`,
            description: 'An unexpected error occurred. Please try again.',
            variant: 'destructive',
        });
        setIsSubmitting(false);
    }
  };
  
  const onSubmit = async (data: FormValues) => {
    setIsSubmitting(true);
    try {
      if (data.platform === 'WhatsApp') {
        if (data.whatsappConnectMode === 'embedded') {
          handleWhatsAppEmbeddedSignup();
          setIsSubmitting(false);
          return;
        }

        const accountNameResult = await getWhatsAppAccountName(data.phoneNumberId!, data.accessToken!);
        
        if (!accountNameResult.verified_name) {
          throw new Error('Could not fetch display name for this Phone Number ID. Please check the ID and Access Token.');
        }

        const encryptedAccessToken = await encrypt(data.accessToken!);

        await createConnectedAccountAction({
            platform: 'WhatsApp',
            platformId: data.phoneNumberId!,
            name: accountNameResult.verified_name,
            username: data.phoneNumberId!,
            nameStatus: accountNameResult.name_status,
            encryptedToken: encryptedAccessToken,
            status: 'Active',
            owner: userId,
        });

        toast({ title: 'WhatsApp account connected successfully!' });
        router.push('/accounts');
      } else if (data.platform === 'Twitter') {
         await createConnectedAccountAction({
            platform: data.platform,
            username: data.username,
            name: data.username,
            status: 'Active',
            owner: userId,
        });
        toast({ title: `${data.platform} account connected successfully!` });
        router.push('/accounts');
      }
    } catch (error: any) {
      console.error(`Error connecting ${data.platform}: `, error);
      toast({ title: `Failed to connect ${data.platform}`, description: error.message || 'An unexpected error occurred.', variant: 'destructive' });
      setIsSubmitting(false);
    }
  };

  const isOauthFlow = selectedPlatform && platformDetails[selectedPlatform]?.isOauth;
  const isWhatsAppFlow = selectedPlatform === 'WhatsApp';
  const isLegacyFlow = selectedPlatform === 'Twitter';

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {isWhatsAppFlow && (
        <>
          <div id="fb-root" />
          <Script
            id="facebook-jssdk"
            strategy="afterInteractive"
            src="https://connect.facebook.net/en_US/sdk.js"
            async
            defer
            crossOrigin="anonymous"
          />
        </>
      )}

      <div className="flex items-center gap-4">
        <Button asChild variant="outline" size="icon">
          <Link href="/accounts">
            <ArrowLeft />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Connect a New Account</h1>
          <p className="text-muted-foreground">
            Select a platform to get started.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Account Details</CardTitle>
          <CardDescription>
            {isOauthFlow ? 'You will be securely redirected to authorize your account.' : 'Please provide the necessary credentials for connection.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" autoComplete="off">
            <div className="space-y-2">
              <Label htmlFor="platform">Platform</Label>
               <Controller
                name="platform"
                control={control}
                render={({ field }) => (
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <SelectTrigger id="platform">
                            <SelectValue placeholder="Select a platform..." />
                        </SelectTrigger>
                        <SelectContent>
                            {Object.entries(platformDetails).map(([name, {icon}]) => (
                                <SelectItem key={name} value={name}>
                                    <div className="flex items-center gap-2">
                                        {icon} {name}
                                    </div>
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                )}
                />
              {errors.platform && (
                <p className="text-sm text-destructive">{errors.platform.message}</p>
              )}
            </div>

            {selectedPlatform && (
              <>
                {isOauthFlow && (
                    <div className="space-y-4 text-center p-4 border-dashed border-2 rounded-lg">
                    {selectedPlatform === 'Facebook' && (
                      <div className="space-y-3 text-left">
                        <div>
                          <h3 className="font-medium">What do you want to access?</h3>
                          <p className="text-sm text-muted-foreground">
                            We request only the Facebook permissions needed for your selected intention.
                          </p>
                        </div>
                        <div className="space-y-2 rounded-md border p-3">
                          <div className="flex items-center gap-2">
                            <Checkbox
                              id="fb-intent-messages"
                              checked={selectedFacebookIntents.includes('messages')}
                              onCheckedChange={(checked) => {
                                const current = new Set(selectedFacebookIntents);
                                if (checked) {
                                  current.add('messages');
                                } else {
                                  current.delete('messages');
                                }
                                setValue('facebookIntents', Array.from(current), { shouldValidate: true });
                              }}
                            />
                            <Label htmlFor="fb-intent-messages" className="cursor-pointer">Messages</Label>
                          </div>
                          <p className="text-xs text-muted-foreground">Read page conversations and messages.</p>
                          <div className="flex items-center gap-2 pt-1">
                            <Checkbox
                              id="fb-intent-posts"
                              checked={selectedFacebookIntents.includes('posts')}
                              onCheckedChange={(checked) => {
                                const current = new Set(selectedFacebookIntents);
                                if (checked) {
                                  current.add('posts');
                                } else {
                                  current.delete('posts');
                                }
                                setValue('facebookIntents', Array.from(current), { shouldValidate: true });
                              }}
                            />
                            <Label htmlFor="fb-intent-posts" className="cursor-pointer">Posts</Label>
                          </div>
                          <p className="text-xs text-muted-foreground">Read posts and post comments.</p>
                        </div>
                        {errors.facebookIntents && (
                          <p className="text-sm text-destructive">{errors.facebookIntents.message}</p>
                        )}
                      </div>
                    )}
                    <p className="text-muted-foreground mb-1">
                        You will be redirected to {selectedPlatform} to authorize the connection.
                    </p>
                    <Button onClick={handleOAuthConnect} disabled={isSubmitting} type="button">
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Continue to {selectedPlatform}
                    </Button>
                    </div>
                )}
                
                {isWhatsAppFlow && (
                    <div className="space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="whatsappConnectMode">Connection Method</Label>
                            <Controller
                              name="whatsappConnectMode"
                              control={control}
                              render={({ field }) => (
                                <Select onValueChange={field.onChange} defaultValue={field.value ?? 'manual'}>
                                  <SelectTrigger id="whatsappConnectMode">
                                    <SelectValue placeholder="Select connection method..." />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="manual">Manual (Phone Number ID + Access Token)</SelectItem>
                                    <SelectItem value="embedded">Embedded Signup (Meta)</SelectItem>
                                  </SelectContent>
                                </Select>
                              )}
                            />
                        </div>

                        {whatsappConnectMode === 'embedded' && (
                          <div className="space-y-3 rounded-md border p-4">
                            <p className="text-sm text-muted-foreground">
                              Use Meta Embedded Signup to connect WhatsApp Business in a guided flow.
                            </p>
                            <Button type="button" onClick={handleWhatsAppEmbeddedSignup}>
                              Continue with Embedded Signup
                            </Button>
                          </div>
                        )}

                        {whatsappConnectMode === 'manual' && (
                          <>
                         <div className="space-y-2">
                            <Label htmlFor="phoneNumberId">Phone Number ID</Label>
                            <Controller name="phoneNumberId" control={control} render={({ field }) => <Input id="phoneNumberId" {...field} placeholder="From Meta Developer Dashboard" />} />
                            {errors.phoneNumberId && <p className="text-sm text-destructive">{errors.phoneNumberId.message}</p>}
                        </div>
                         <div className="space-y-2">
                            <Label htmlFor="accessToken">Access Token</Label>
                            <Controller name="accessToken" control={control} render={({ field }) => <Input id="accessToken" type="password" {...field} placeholder="Permanent API Access Token" />} />
                            {errors.accessToken && <p className="text-sm text-destructive">{errors.accessToken.message}</p>}
                        </div>
                          </>
                        )}
                    </div>
                )}

                {isLegacyFlow && (
                    <div className="space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="username">Username or Email</Label>
                            <Controller name="username" control={control} render={({ field }) => <Input id="username" {...field} placeholder="e.g., @yourhandle" autoComplete="off" />} />
                            {errors.username && <p className="text-sm text-destructive">{errors.username.message}</p>}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password">Password</Label>
                            <Controller name="password" control={control} render={({ field }) => <Input id="password" type="password" {...field} placeholder="••••••••" autoComplete="new-password"/>} />
                            {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
                        </div>
                    </div>
                )}

                {(isWhatsAppFlow || isLegacyFlow) && (
                    <div className="flex justify-end pt-4">
                    <Button type="submit" disabled={isSubmitting || (isWhatsAppFlow && whatsappConnectMode === 'embedded')}>
                            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Connect {selectedPlatform}
                        </Button>
                    </div>
                )}
              </>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
