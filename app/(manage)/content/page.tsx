'use client';

import Link from 'next/link';
import { ArrowUpRight, BookOpen, Sparkles, Users, ShieldCheck, Megaphone, MessageCircle, Newspaper } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const contentTypes = [
  {
    title: 'Educational Content',
    description: 'Teach something practical with clear steps or insights.',
    slug: 'educational',
    icon: BookOpen,
  },
  {
    title: 'Inspirational / Motivational Content',
    description: 'Share wins, lessons, or encouragement to uplift your audience.',
    slug: 'inspirational',
    icon: Sparkles,
  },
  {
    title: 'Behind the Scenes',
    description: 'Show process, people, or the real work that happens off-camera.',
    slug: 'behind-the-scenes',
    icon: Users,
  },
  {
    title: 'Personal Storytelling',
    description: 'Tell a personal story with a clear takeaway or reflection.',
    slug: 'personal-story',
    icon: MessageCircle,
  },
  {
    title: 'Authority / Thought Leadership Content',
    description: 'Offer a strong point of view and establish expertise.',
    slug: 'thought-leadership',
    icon: ShieldCheck,
  },
  {
    title: 'Promotional Offer',
    description: 'Highlight a product, service, or special offer.',
    slug: 'promotional',
    icon: Megaphone,
  },
  {
    title: 'Engagement Offer',
    description: 'Invite replies, questions, or quick interactive prompts.',
    slug: 'engagement',
    icon: MessageCircle,
  },
  {
    title: 'Curated / News Reaction',
    description: 'React to industry news or share curated picks.',
    slug: 'news-reaction',
    icon: Newspaper,
  },
];

export default function ContentTypesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Content</h1>
        <p className="text-muted-foreground">Choose a content type to start a new post.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {contentTypes.map((item) => (
          <Link key={item.slug} href={`/feed/create?type=${encodeURIComponent(item.slug)}`} className="group">
            <Card className="h-full transition-shadow group-hover:shadow-md">
              <CardHeader className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-primary">
                    <item.icon className="h-5 w-5" />
                    <CardTitle className="text-base">{item.title}</CardTitle>
                  </div>
                  <ArrowUpRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                </div>
                <CardDescription>{item.description}</CardDescription>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground">
                Start a {item.title.toLowerCase()} post
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
