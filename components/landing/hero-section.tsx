"use client"

import { Button } from "@/components/ui/button"
import { Shield, Zap, Brain, Lock } from "lucide-react"

export function HeroSection() {
  const handleDetectClick = () => {
    window.location.href = "/dashboard"
  }

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-background via-primary/5 to-primary/10" />

      {/* Animated background elements */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-primary/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent/20 rounded-full blur-3xl animate-pulse delay-1000" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-4 text-center">
        <div className="space-y-8">
          {/* Logo/Brand */}
          <div className="flex items-center justify-center space-x-3 mb-8">
            <div className="w-12 h-12 bg-primary/20 rounded-xl flex items-center justify-center pulse-glow">
              <Shield className="w-6 h-6 text-primary" />
            </div>
            <h1 className="text-3xl font-bold text-foreground">PhishFormer</h1>
          </div>

          {/* Main headline */}
          <div className="space-y-4">
            <h2 className="text-5xl md:text-7xl font-bold text-balance leading-tight">
              Advanced <span className="text-primary">AI-Powered</span>
              <br />
              Phishing Detection
            </h2>
            <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto text-balance">
              Protect yourself from cybercrime with our cutting-edge transformer models. PhishFormer uses RoBERTa and
              CharBERT to detect phishing websites with unprecedented accuracy.
            </p>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-8">
            <Button
              size="lg"
              className="h-14 px-8 text-lg font-semibold bg-primary hover:bg-primary/90 pulse-glow"
              onClick={handleDetectClick}
            >
              <Zap className="w-5 h-5 mr-2" />
              Detect Phishing Now
            </Button>
          </div>

          {/* Trust indicators */}
          <div className="pt-12">
            <p className="text-sm text-muted-foreground mb-6">TRUSTED BY CYBERSECURITY PROFESSIONALS</p>
            <div className="flex flex-wrap justify-center items-center gap-8 opacity-60">
              <div className="flex items-center space-x-2">
                <Brain className="w-5 h-5" />
                <span className="text-sm font-medium">RoBERTa Model</span>
              </div>
              <div className="flex items-center space-x-2">
                <Lock className="w-5 h-5" />
                <span className="text-sm font-medium">CharBERT Analysis</span>
              </div>
              <div className="flex items-center space-x-2">
                <Shield className="w-5 h-5" />
                <span className="text-sm font-medium">Real-time Detection</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
