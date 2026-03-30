
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { BarChart2, CheckCircle, Clock3, Inbox, MessageSquareText, Sparkles, Star } from 'lucide-react';
import imageData from '@/lib/placeholder-images.json';

const { landing } = imageData;

const features = [
  {
    icon: <Inbox className="h-6 w-6 text-primary" />,
    title: 'Unified Inbox',
    description: 'Manage all your social media conversations from one single inbox. No more switching between accounts.',
    image: landing.feature_unified_inbox,
  },
  {
    icon: <Sparkles className="h-6 w-6 text-primary" />,
    title: 'AI Content Assistant',
    description: 'Generate engaging post ideas, write compelling copy, and discover trending topics with our powerful AI assistant.',
    image: landing.feature_ai_assistant,
  },
  {
    icon: <BarChart2 className="h-6 w-6 text-primary" />,
    title: 'In-Depth Analytics',
    description: 'Track your performance across all platforms with a comprehensive analytics dashboard. Make data-driven decisions.',
    image: landing.feature_analytics,
  },
];

const testimonials = [
    {
        ...landing.testimonials[0],
        quote: "Neup.Socials has revolutionized our social media workflow. The unified inbox saves us hours every week, and the AI assistant is a game-changer for content creation.",
        company: "Innovate Inc."
    },
    {
        ...landing.testimonials[1],
        quote: "As a small business owner, I wear many hats. Neup.Socials makes it incredibly easy to manage my social presence effectively without a dedicated team. The analytics are clear and actionable.",
        company: "QuantumLeap"
    },
    {
        ...landing.testimonials[2],
        quote: "I've tried every social media tool out there, and Neup.Socials is by far the most intuitive and powerful. The scheduling and content approval flows are seamless for our agency.",
        company: "StellarSolutions"
    }
]

