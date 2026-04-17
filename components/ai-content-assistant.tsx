'use client';

import * as React from 'react';
import { Controller, useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Sparkles, Clipboard, Copy, Loader2 } from 'lucide-react';
import { generatePostVariationsAction } from '@/services/ai/generatePostVariations';
import { useToast } from '../hooks/use-toast';

const formSchema = z.object({
  initialPostIdea: z.string().min(10, 'Please enter a post idea of at least 10 characters.'),
  platform: z.enum(['Facebook', 'Twitter', 'LinkedIn', 'Instagram']),
  tone: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export function AIContentAssistant() {
  const [variations, setVariations] = React.useState<string[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const { toast } = useToast();

  const { register, handleSubmit, formState: { errors }, control, setValue, watch } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      platform: 'Twitter',
    },
  });

  const platform = watch('platform');

  React.useEffect(() => {
    setValue('platform', platform);
  }, [platform, setValue]);

  const onSubmit: SubmitHandler<FormValues> = async (data) => {
    setIsLoading(true);
    setVariations([]);
    const result = await generatePostVariationsAction({ ...data, numVariations: 3 });
    setIsLoading(false);

    if (result.success && result.data) {
      setVariations(result.data.variations);
    } else {
      toast({
        title: 'Error',
        description: result.error || 'Failed to generate content.',
        variant: 'destructive',
      });
    }
  };
  
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: 'Copied to clipboard!',
    });
  };

  return (
    <div className="space-y-4">
      <CardHeader className="p-0">
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="text-primary" />
          AI Content Assistant
        </CardTitle>
        <CardDescription>
          Generate engaging post variations based on your initial idea.
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="initial-post-idea">Post Idea</Label>
          <Textarea id="initial-post-idea" {...register('initialPostIdea')} placeholder="e.g., Announcing our new productivity feature that helps teams collaborate better." />
          {errors.initialPostIdea && <p className="text-sm text-destructive">{errors.initialPostIdea.message}</p>}
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="ai-platform">Platform</Label>
            <Controller
                name="platform"
                control={control}
                render={({ field }) => (
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <SelectTrigger id="ai-platform">
                            <SelectValue placeholder="Select platform" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="Twitter">Twitter</SelectItem>
                            <SelectItem value="Facebook">Facebook</SelectItem>
                            <SelectItem value="LinkedIn">LinkedIn</SelectItem>
                            <SelectItem value="Instagram">Instagram</SelectItem>
                        </SelectContent>
                    </Select>
                )}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tone">Tone (Optional)</Label>
            <input {...register('tone')} id="tone" placeholder="e.g., Professional, witty" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
          </div>
        </div>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generating...
            </>
          ) : (
            'Generate Variations'
          )}
        </Button>
      </form>
      {variations.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Generated Variations</h3>
          <div className="space-y-4">
            {variations.map((variation, index) => (
              <Card key={index} className="bg-muted/50">
                <CardContent className="p-4 flex items-start gap-4">
                  <p className="text-sm flex-1">{variation}</p>
                  <Button variant="ghost" size="icon" onClick={() => copyToClipboard(variation)}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
