import { Button } from "@/components/ui/button";
import { CheckCircle2, Zap, Link2, Users } from "lucide-react";

const Index = () => {
  return (
    <div className="min-h-screen bg-[image:var(--gradient-subtle)]">
      {/* Hero Section */}
      <main className="container mx-auto px-6 pt-20 pb-24 md:pt-32 md:pb-40">
        <div className="max-w-4xl mx-auto text-center">
          {/* Hero Headline */}
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6 bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">
            Turn meeting chaos into clear action
          </h1>
          
          {/* Subheadline */}
          <p className="text-xl md:text-2xl text-muted-foreground mb-10 max-w-3xl mx-auto leading-relaxed">
            Automatically capture decisions, assign tasks, and sync updates across your tools — so nothing falls through the cracks.
          </p>
          
          {/* CTA */}
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
      </main>
    </div>
  );
};

export default Index;
