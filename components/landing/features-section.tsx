import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Shield, Zap, Brain, Target, Globe, BarChart3 } from "lucide-react"

const features = [
  {
    icon: Brain,
    title: "Transformer Models",
    description:
      "Advanced RoBERTa and CharBERT models analyze URL semantics and webpage content with state-of-the-art accuracy.",
  },
  {
    icon: Zap,
    title: "Real-time Detection",
    description:
      "Get instant results with our optimized API designed for real-time deployment in cybersecurity systems.",
  },
  {
    icon: Target,
    title: "High Accuracy",
    description:
      "Outperforms traditional ML approaches with superior detection rates for both known and new phishing attacks.",
  },
  {
    icon: Globe,
    title: "Comprehensive Analysis",
    description:
      "Analyzes multiple data points including URL structure, metadata features, and webpage content patterns.",
  },
  {
    icon: Shield,
    title: "Advanced Protection",
    description: "Detects sophisticated phishing attempts that bypass traditional blacklists and rule-based systems.",
  },
  {
    icon: BarChart3,
    title: "Proven Results",
    description:
      "Trained on extensive datasets including PhishTank, ensuring robust performance across diverse attack vectors.",
  },
]

export function FeaturesSection() {
  return (
    <section className="py-24 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-6 text-balance">
            Why Choose <span className="text-primary">PhishFormer</span>?
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto text-balance">
            Our advanced AI system provides unmatched protection against evolving phishing threats
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <Card
              key={index}
              className="border-border/50 bg-card/50 backdrop-blur-sm hover:bg-card/80 transition-all duration-300"
            >
              <CardHeader>
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                  <feature.icon className="w-6 h-6 text-primary" />
                </div>
                <CardTitle className="text-xl">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-muted-foreground leading-relaxed">
                  {feature.description}
                </CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}
