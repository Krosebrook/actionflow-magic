import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Check } from "lucide-react";

const Pricing = () => {
  const plans = [
    {
      name: "Free Trial",
      price: "$0",
      description: "Perfect for trying out MeetSync",
      features: [
        "Up to 10 meetings/month",
        "Basic transcription",
        "Task assignment",
        "Email notifications",
        "7-day history"
      ],
      cta: "Start free trial",
      highlighted: false
    },
    {
      name: "Team",
      price: "$29",
      description: "For growing remote teams",
      features: [
        "Unlimited meetings",
        "AI transcription & summaries",
        "Advanced task routing",
        "Slack, Jira, Asana sync",
        "Unlimited history",
        "Priority support",
        "Custom integrations"
      ],
      cta: "Start free trial",
      highlighted: true
    },
    {
      name: "Enterprise",
      price: "Custom",
      description: "For organizations at scale",
      features: [
        "Everything in Team",
        "SSO & advanced security",
        "Custom AI models",
        "Dedicated success manager",
        "SLA guarantees",
        "On-premise deployment",
        "Volume discounts"
      ],
      cta: "Contact sales",
      highlighted: false
    }
  ];

  return (
    <div className="min-h-screen bg-[image:var(--gradient-subtle)]">
      <Navigation />
      
      <main className="container mx-auto px-6 py-20">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h1 className="text-5xl font-bold tracking-tight mb-4 text-foreground">
              Simple, transparent pricing
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Start free, scale as you grow. No hidden fees.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {plans.map((plan) => (
              <Card 
                key={plan.name}
                className={plan.highlighted ? "border-primary shadow-[var(--shadow-md)] relative" : ""}
              >
                {plan.highlighted && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <span className="bg-primary text-primary-foreground text-xs font-semibold px-3 py-1 rounded-full">
                      Most Popular
                    </span>
                  </div>
                )}
                
                <CardHeader>
                  <CardTitle className="text-2xl">{plan.name}</CardTitle>
                  <CardDescription>{plan.description}</CardDescription>
                  <div className="mt-4">
                    <span className="text-4xl font-bold text-foreground">{plan.price}</span>
                    {plan.price !== "Custom" && (
                      <span className="text-muted-foreground">/month per user</span>
                    )}
                  </div>
                </CardHeader>

                <CardContent>
                  <ul className="space-y-3">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-3">
                        <Check className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                        <span className="text-sm text-foreground">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>

                <CardFooter>
                  <Button 
                    variant={plan.highlighted ? "hero" : "outline"} 
                    className="w-full"
                  >
                    {plan.cta}
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>

          <div className="mt-16 text-center">
            <p className="text-muted-foreground">
              All plans include 14-day free trial. No credit card required.
            </p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Pricing;
