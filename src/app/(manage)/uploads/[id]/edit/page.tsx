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
import { getUploadAction, updateUploadAction } from '@/actions/db';

type FormData = {
  contentName: string;
};

export default function EditUploadPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const { toast } = useToast();
  const { register, handleSubmit, setValue, formState: { isSubmitting, isLoading } } = useForm<FormData>();

  React.useEffect(() => {
    if (!id) return;

    const fetchUpload = async () => {
      const data = await getUploadAction(id);

      if (data) {
        setValue('contentName', data.contentName || '');
      } else {
        toast({ title: 'Upload not found', variant: 'destructive' });
        router.push('/uploads');
      }
    };

    fetchUpload();
  }, [id, setValue, router, toast]);

  const onSubmit = async (data: FormData) => {
    try {
      await updateUploadAction(id, { contentName: data.contentName });
      toast({ title: 'Upload updated successfully!' });
      router.push(`/uploads/${id}`);
    } catch (error) {
      console.error("Error updating upload:", error);
      toast({ title: 'Failed to update upload', variant: 'destructive' });
    }
  };

  if (isLoading) {
    return <div className="flex justify-center items-center h-full"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
       <div className="flex items-center gap-4">
        <Button asChild variant="outline" size="icon">
          <Link href={`/uploads/${id}`}>
            <ArrowLeft />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Edit Upload</h1>
          <p className="text-muted-foreground">Modify the details for this media file.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        <Card>
          <CardHeader>
            <CardTitle>Media Details</CardTitle>
            <CardDescription>
              The content name is used for searching in your media library. It does not affect the actual file name.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="contentName">Content Name (for search)</Label>
              <Input
                id="contentName"
                {...register('contentName')}
                placeholder="e.g., 'Summer campaign hero image'"
                disabled={isSubmitting}
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end mt-6">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        </div>
      </form>
    </div>
  );
}
