
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
import { useToast } from '@/core/hooks/use-toast';
import { getFacebookAuthUrl } from '@/services/facebook/auth';
import { FACEBOOK_AUTH_INTENTS } from '@/services/facebook/auth-intents';
import { getInstagramAuthUrl } from '@/services/instagram/auth';
import { getLinkedInAuthUrl } from '@/services/linkedin/auth';
import { encrypt } from '@/core/lib/crypto';
import { toAppUrl } from '@/core/lib/app-url';
import { getWhatsAppAccountName } from '@/services/whatsapp/api.get-account-name';
import { createConnectedAccountAction } from '@/services/db';
import {
  addPreverifiedWhatsAppNumberAction,
  exchangeWhatsAppAccessTokenAction,
  listPreverifiedWhatsAppNumbersAction,
} from '@/services/whatsapp/embedded-signup';


const formSchema = z.object({
  platform: z.enum(['Facebook', 'Instagram', 'Twitter', 'LinkedIn', 'WhatsApp'], {required_error: "Please select a platform."}),
  facebookIntents: z.array(z.enum(FACEBOOK_AUTH_INTENTS)).optional(),
  whatsappConnectMode: z.enum(['manual', 'embedded', 'preverified']).optional(),
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
    if (data.whatsappConnectMode === 'embedded' || data.whatsappConnectMode === 'preverified') {
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
  const [isPreverifiedSubmitting, setIsPreverifiedSubmitting] = React.useState(false);
  const [isEmbeddedSubmitting, setIsEmbeddedSubmitting] = React.useState(false);
  const router = useRouter();
  const { toast } = useToast();
  const [embeddedSignupUrl, setEmbeddedSignupUrl] = React.useState<string | null>(null);
  const [embeddedSignupConfigId, setEmbeddedSignupConfigId] = React.useState<string>('');
  const [embeddedSignupBusinessId, setEmbeddedSignupBusinessId] = React.useState('');
  const [embeddedSignupAssetIds, setEmbeddedSignupAssetIds] = React.useState<{
    adAccountIds?: string[];
    pageIds?: string[];
    datasetIds?: string[];
    catalogIds?: string[];
    igAccountIds?: string[];
    wabaIds?: string[];
  } | null>(null);
  const embeddedSignupRedirectUri = toAppUrl('/bridge/callback.v1/auth.facebook');
  
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
  const [preverifiedWabaId, setPreverifiedWabaId] = React.useState('');
  const [preverifiedPhoneNumber, setPreverifiedPhoneNumber] = React.useState('');
  const [preverifiedAccessToken, setPreverifiedAccessToken] = React.useState('');
  const [embeddedSignupWabaId, setEmbeddedSignupWabaId] = React.useState('');
  const [embeddedSignupPhoneNumberId, setEmbeddedSignupPhoneNumberId] = React.useState('');
  const [embeddedSignupCode, setEmbeddedSignupCode] = React.useState('');
  const [embeddedPreverifiedIds, setEmbeddedPreverifiedIds] = React.useState<string[]>([]);
  const embeddedSignupInFlight = React.useRef(false);
  const embeddedPreverifiedLoaded = React.useRef(false);

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

  React.useEffect(() => {
    if (selectedPlatform !== 'WhatsApp' || whatsappConnectMode !== 'embedded') return;

    let isActive = true;

    const loadEmbeddedSignupUrl = async () => {
      try {
        const response = await fetch('/api/whatsapp/embedded-signup', { cache: 'no-store' });
        if (!response.ok) {
          throw new Error('Failed to load embedded signup URL.');
        }
        const payload = (await response.json()) as { url?: string | null; configId?: string | null };
        if (!isActive) return;

        const url = payload.url ?? null;
        setEmbeddedSignupUrl(url);

        setEmbeddedSignupConfigId(payload.configId ?? '');
      } catch (error: any) {
        if (!isActive) return;
        setEmbeddedSignupUrl(null);
        setEmbeddedSignupConfigId('');
        toast({
          title: 'Embedded signup unavailable',
          description: error?.message || 'Could not load the embedded signup URL.',
          variant: 'destructive',
        });
      }
    };

    void loadEmbeddedSignupUrl();

    return () => {
      isActive = false;
    };
  }, [selectedPlatform, toast, whatsappConnectMode]);

  React.useEffect(() => {
    if (selectedPlatform !== 'WhatsApp' || whatsappConnectMode !== 'embedded') {
      setEmbeddedSignupWabaId('');
      setEmbeddedSignupPhoneNumberId('');
      setEmbeddedSignupCode('');
      setEmbeddedSignupBusinessId('');
      setEmbeddedSignupAssetIds(null);
      setEmbeddedPreverifiedIds([]);
      embeddedSignupInFlight.current = false;
      embeddedPreverifiedLoaded.current = false;
      setIsEmbeddedSubmitting(false);
    }
  }, [selectedPlatform, whatsappConnectMode]);

  React.useEffect(() => {
    if (selectedPlatform !== 'WhatsApp' || whatsappConnectMode !== 'embedded') return;
    if (embeddedPreverifiedLoaded.current) return;

    embeddedPreverifiedLoaded.current = true;

    const loadIds = async () => {
      const result = await listPreverifiedWhatsAppNumbersAction({ status: 'VERIFIED' });
      if (!result.success) {
        return;
      }

      const ids = (result.data as { data?: Array<{ id?: string }> })?.data
        ?.map((item) => item.id)
        .filter((id): id is string => Boolean(id)) ?? [];

      if (ids.length > 0) {
        setEmbeddedPreverifiedIds(ids);
      }
    };

    void loadIds();
  }, [selectedPlatform, whatsappConnectMode]);

  React.useEffect(() => {
    if (selectedPlatform !== 'WhatsApp' || whatsappConnectMode !== 'embedded') return;

    const handler = (event: MessageEvent) => {
      if (!event.origin.endsWith('facebook.com')) return;

      let payload: any = event.data;
      if (typeof payload === 'string') {
        try {
          payload = JSON.parse(payload);
        } catch {
          return;
        }
      }

      if (!payload || payload.type !== 'WA_EMBEDDED_SIGNUP') return;

      const eventType = payload.event;
      const data = payload.data || payload;

      if (eventType === 'CANCEL') {
        const currentStep = data?.current_step;
        const errorMessage = data?.error_message;
        const errorCode = data?.error_code;
        const description = errorMessage
          ? `${errorMessage}${errorCode ? ` (code ${errorCode})` : ''}`
          : currentStep
            ? `Flow exited at ${currentStep}.`
            : 'The embedded signup flow was cancelled.';

        toast({
          title: 'Embedded signup cancelled',
          description,
          variant: 'destructive',
        });
        return;
      }

      if (eventType === 'ERROR') {
        const errorMessage = data?.error_message || 'Embedded signup reported an error.';
        const errorCode = data?.error_code;
        toast({
          title: 'Embedded signup error',
          description: errorCode ? `${errorMessage} (code ${errorCode})` : errorMessage,
          variant: 'destructive',
        });
        return;
      }
      const wabaId = data.waba_id || data.wabaId || data.whatsapp_business_account_id || '';
      const phoneNumberId =
        data.phone_number_id ||
        data.phoneNumberId ||
        (Array.isArray(data.phone_number_ids) ? data.phone_number_ids[0] : '') ||
        '';
      const businessId = data.business_id || '';

      if (wabaId) setEmbeddedSignupWabaId(String(wabaId));
      if (phoneNumberId) setEmbeddedSignupPhoneNumberId(String(phoneNumberId));
      if (businessId) setEmbeddedSignupBusinessId(String(businessId));

      const assetIds = {
        adAccountIds: Array.isArray(data.ad_account_ids) ? data.ad_account_ids : undefined,
        pageIds: Array.isArray(data.page_ids) ? data.page_ids : undefined,
        datasetIds: Array.isArray(data.dataset_ids) ? data.dataset_ids : undefined,
        catalogIds: Array.isArray(data.catalog_ids) ? data.catalog_ids : undefined,
        igAccountIds: Array.isArray(data.ig_account_ids) ? data.ig_account_ids : undefined,
        wabaIds: Array.isArray(data.waba_ids) ? data.waba_ids : undefined,
      };
      setEmbeddedSignupAssetIds(assetIds);
    };

    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [selectedPlatform, whatsappConnectMode]);


  const finalizeEmbeddedSignup = React.useCallback(async (code: string, phoneNumberId: string, wabaId?: string) => {
    if (embeddedSignupInFlight.current) return;
    embeddedSignupInFlight.current = true;
    setIsEmbeddedSubmitting(true);

    try {
      const tokenResult = await exchangeWhatsAppAccessTokenAction({
        code,
        redirectUri: embeddedSignupRedirectUri,
      });

      if (!tokenResult.success) {
        throw new Error(tokenResult.error || 'Failed to exchange authorization code.');
      }

      const accessToken = (tokenResult.data as { access_token?: string })?.access_token;
      if (!accessToken) {
        throw new Error('No access token returned from Meta.');
      }

      const accountNameResult = await getWhatsAppAccountName(phoneNumberId, accessToken);
      if (!accountNameResult.verified_name) {
        throw new Error('Could not fetch display name for this Phone Number ID.');
      }

      const encryptedAccessToken = await encrypt(accessToken);

      await createConnectedAccountAction({
        platform: 'WhatsApp',
        platformId: phoneNumberId,
        name: accountNameResult.verified_name,
        username: phoneNumberId,
        nameStatus: accountNameResult.name_status,
        encryptedToken: encryptedAccessToken,
        status: 'Active',
        owner: userId,
        metadata: {
          embeddedSignup: true,
          wabaId,
          businessId: embeddedSignupBusinessId || undefined,
          assets: embeddedSignupAssetIds || undefined,
        },
      });

      toast({ title: 'WhatsApp account connected successfully!' });
      router.push('/accounts');
    } catch (error: any) {
      toast({
        title: 'Embedded signup failed',
        description: error?.message || 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      embeddedSignupInFlight.current = false;
      setIsEmbeddedSubmitting(false);
    }
  }, [embeddedSignupAssetIds, embeddedSignupBusinessId, embeddedSignupRedirectUri, router, toast, userId]);

  React.useEffect(() => {
    if (whatsappConnectMode !== 'embedded') return;
    if (!embeddedSignupCode || !embeddedSignupPhoneNumberId) return;
    void finalizeEmbeddedSignup(embeddedSignupCode, embeddedSignupPhoneNumberId, embeddedSignupWabaId || undefined);
  }, [embeddedSignupCode, embeddedSignupPhoneNumberId, embeddedSignupWabaId, finalizeEmbeddedSignup, whatsappConnectMode]);

  const handleWhatsAppEmbeddedSignup = () => {
    const win = window as Window & { FB?: { login: (cb: (response: any) => void, opts: Record<string, unknown>) => void } };

    if (win.FB?.login) {
      if (!embeddedSignupConfigId) {
        toast({
          title: 'Embedded signup unavailable',
          description: 'Missing embedded signup configuration ID.',
          variant: 'destructive',
        });
        return;
      }
      win.FB.login(
        (response: any) => {
          const code = response?.authResponse?.code;
          if (!code) {
            setIsEmbeddedSubmitting(false);
            toast({
              title: 'Embedded signup cancelled',
              description: 'No authorization code was returned.',
              variant: 'destructive',
            });
            return;
          }

          setEmbeddedSignupCode(code);
        },
        {
          config_id: embeddedSignupConfigId,
          response_type: 'code',
          override_default_response_type: true,
          extras: {
            version: 'v4',
            setup: embeddedPreverifiedIds.length > 0
              ? { preVerifiedPhone: { ids: embeddedPreverifiedIds } }
              : {},
            featureType: 'whatsapp_business_app_onboarding',
            features: [{ name: 'app_only_install' }],
            sessionInfoVersion: 3,
          },
        }
      );
      return;
    }

    if (embeddedSignupUrl) {
      const popup = window.open(embeddedSignupUrl, '_blank', 'noopener,noreferrer');
      if (!popup) {
        window.location.href = embeddedSignupUrl;
      }
    } else {
      toast({
        title: 'Embedded signup unavailable',
        description: 'No embedded signup URL is configured.',
        variant: 'destructive',
      });
    }
  };

  const handlePreverifiedNumberAdd = async () => {
    setIsPreverifiedSubmitting(true);
    try {
      const result = await addPreverifiedWhatsAppNumberAction({
        businessAccountId: preverifiedWabaId.trim(),
        phoneNumber: preverifiedPhoneNumber.trim(),
        accessToken: preverifiedAccessToken.trim() || undefined,
      });

      if (!result.success) {
        throw new Error(result.error || 'Failed to add preverified number.');
      }

      toast({ title: 'Phone number added to WhatsApp Business Account.' });
    } catch (error: any) {
      toast({
        title: 'Failed to add preverified number',
        description: error?.message || 'Please verify the inputs and try again.',
        variant: 'destructive',
      });
    } finally {
      setIsPreverifiedSubmitting(false);
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
        : selectedPlatform === 'Instagram'
          ? await getInstagramAuthUrl(userId)
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
  const oauthDescription = selectedPlatform === 'Instagram'
    ? 'You will be redirected to Instagram Login for professional accounts. Meta can also show a Facebook sign-in option there if the Instagram account is linked.'
    : selectedPlatform === 'Facebook'
      ? 'You will be redirected to Facebook Login to authorize your Pages.'
      : `You will be redirected to ${selectedPlatform} to authorize the connection.`;

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
                    {selectedPlatform === 'Instagram' && (
                      <div className="rounded-md border bg-muted/40 p-3 text-left">
                        <p className="text-sm font-medium">Instagram Login</p>
                        <p className="text-sm text-muted-foreground">
                          This flow is for Instagram professional accounts and requests business access for profile basics, publishing, comments, and messages.
                        </p>
                        <p className="text-sm text-muted-foreground">
                          If the account is connected to Facebook, Meta can let the user continue with Facebook directly from the Instagram login screen.
                        </p>
                      </div>
                    )}
                    <p className="text-muted-foreground mb-1">
                        {oauthDescription}
                    </p>
                    <Button onClick={handleOAuthConnect} disabled={isSubmitting} type="button">
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Continue to {selectedPlatform === 'Instagram' ? 'Instagram Login' : selectedPlatform}
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
                                    <SelectItem value="preverified">Preverified Number Addition</SelectItem>
                                  </SelectContent>
                                </Select>
                              )}
                            />
                        </div>

                        {whatsappConnectMode === 'preverified' && (
                          <div className="space-y-3 rounded-md border p-4">
                            <div className="space-y-1">
                              <p className="text-sm font-medium">Preverified Number Addition</p>
                              <p className="text-sm text-muted-foreground">
                                Add a preverified phone number to an existing WhatsApp Business Account. The server will use
                                the system user token unless you provide a token below.
                              </p>
                            </div>
                            <div className="grid gap-3 md:grid-cols-2">
                              <div className="space-y-2">
                                <Label htmlFor="preverifiedWabaId">WhatsApp Business Account ID</Label>
                                <Input
                                  id="preverifiedWabaId"
                                  value={preverifiedWabaId}
                                  onChange={(event) => setPreverifiedWabaId(event.target.value)}
                                  placeholder="571433372435331"
                                />
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor="preverifiedPhoneNumber">Phone Number</Label>
                                <Input
                                  id="preverifiedPhoneNumber"
                                  value={preverifiedPhoneNumber}
                                  onChange={(event) => setPreverifiedPhoneNumber(event.target.value)}
                                  placeholder="9779840710507"
                                />
                              </div>
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="preverifiedAccessToken">Access Token (optional)</Label>
                              <Input
                                id="preverifiedAccessToken"
                                type="password"
                                value={preverifiedAccessToken}
                                onChange={(event) => setPreverifiedAccessToken(event.target.value)}
                                placeholder="Use system user token from server if empty"
                                autoComplete="new-password"
                              />
                            </div>
                            <div className="flex flex-wrap items-center gap-3">
                              <Button
                                type="button"
                                variant="secondary"
                                onClick={handlePreverifiedNumberAdd}
                                disabled={isPreverifiedSubmitting}
                              >
                                {isPreverifiedSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Add Preverified Number
                              </Button>
                            </div>
                          </div>
                        )}

                        {whatsappConnectMode === 'embedded' && (
                          <div className="space-y-3 rounded-md border p-4">
                            <Button type="button" onClick={handleWhatsAppEmbeddedSignup} disabled={isEmbeddedSubmitting}>
                              {isEmbeddedSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
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

                {(isLegacyFlow || (isWhatsAppFlow && whatsappConnectMode === 'manual')) && (
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
