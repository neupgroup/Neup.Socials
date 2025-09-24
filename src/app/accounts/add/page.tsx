'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Loader2, Facebook, Instagram, Twitter, Linkedin } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { getFacebookAuthUrl } from '@/actions/facebook/auth';

const formSchema = z.object({
  platform: z.enum(['Facebook', 'Instagram', 'Twitter', 'LinkedIn'], {required_error: "Please select a platform."}),
  username: z.string().min(1, 'Username is required.'),
  password: z.string().min(1, 'Password is required.'),
});

type FormValues = z.infer<typeof formSchema>;

const platformDetails = {
    Facebook: { icon: <Facebook className="h-5 w-5 text-blue-600" />, isOauth: true },
    Instagram: { icon: <Instagram className="h-5 w-5 text-pink-500" />, isOauth: false },
    Twitter: { icon: <Twitter className="h-5 w-5 text-blue-400" />, isOauth: false },
    LinkedIn: { icon: <Linkedin className="h-5 w-5 text-blue-700" />, isOauth: false },
}

export default function AddAccountPage() {
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const router = useRouter();
  const { toast } = useToast();
  
  // This should be replaced with the actual logged-in user's ID
  const userId = 'neupkishor';

  const {
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      platform: undefined,
      username: '',
      password: '',
    },
  });

  const selectedPlatform = watch('platform');

  const handleFacebookConnect = async () => {
    setIsSubmitting(true);
    try {
      // This assumes the user ID is available. In a real app, you'd get this from your auth context.
      const authUrl = await getFacebookAuthUrl(userId);
      // Redirect the user to Facebook's auth dialog
      window.location.href = authUrl;
    } catch (error) {
        console.error("Error getting Facebook auth URL: ", error);
        toast({
            title: 'Could not connect to Facebook',
            description: 'An unexpected error occurred. Please try again.',
            variant: 'destructive',
        });
        setIsSubmitting(false);
    }
  };
  
  const onSubmit = async (data: FormValues) => {
    if (data.platform === 'Facebook') {
        await handleFacebookConnect();
        return;
    }

    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'connected_accounts'), {
        platform: data.platform,
        username: data.username,
        // In a real app, you would not store the password. This is for simulation.
        name: data.platform === 'LinkedIn' ? `${data.username}'s Company` : data.username,
        status: 'Active',
        connectedOn: serverTimestamp(),
        owner: userId,
      });
      toast({ title: `${data.platform} account connected successfully!` });
      router.push('/accounts');
    } catch (error) {
      console.error(`Error connecting ${data.platform}: `, error);
      toast({
        title: `Failed to connect ${data.platform}`,
        description: 'An unexpected error occurred. Please try again.',
        variant: 'destructive',
      });
      setIsSubmitting(false);
    }
  };

  const isOauthFlow = selectedPlatform && platformDetails[selectedPlatform]?.isOauth;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button asChild variant="outline" size="icon">
          <Link href="/accounts">
            <ArrowLeft />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Connect a New Account</h1>
          <p className="text-muted-foreground">
            Select a platform and enter your credentials to get started.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Account Details</CardTitle>
          <CardDescription>
            We will securely connect to your account. We do not store your passwords for most platforms.
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
              isOauthFlow ? (
                <div className="text-center p-4 border-dashed border-2 rounded-lg">
                  <p className="text-muted-foreground mb-4">
                    You will be redirected to {selectedPlatform} to authorize the connection.
                  </p>
                   <Button type="submit" disabled={isSubmitting}>
                      {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Continue to {selectedPlatform}
                  </Button>
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="username">Username or Email</Label>
                    <Controller
                      name="username"
                      control={control}
                      render={({ field }) => <Input id="username" {...field} placeholder="e.g., @yourhandle" autoComplete="off" />}
                    />
                    {errors.username && (
                      <p className="text-sm text-destructive">{errors.username.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Controller
                      name="password"
                      control={control}
                      render={({ field }) => <Input id="password" type="password" {...field} placeholder="••••••••" autoComplete="new-password"/>}
                    />
                    {errors.password && (
                      <p className="text-sm text-destructive">{errors.password.message}</p>
                    )}
                  </div>
                   <div className="flex justify-end pt-4">
                      <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Connect Account
                      </Button>
                    </div>
                </>
              )
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
