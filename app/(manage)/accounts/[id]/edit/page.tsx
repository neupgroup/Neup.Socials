'use client';

import * as React from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { updateWhatsAppTokenAction } from '@/services/accounts';
import { getAccountAction } from '@/services/db';

type FormData = {
  accessToken: string;
};

type AccountData = {
    platform: string;
    name: string;
}

export default function EditAccountPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const { toast } = useToast();
  const { register, handleSubmit, setValue, formState: { isSubmitting, isLoading } } = useForm<FormData>();
  const [account, setAccount] = React.useState<AccountData | null>(null);

  React.useEffect(() => {
    if (!id) return;

    const fetchAccount = async () => {
      const data = await getAccountAction(id);

      if (data) {
        if (data.platform !== 'WhatsApp') {
            toast({ title: 'Error', description: 'This page is only for editing WhatsApp accounts.', variant: 'destructive'});
            router.push('/accounts');
            return;
        }
        setAccount({ platform: data.platform, name: data.name ?? 'WhatsApp Account' });
      } else {
        toast({ title: 'Account not found', variant: 'destructive' });
        router.push('/accounts');
      }
    };

    fetchAccount();
  }, [id, setValue, router, toast]);

  const onSubmit = async (data: FormData) => {
    const result = await updateWhatsAppTokenAction(id, data.accessToken);
    if(result.success) {
      toast({ title: 'Access Token updated successfully!' });
      router.push(`/accounts/${id}`);
    } else {
      toast({ title: 'Failed to update token', description: result.error, variant: 'destructive' });
    }
  };

  if (isLoading || !account) {
    return <div className="flex justify-center items-center h-full"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
       <div className="flex items-center gap-4">
        <Button asChild variant="outline" size="icon">
          <Link href={`/accounts`}>
            <ArrowLeft />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Edit {account.name}</h1>
          <p className="text-muted-foreground">Modify the configuration for this {account.platform} account.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        <Card>
          <CardHeader>
            <CardTitle>WhatsApp Configuration</CardTitle>
            <CardDescription>
              Update the API Access Token for this account. The new token will be encrypted and stored securely.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="accessToken">New Access Token</Label>
              <Input
                id="accessToken"
                type="password"
                {...register('accessToken', { required: 'Access token is required.' })}
                placeholder="Enter the new permanent access token"
                disabled={isSubmitting}
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-between mt-6">
           <Button asChild variant="outline" disabled={isSubmitting}><Link href={`/accounts/${id}`}>Cancel</Link></Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        </div>
      </form>
    </div>
  );
}
