
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { CheckCircle, MessageSquareText, BarChart2, Inbox, Sparkles, Calendar, Users, Star } from 'lucide-react';
import imageData from '@/lib/placeholder-images.json';

const { landing } = imageData;

const features = [
  {
    icon: <Inbox className="h-8 w-8 text-primary" />,
    title: 'Unified Inbox',
    description: 'Manage all your social media conversations from one single inbox. No more switching between accounts.',
    image: landing.feature_unified_inbox,
  },
  {
    icon: <Sparkles className="h-8 w-8 text-primary" />,
    title: 'AI Content Assistant',
    description: 'Generate engaging post ideas, write compelling copy, and discover trending topics with our powerful AI assistant.',
    image: landing.feature_ai_assistant,
  },
  {
    icon: <BarChart2 className="h-8 w-8 text-primary" />,
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
    <div className="bg-background text-foreground">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center">
          <Link href="#" className="flex items-center gap-2 font-bold">
            <MessageSquareText className="h-6 w-6 text-primary" />
            <span>Neup.Socials</span>
          </Link>
          <nav className="ml-auto flex items-center gap-4">
            <Button variant="ghost" asChild>
              <Link href="/analytics">Log In</Link>
            </Button>
            <Button asChild>
              <Link href="/analytics">Get Started Free</Link>
            </Button>
          </nav>
        </div>
      </header>

      <main>
        {/* Hero Section */}
        <section className="py-20 md:py-32">
          <div className="container grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div className="space-y-6 text-center md:text-left">
              <h1 className="text-4xl md:text-6xl font-bold tracking-tighter">
                Your Entire Social Media Workflow, <span className="text-primary">Simplified.</span>
              </h1>
              <p className="max-w-xl mx-auto md:mx-0 text-lg text-muted-foreground">
                Stop juggling tabs. Neup.Socials brings your content creation, scheduling, analytics, and conversations into one powerful, elegant platform.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center md:justify-start">
                <Button size="lg" asChild>
                  <Link href="/analytics">Start Your 14-Day Free Trial</Link>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <Link href="#">Request a Demo</Link>
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">No credit card required. Cancel anytime.</p>
            </div>
            <div>
              <Image
                src={landing.hero.src}
                alt="Social Media Dashboard"
                width={landing.hero.width}
                height={landing.hero.height}
                className="rounded-lg shadow-2xl"
                data-ai-hint={landing.hero.hint}
              />
            </div>
          </div>
        </section>

        {/* Social Proof */}
        <section className="py-12 bg-muted">
            <div className="container">
                <p className="text-center text-muted-foreground font-semibold">TRUSTED BY MARKETING TEAMS AT WORLD-CLASS COMPANIES</p>
                <div className="mt-8 flex flex-wrap justify-center items-center gap-x-8 md:gap-x-12 lg:gap-x-16 opacity-70">
                    {landing.logos.map(logo => (
                        <Image
                            key={logo.name}
                            src={logo.src}
                            alt={logo.name}
                            width={logo.width}
                            height={logo.height}
                            className="w-32 h-12 object-contain"
                            data-ai-hint={logo.hint}
                        />
                    ))}
                </div>
            </div>
        </section>

        {/* Features Section */}
        <section id="features" className="py-20 md:py-32">
          <div className="container space-y-16">
            <div className="text-center max-w-3xl mx-auto">
              <h2 className="text-3xl md:text-4xl font-bold">Everything You Need, Nothing You Don't</h2>
              <p className="mt-4 text-lg text-muted-foreground">
                Neup.Socials is packed with features designed to make your social media management smarter, faster, and more effective.
              </p>
            </div>
            {features.map((feature, index) => (
              <div
                key={feature.title}
                className={`grid grid-cols-1 md:grid-cols-2 gap-12 items-center ${index % 2 !== 0 ? 'md:[&>*:last-child]:-order-1' : ''}`}
              >
                <div className="space-y-4">
                  <div className="inline-block bg-primary/10 p-3 rounded-lg">{feature.icon}</div>
                  <h3 className="text-2xl font-bold">{feature.title}</h3>
                  <p className="text-muted-foreground">{feature.description}</p>
                   <ul className="space-y-2 text-muted-foreground">
                    <li className="flex items-center gap-2"><CheckCircle className="h-5 w-5 text-green-500" /> Save time and reduce errors</li>
                    <li className="flex items-center gap-2"><CheckCircle className="h-5 w-5 text-green-500" /> Never miss an important message</li>
                     <li className="flex items-center gap-2"><CheckCircle className="h-5 w-5 text-green-500" /> Collaborate with your team</li>
                  </ul>
                  <Button variant="link" className="p-0" asChild>
                    <Link href="#">Learn more &rarr;</Link>
                  </Button>
                </div>
                <div>
                   <Image
                    src={feature.image.src}
                    alt={feature.title}
                    width={feature.image.width}
                    height={feature.image.height}
                    className="rounded-lg shadow-xl"
                    data-ai-hint={feature.image.hint}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>
        
        {/* Testimonials */}
        <section id="testimonials" className="py-20 md:py-32 bg-muted">
            <div className="container">
                <div className="text-center max-w-3xl mx-auto">
                    <h2 className="text-3xl md:text-4xl font-bold">Why Marketers Love Neup.Socials</h2>
                    <p className="mt-4 text-lg text-muted-foreground">
                        Don't just take our word for it. Here's what our customers have to say.
                    </p>
                </div>
                <div className="mt-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {testimonials.map(testimonial => (
                        <Card key={testimonial.name} className="flex flex-col">
                            <CardContent className="p-6 flex-grow flex flex-col">
                               <div className="flex mb-2">
                                    {[...Array(5)].map((_, i) => <Star key={i} className="h-5 w-5 text-yellow-400 fill-current" />)}
                               </div>
                                <p className="text-muted-foreground flex-grow">"{testimonial.quote}"</p>
                                <div className="flex items-center gap-4 mt-6">
                                    <Avatar>
                                        <AvatarImage src={testimonial.avatar.src} alt={testimonial.name} data-ai-hint={testimonial.avatar.hint} />
                                        <AvatarFallback>{testimonial.name.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <p className="font-semibold">{testimonial.name}</p>
                                        <p className="text-sm text-muted-foreground">{testimonial.company}</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 md:py-32">
          <div className="container">
             <div className="bg-primary text-primary-foreground rounded-lg p-10 md:p-16 text-center">
                 <h2 className="text-3xl md:text-5xl font-bold">Ready to Supercharge Your Social Media?</h2>
                 <p className="mt-4 max-w-2xl mx-auto text-lg opacity-90">
                    Join thousands of happy marketers and businesses. Start your free trial today and see the difference.
                 </p>
                 <Button size="lg" variant="secondary" className="mt-8" asChild>
                    <Link href="/analytics">Get Started with Your Free 14-Day Trial</Link>
                 </Button>
             </div>
          </div>
        </section>
      </main>

      <footer className="border-t">
        <div className="container py-12 grid grid-cols-2 md:grid-cols-5 gap-8">
           <div className="col-span-full md:col-span-2 space-y-4">
             <Link href="#" className="flex items-center gap-2 font-bold text-lg">
                <MessageSquareText className="h-6 w-6 text-primary" />
                <span>Neup.Socials</span>
             </Link>
             <p className="text-muted-foreground">The all-in-one social media management platform.</p>
           </div>
           <div className="space-y-2">
                <h4 className="font-semibold">Product</h4>
                <ul className="space-y-1">
                    <li><Link href="#" className="text-muted-foreground hover:text-primary">Features</Link></li>
                    <li><Link href="#" className="text-muted-foreground hover:text-primary">Pricing</Link></li>
                    <li><Link href="#" className="text-muted-foreground hover:text-primary">Integrations</Link></li>
                    <li><Link href="#" className="text-muted-foreground hover:text-primary">Updates</Link></li>
                </ul>
           </div>
            <div className="space-y-2">
                <h4 className="font-semibold">Company</h4>
                <ul className="space-y-1">
                    <li><Link href="#" className="text-muted-foreground hover:text-primary">About Us</Link></li>
                    <li><Link href="#" className="text-muted-foreground hover:text-primary">Careers</Link></li>
                    <li><Link href="#" className="text-muted-foreground hover:text-primary">Contact</Link></li>
                    <li><Link href="#" className="text-muted-foreground hover:text-primary">Blog</Link></li>
                </ul>
           </div>
           <div className="space-y-2">
                <h4 className="font-semibold">Legal</h4>
                <ul className="space-y-1">
                    <li><Link href="#" className="text-muted-foreground hover:text-primary">Privacy Policy</Link></li>
                    <li><Link href="#" className="text-muted-foreground hover:text-primary">Terms of Service</Link></li>
                </ul>
           </div>
        </div>
        <div className="border-t">
            <div className="container py-4 text-center text-sm text-muted-foreground">
                &copy; {new Date().getFullYear()} Neup.Socials, Inc. All rights reserved.
            </div>
        </div>
      </footer>
    </div>
  );
}
