import { Card, CardContent } from "@/components/ui/card"

const stats = [
  {
    value: "99.7%",
    label: "Detection Accuracy",
    description: "Industry-leading precision",
  },
  {
    value: "<100ms",
    label: "Response Time",
    description: "Real-time analysis",
  },
  {
    value: "1M+",
    label: "URLs Analyzed",
    description: "Extensive training data",
  },
  {
    value: "24/7",
    label: "Protection",
    description: "Always-on security",
  },
]

export function StatsSection() {
  return (
    <section className="py-24 px-4 bg-gradient-to-r from-primary/5 to-accent/5">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-6 text-balance">
            Proven <span className="text-primary">Performance</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto text-balance">
            Our numbers speak for themselves - delivering enterprise-grade security
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {stats.map((stat, index) => (
            <Card key={index} className="text-center border-border/50 bg-card/50 backdrop-blur-sm">
              <CardContent className="pt-8 pb-6">
                <div className="text-4xl md:text-5xl font-bold text-primary mb-2">{stat.value}</div>
                <div className="text-lg font-semibold text-foreground mb-1">{stat.label}</div>
                <div className="text-sm text-muted-foreground">{stat.description}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}