export default function LandingPage() {
  return (
    <div className="relative overflow-hidden bg-background text-foreground">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(10,188,197,0.14),transparent_50%),radial-gradient(circle_at_75%_20%,rgba(246,173,85,0.12),transparent_40%)]" />

      <header className="sticky top-0 z-50 w-full border-b border-border/70 bg-background/70 backdrop-blur-xl">
        <div className="container flex h-16 items-center">
          <Link href="/landing" className="flex items-center gap-2 text-lg font-bold tracking-tight">
            <MessageSquareText className="h-6 w-6 text-primary" />
            <span className="font-headline">Neup.Socials</span>
          </Link>
          <nav className="ml-auto flex items-center gap-2 md:gap-4">
            <Button variant="ghost" asChild>
              <Link href="/analytics">Log In</Link>
            </Button>
            <Button asChild>
              <Link href="/analytics">Start Free</Link>
            </Button>
          </nav>
        </div>
      </header>

      <main className="relative">
        <section className="container grid grid-cols-1 items-center gap-10 pb-20 pt-14 md:grid-cols-2 md:gap-16 md:pb-28 md:pt-20">
          <div className="animate-rise space-y-8">
            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-1 text-sm font-semibold text-primary">
              <Sparkles className="h-4 w-4" />
              Built for modern social teams
            </div>

            <div className="space-y-5">
              <h1 className="font-headline text-4xl font-semibold leading-tight tracking-tight md:text-6xl">
                Build, schedule, reply, and optimize in one calm command center.
              </h1>
              <p className="max-w-xl text-base text-muted-foreground md:text-lg">
                Neup.Socials replaces tab chaos with a clean workspace for content, conversations, and growth analytics, designed for creators and teams that move fast.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button size="lg" className="h-12 px-6 text-base" asChild>
                <Link href="/analytics">Start Your 14-Day Trial</Link>
              </Button>
              <Button size="lg" variant="outline" className="h-12 px-6 text-base" asChild>
                <Link href="#features">Explore Features</Link>
              </Button>
            </div>

            <div className="grid grid-cols-3 gap-3 sm:gap-4">
              <div className="rounded-2xl border border-border/70 bg-card/70 p-3 backdrop-blur-md sm:p-4">
                <p className="font-headline text-xl font-semibold">42%</p>
                <p className="text-xs text-muted-foreground sm:text-sm">Faster response time</p>
              </div>
              <div className="rounded-2xl border border-border/70 bg-card/70 p-3 backdrop-blur-md sm:p-4">
                <p className="font-headline text-xl font-semibold">4.9/5</p>
                <p className="text-xs text-muted-foreground sm:text-sm">Average team rating</p>
              </div>
              <div className="rounded-2xl border border-border/70 bg-card/70 p-3 backdrop-blur-md sm:p-4">
                <p className="font-headline text-xl font-semibold">12h</p>
                <p className="text-xs text-muted-foreground sm:text-sm">Saved every week</p>
              </div>
            </div>
          </div>

          <div className="relative animate-rise-delay">
            <div className="absolute -left-5 top-8 hidden rounded-2xl border border-border/70 bg-card/80 p-4 shadow-lg backdrop-blur lg:block">
              <p className="mb-2 text-xs font-semibold text-muted-foreground">Today</p>
              <div className="flex items-center gap-2">
                <Clock3 className="h-4 w-4 text-primary" />
                <p className="text-sm font-medium">9 posts scheduled</p>
              </div>
            </div>

            <Image
              src={landing.hero.src}
              alt="Social media command center preview"
              width={landing.hero.width}
              height={landing.hero.height}
              className="rounded-[28px] border border-border/80 bg-card object-cover shadow-[0_20px_80px_rgba(8,25,55,0.16)]"
              data-ai-hint={landing.hero.hint}
              priority
            />

            <div className="absolute -bottom-6 right-6 hidden rounded-2xl border border-border/70 bg-card/90 p-4 shadow-lg backdrop-blur sm:block">
              <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                <BarChart2 className="h-4 w-4 text-primary" />
                Weekly growth
              </div>
              <p className="font-headline text-2xl font-semibold">+27.4%</p>
              <p className="text-sm text-muted-foreground">Engagement across channels</p>
            </div>
          </div>
        </section>

        <section className="border-y border-border/60 bg-card/35 py-10 md:py-14">
          <div className="container">
            <p className="text-center text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
              Trusted by marketing teams at modern brands
            </p>
            <div className="mt-7 grid grid-cols-2 gap-5 opacity-75 sm:grid-cols-3 md:grid-cols-5">
              {landing.logos.map((logo) => (
                <div key={logo.name} className="flex items-center justify-center rounded-xl border border-border/60 bg-background/80 p-3">
                  <Image
                    src={logo.src}
                    alt={logo.name}
                    width={logo.width}
                    height={logo.height}
                    className="h-10 w-28 object-contain"
                    data-ai-hint={logo.hint}
                  />
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="features" className="container py-20 md:py-28">
          <div className="mb-12 max-w-3xl">
            <h2 className="font-headline text-3xl font-semibold tracking-tight md:text-5xl">
              A sharper workflow from draft to performance.
            </h2>
            <p className="mt-4 text-base text-muted-foreground md:text-lg">
              Every feature is designed to remove friction while giving your team better visibility and better outcomes.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {features.map((feature, index) => (
              <Card
                key={feature.title}
                className="animate-fade-up border-border/70 bg-card/85 shadow-[0_12px_38px_rgba(15,23,42,0.06)]"
                style={{ animationDelay: `${index * 0.08 + 0.05}s` }}
              >
                <CardContent className="space-y-4 p-6">
                  <div className="inline-flex rounded-xl border border-primary/20 bg-primary/10 p-2.5">{feature.icon}</div>
                  <h3 className="font-headline text-xl font-semibold">{feature.title}</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">{feature.description}</p>
                  <div className="rounded-xl border border-border/70 bg-background/70 p-2">
                    <Image
                      src={feature.image.src}
                      alt={feature.title}
                      width={feature.image.width}
                      height={feature.image.height}
                      className="rounded-lg"
                      data-ai-hint={feature.image.hint}
                    />
                  </div>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-primary" />
                      Faster publishing cycles
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-primary" />
                      Fewer context switches
                    </li>
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section className="bg-muted/45 py-20 md:py-28">
          <div className="container">
            <div className="max-w-3xl">
              <h2 className="font-headline text-3xl font-semibold tracking-tight md:text-5xl">Teams that switched to Neup.Socials don’t go back.</h2>
              <p className="mt-4 text-base text-muted-foreground md:text-lg">
                Social managers, agency operators, and founder-led teams use Neup.Socials to keep quality high and execution fast.
              </p>
            </div>

            <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-3">
              {testimonials.map((testimonial, index) => (
                <Card
                  key={testimonial.name}
                  className="animate-fade-up border-border/70 bg-card shadow-[0_12px_38px_rgba(15,23,42,0.06)]"
                  style={{ animationDelay: `${index * 0.1 + 0.12}s` }}
                >
                  <CardContent className="flex h-full flex-col p-6">
                    <div className="mb-3 flex">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />
                      ))}
                    </div>
                    <p className="flex-grow text-sm leading-relaxed text-muted-foreground">"{testimonial.quote}"</p>
                    <div className="mt-6 flex items-center gap-3">
                      <Avatar className="h-11 w-11 border border-border">
                        <AvatarImage src={testimonial.avatar.src} alt={testimonial.name} data-ai-hint={testimonial.avatar.hint} />
                        <AvatarFallback>{testimonial.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-semibold">{testimonial.name}</p>
                        <p className="text-xs text-muted-foreground">{testimonial.company}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section className="container py-20 md:py-28">
          <div className="rounded-[30px] border border-primary/25 bg-[linear-gradient(120deg,hsla(var(--primary),0.92),hsla(197,75%,45%,0.92))] p-8 text-primary-foreground shadow-[0_24px_80px_rgba(0,72,97,0.35)] md:p-14">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] opacity-85">Ready when you are</p>
            <h2 className="mt-3 max-w-3xl font-headline text-3xl font-semibold leading-tight md:text-5xl">
              Modern social media execution starts with one better interface.
            </h2>
            <p className="mt-4 max-w-2xl text-base opacity-95 md:text-lg">
              Launch your workspace today and see how quickly your team can plan, publish, and engage without clutter.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button size="lg" variant="secondary" className="h-12 px-6 text-base" asChild>
                <Link href="/analytics">Start Free Trial</Link>
              </Button>
              <Button size="lg" variant="outline" className="h-12 border-primary-foreground/50 px-6 text-base text-primary-foreground hover:bg-primary-foreground/10" asChild>
                <Link href="#">Book a Demo</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border/60 bg-card/25">
        <div className="container grid grid-cols-1 gap-8 py-12 md:grid-cols-5">
          <div className="space-y-4 md:col-span-2">
            <Link href="/landing" className="flex items-center gap-2 text-lg font-bold">
              <MessageSquareText className="h-6 w-6 text-primary" />
              <span className="font-headline">Neup.Socials</span>
            </Link>
            <p className="max-w-sm text-sm text-muted-foreground">A social command center for teams that care about quality, speed, and measurable growth.</p>
          </div>
          <div>
            <h4 className="font-headline text-sm font-semibold uppercase tracking-wider">Product</h4>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li><Link href="#features" className="hover:text-primary">Features</Link></li>
              <li><Link href="/analytics" className="hover:text-primary">Dashboard</Link></li>
              <li><Link href="#" className="hover:text-primary">Integrations</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-headline text-sm font-semibold uppercase tracking-wider">Company</h4>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li><Link href="#" className="hover:text-primary">About</Link></li>
              <li><Link href="#" className="hover:text-primary">Contact</Link></li>
              <li><Link href="#" className="hover:text-primary">Careers</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-headline text-sm font-semibold uppercase tracking-wider">Legal</h4>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li><Link href="#" className="hover:text-primary">Privacy</Link></li>
              <li><Link href="#" className="hover:text-primary">Terms</Link></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-border/60">
          <div className="container py-4 text-center text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} Neup.Socials, Inc. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
