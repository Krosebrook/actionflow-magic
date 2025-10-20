import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CheckCircle2, Zap, Link2, Users, ArrowRight, Mic, GitBranch, Share2, Quote } from "lucide-react";

const Index = () => {
  return (
    <div className="min-h-screen bg-[image:var(--gradient-subtle)]">
      <Navigation />

      {/* Hero Section */}
      <section className="container mx-auto px-6 pt-20 pb-24 md:pt-32 md:pb-40">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6 bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">
            Turn meeting chaos into clear action
          </h1>
          
          <p className="text-xl md:text-2xl text-muted-foreground mb-10 max-w-3xl mx-auto leading-relaxed">
            Automatically capture decisions, assign tasks, and sync updates across your tools — so nothing falls through the cracks.
          </p>
          
          <Button 
            variant="hero" 
            size="lg"
            className="text-lg px-10 mb-20"
          >
            Start free trial
          </Button>

          {/* Value Props */}
          <div className="grid md:grid-cols-3 gap-8 md:gap-12 mt-20">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-xl bg-accent/50 flex items-center justify-center mx-auto shadow-[var(--shadow-sm)]">
                <Zap className="w-6 h-6 text-accent-foreground" />
              </div>
              <p className="text-base font-medium text-foreground">
                Save 5+ hours per week on manual follow-ups
              </p>
            </div>

            <div className="space-y-4">
              <div className="w-12 h-12 rounded-xl bg-accent/50 flex items-center justify-center mx-auto shadow-[var(--shadow-sm)]">
                <CheckCircle2 className="w-6 h-6 text-accent-foreground" />
              </div>
              <p className="text-base font-medium text-foreground">
                Every task assigned, tracked, and visible in real-time
              </p>
            </div>

            <div className="space-y-4">
              <div className="w-12 h-12 rounded-xl bg-accent/50 flex items-center justify-center mx-auto shadow-[var(--shadow-sm)]">
                <Link2 className="w-6 h-6 text-accent-foreground" />
              </div>
              <p className="text-base font-medium text-foreground">
                One source of truth across Slack, Jira, and Asana
              </p>
            </div>
          </div>

          {/* Trust Signal */}
          <div className="mt-20 pt-12 border-t border-border">
            <div className="flex items-center justify-center gap-2 text-muted-foreground">
              <Users className="w-5 h-5" />
              <p className="text-base">
                Trusted by 500+ remote teams at fast-growing SaaS companies
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="container mx-auto px-6 py-24 bg-muted/30">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-4 text-foreground">
              From meeting to done in 3 steps
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Zero manual work. Everything happens automatically.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <Card className="p-8 relative overflow-hidden">
              <div className="absolute top-4 right-4 text-6xl font-bold text-accent/20">01</div>
              <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-6">
                <Mic className="w-7 h-7 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-3 text-foreground">Record & transcribe</h3>
              <p className="text-muted-foreground">
                AI captures every word, decision, and action item from your meeting in real-time with 95%+ accuracy.
              </p>
            </Card>

            <Card className="p-8 relative overflow-hidden">
              <div className="absolute top-4 right-4 text-6xl font-bold text-accent/20">02</div>
              <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-6">
                <GitBranch className="w-7 h-7 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-3 text-foreground">Auto-assign tasks</h3>
              <p className="text-muted-foreground">
                Smart routing assigns tasks to the right person based on context, role, and workload—no manual triaging.
              </p>
            </Card>

            <Card className="p-8 relative overflow-hidden">
              <div className="absolute top-4 right-4 text-6xl font-bold text-accent/20">03</div>
              <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-6">
                <Share2 className="w-7 h-7 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-3 text-foreground">Sync to your tools</h3>
              <p className="text-muted-foreground">
                Updates flow instantly to Slack, Jira, Asana—keeping everyone aligned without switching apps.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="container mx-auto px-6 py-24">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-sm font-semibold text-primary mb-4">TRUSTED BY TEAMS AT</p>
            <div className="flex flex-wrap justify-center items-center gap-12 mb-20 opacity-60">
              <div className="text-2xl font-bold text-foreground">Stripe</div>
              <div className="text-2xl font-bold text-foreground">Notion</div>
              <div className="text-2xl font-bold text-foreground">Figma</div>
              <div className="text-2xl font-bold text-foreground">Linear</div>
              <div className="text-2xl font-bold text-foreground">Vercel</div>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <Card className="p-8">
              <Quote className="w-8 h-8 text-primary/40 mb-4" />
              <p className="text-lg text-foreground mb-6 leading-relaxed">
                "We cut follow-up time by 60% in the first month. No more dropped tasks or endless email threads."
              </p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center text-accent-foreground font-semibold">
                  JD
                </div>
                <div>
                  <div className="font-semibold text-foreground">Jessica Davis</div>
                  <div className="text-sm text-muted-foreground">VP Operations, TechCorp</div>
                </div>
              </div>
            </Card>

            <Card className="p-8">
              <Quote className="w-8 h-8 text-primary/40 mb-4" />
              <p className="text-lg text-foreground mb-6 leading-relaxed">
                "Finally, a single source of truth. Our team stays aligned without constant Slack pings."
              </p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center text-accent-foreground font-semibold">
                  MR
                </div>
                <div>
                  <div className="font-semibold text-foreground">Marcus Rodriguez</div>
                  <div className="text-sm text-muted-foreground">Engineering Lead, DataFlow</div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* Feature Breakdown */}
      <section className="container mx-auto px-6 py-24 bg-muted/30">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-4 text-foreground">
              Built for how you actually work
            </h2>
          </div>

          <div className="space-y-16">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div>
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                  <Mic className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-2xl font-bold mb-4 text-foreground">AI transcription that understands context</h3>
                <p className="text-muted-foreground mb-4 leading-relaxed">
                  Not just speech-to-text. Our AI understands decisions, action items, and who owns what—automatically highlighting what matters.
                </p>
                <ul className="space-y-2">
                  <li className="flex items-center gap-2 text-foreground">
                    <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0" />
                    <span>95%+ accuracy across accents and industries</span>
                  </li>
                  <li className="flex items-center gap-2 text-foreground">
                    <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0" />
                    <span>Auto-detects action items and deadlines</span>
                  </li>
                  <li className="flex items-center gap-2 text-foreground">
                    <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0" />
                    <span>Speaker identification and sentiment analysis</span>
                  </li>
                </ul>
              </div>
              <div className="h-80 bg-gradient-to-br from-primary/20 to-accent/20 rounded-xl flex items-center justify-center">
                <p className="text-muted-foreground">AI Transcription Visual</p>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div className="order-2 md:order-1 h-80 bg-gradient-to-br from-accent/20 to-primary/20 rounded-xl flex items-center justify-center">
                <p className="text-muted-foreground">Smart Routing Visual</p>
              </div>
              <div className="order-1 md:order-2">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                  <GitBranch className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-2xl font-bold mb-4 text-foreground">Smart task routing</h3>
                <p className="text-muted-foreground mb-4 leading-relaxed">
                  Tasks auto-assign to the right person based on expertise, availability, and past work—eliminating bottlenecks.
                </p>
                <ul className="space-y-2">
                  <li className="flex items-center gap-2 text-foreground">
                    <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0" />
                    <span>Context-aware assignment logic</span>
                  </li>
                  <li className="flex items-center gap-2 text-foreground">
                    <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0" />
                    <span>Load balancing across team members</span>
                  </li>
                  <li className="flex items-center gap-2 text-foreground">
                    <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0" />
                    <span>Priority scoring and deadline tracking</span>
                  </li>
                </ul>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div>
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                  <Share2 className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-2xl font-bold mb-4 text-foreground">Native integrations ecosystem</h3>
                <p className="text-muted-foreground mb-4 leading-relaxed">
                  Two-way sync with the tools you already use. Updates flow seamlessly without context switching.
                </p>
                <ul className="space-y-2">
                  <li className="flex items-center gap-2 text-foreground">
                    <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0" />
                    <span>Slack, Jira, Asana, Linear, Notion</span>
                  </li>
                  <li className="flex items-center gap-2 text-foreground">
                    <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0" />
                    <span>Real-time bidirectional sync</span>
                  </li>
                  <li className="flex items-center gap-2 text-foreground">
                    <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0" />
                    <span>Custom webhooks and API access</span>
                  </li>
                </ul>
              </div>
              <div className="h-80 bg-gradient-to-br from-primary/20 to-accent/20 rounded-xl flex items-center justify-center">
                <p className="text-muted-foreground">Integrations Visual</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="container mx-auto px-6 py-24">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-6 text-foreground">
            Ready to turn meetings into momentum?
          </h2>
          <p className="text-xl text-muted-foreground mb-10 leading-relaxed">
            Join 500+ teams saving hours every week.
          </p>
          <Button variant="hero" size="lg" className="text-lg px-10">
            Start free trial
            <ArrowRight className="ml-2 w-5 h-5" />
          </Button>
          <p className="text-sm text-muted-foreground mt-6">
            14-day free trial · No credit card required
          </p>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Index;
