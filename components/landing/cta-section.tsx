"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Shield, ArrowRight } from "lucide-react"

export function CTASection() {
  return (
    <section className="py-24 px-4">
      <div className="max-w-4xl mx-auto">
        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-accent/5 backdrop-blur-sm">
          <CardContent className="p-12 text-center">
            <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-8 pulse-glow">
              <Shield className="w-8 h-8 text-primary" />
            </div>

            <h2 className="text-4xl md:text-5xl font-bold mb-6 text-balance">Ready to Secure Your Digital World?</h2>

            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto text-balance">
              Join thousands of users who trust PhishFormer to protect them from sophisticated phishing attacks. Start
              detecting threats in seconds.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                size="lg"
                className="h-14 px-8 text-lg font-semibold bg-primary hover:bg-primary/90 pulse-glow"
                onClick={() => (window.location.href = "/detect")}
              >
                Start Detection
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="h-14 px-8 text-lg font-semibold border-primary/50 hover:bg-primary/10 bg-transparent"
                onClick={() => (window.location.href = "/signup")}
              >
                Create Account
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  )
}
