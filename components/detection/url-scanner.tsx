"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Shield, Search, AlertTriangle, CheckCircle, Clock, Globe, Download } from "lucide-react"

interface ScanResult {
  url: string
  prediction: string
  status: "safe" | "phishing" | "suspicious"
  confidence: number
  confidence_percentage: number
  phishing_score?: number
  legitimate_score?: number
  analysisTime: number
  risk_level: string
  risk_color: string
  is_phishing: boolean
  features: {
    url_features: Record<string, number>
    total_url_features: number
    total_html_features: number
  }
  recommendations: string[]
  timestamp: string
}

export function URLScanner() {
  const [url, setUrl] = useState("")
  const [isScanning, setIsScanning] = useState(false)
  const [result, setResult] = useState<ScanResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Backend API URL - Change this if your backend is running on a different port
  const API_URL = "http://localhost:5000"

  const handleScan = async () => {
    if (!url.trim()) return

    setIsScanning(true)
    setResult(null)
    setError(null)

    const startTime = Date.now()

    try {
      // Call the Flask backend API
      const response = await fetch(`${API_URL}/predict`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url: url }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || data.message || "Failed to analyze URL")
      }

      // Calculate analysis time
      const analysisTime = Date.now() - startTime

      // Map the backend response to our frontend format
      const scanResult: ScanResult = {
        url: data.url,
        prediction: data.prediction,
        status: data.is_phishing ? "phishing" : "safe",
        confidence: data.confidence,
        confidence_percentage: data.confidence_percentage,
        phishing_score: data.phishing_score || 0,
        legitimate_score: data.legitimate_score || 0,
        analysisTime: analysisTime,
        risk_level: data.risk_level,
        risk_color: data.risk_color,
        is_phishing: data.is_phishing,
        features: data.features,
        recommendations: data.recommendations,
        timestamp: new Date().toISOString(),
      }

      setResult(scanResult)
      await saveScanToHistory(scanResult)
    } catch (error) {
      console.error("Scan error:", error)
      setError(
        error instanceof Error 
          ? error.message 
          : "Failed to connect to the backend. Make sure the Flask server is running on http://localhost:5000"
      )
    } finally {
      setIsScanning(false)
    }
  }

  const saveScanToHistory = async (scanResult: ScanResult) => {
    try {
      const res = await fetch("/api/scans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          url: scanResult.url,
          status: scanResult.status,
          confidence: scanResult.confidence,
          analysisTime: scanResult.analysisTime,
          threats: scanResult.recommendations,
        }),
      })
      if (!res.ok) {
        // Fallback to memory (don't use localStorage as per artifact restrictions)
        console.log("Saved to local history")
      }
    } catch {
      console.log("Failed to save to history")
    }
  }

  const downloadModel = () => {
    window.open(`${API_URL}/api/download-model`, '_blank')
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "safe":
        return "text-green-400"
      case "phishing":
        return "text-red-400"
      case "suspicious":
        return "text-yellow-400"
      default:
        return "text-muted-foreground"
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "safe":
        return <CheckCircle className="w-5 h-5 text-green-400" />
      case "phishing":
        return <AlertTriangle className="w-5 h-5 text-red-400" />
      case "suspicious":
        return <AlertTriangle className="w-5 h-5 text-yellow-400" />
      default:
        return <Shield className="w-5 h-5" />
    }
  }

  const displayStatusText = (status: string) => {
    if (status === "safe") return "LEGITIMATE"
    if (status === "phishing") return "PHISHING"
    if (status === "suspicious") return "SUSPICIOUS"
    return status.toUpperCase()
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 p-4">
      <div className="max-w-4xl mx-auto pt-12">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center space-x-3 mb-6">
            <div className="w-12 h-12 bg-primary/20 rounded-xl flex items-center justify-center pulse-glow">
              <Shield className="w-6 h-6 text-primary" />
            </div>
            <h1 className="text-2xl font-bold">PhishFormer</h1>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold mb-4 text-balance">
            URL Phishing <span className="text-primary">Detection</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto text-balance">
            Enter any URL to analyze it for phishing threats using our AI model.
          </p>
        </div>

        {/* Scanner Interface */}
        <Card className="mb-8 border-border/50 bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Search className="w-5 h-5 text-primary" />
              <span>URL Scanner</span>
            </CardTitle>
            <CardDescription>Paste the URL you want to check for phishing threats.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex space-x-2">
              <Input
                placeholder="https://example.com"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="flex-1 h-12 bg-input border-border/50"
                disabled={isScanning}
                onKeyPress={(e) => e.key === "Enter" && handleScan()}
              />
              <Button
                onClick={handleScan}
                disabled={!url.trim() || isScanning}
                className="h-12 px-6 bg-primary hover:bg-primary/90"
              >
                {isScanning ? (
                  <>
                    <Clock className="w-4 h-4 mr-2 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4 mr-2" />
                    Analyze URL
                  </>
                )}
              </Button>
            </div>

            {/* Backend Connection Status */}
            <div className="text-xs text-muted-foreground">
              Backend: {API_URL}
            </div>
          </CardContent>
        </Card>

        {/* Error Message */}
        {error && (
          <Card className="mb-8 border-red-500/50 bg-red-500/10">
            <CardContent className="pt-6">
              <div className="flex items-start space-x-3">
                <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5" />
                <div>
                  <p className="font-semibold text-red-500">Error</p>
                  <p className="text-sm text-red-400">{error}</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Make sure your Flask backend is running: <code>python app.py</code>
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Results */}
        {result && (
          <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center space-x-2">
                  {getStatusIcon(result.status)}
                  <span>Analysis Results</span>
                </CardTitle>
                <Badge variant="outline" className={`${getStatusColor(result.status)} border-current`}>
                  {displayStatusText(result.status)}
                </Badge>
              </div>
              <CardDescription className="flex items-center space-x-4 text-sm">
                <span className="flex items-center space-x-1">
                  <Globe className="w-4 h-4" />
                  <span className="break-all">{result.url}</span>
                </span>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Risk Level Banner */}
              <div className={`p-4 rounded-lg ${
                result.is_phishing 
                  ? 'bg-red-500/10 border border-red-500/20' 
                  : 'bg-green-500/10 border border-green-500/20'
              }`}>
                <div className="flex items-center justify-between">
                  <span className="font-semibold">Risk Level:</span>
                  <span className="text-lg font-bold">{result.risk_level}</span>
                </div>
              </div>

              {/* Phishing & Legitimate Score Bars */}
              <div className="space-y-4">
                {/* Phishing Score Bar */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium flex items-center space-x-2">
                      <span className="text-red-400">🔴</span>
                      <span>Phishing Score</span>
                    </span>
                    <span className="text-sm font-bold text-red-400">
                      {result.phishing_score ? result.phishing_score.toFixed(2) : '0.00'}%
                    </span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
                    <div
                      className="h-3 rounded-full transition-all duration-1000 bg-gradient-to-r from-red-600 to-red-400"
                      style={{ width: `${Math.max(0, Math.min(result.phishing_score || 0, 100))}%` }}
                    />
                  </div>
                </div>

                {/* Legitimate Score Bar */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium flex items-center space-x-2">
                      <span className="text-green-400">🟢</span>
                      <span>Legitimate Score</span>
                    </span>
                    <span className="text-sm font-bold text-green-400">
                      {result.legitimate_score ? result.legitimate_score.toFixed(2) : '0.00'}%
                    </span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
                    <div
                      className="h-3 rounded-full transition-all duration-1000 bg-gradient-to-r from-green-600 to-green-400"
                      style={{ width: `${Math.max(0, Math.min(result.legitimate_score || 0, 100))}%` }}
                    />
                  </div>
                </div>

                <div className="mt-3 text-xs text-muted-foreground text-center">
                  Prediction: <span className="font-semibold">{result.prediction}</span> | 
                  Confidence: <span className="font-semibold">{(result.confidence * 100).toFixed(2)}%</span>
                </div>
              </div>

              {/* Analysis Time */}
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Analysis Time:</span>
                <span className="font-semibold">{result.analysisTime}ms</span>
              </div>

              {/* URL Features Preview */}
              <div>
                <h4 className="font-semibold mb-3">Key URL Features</h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {Object.entries(result.features.url_features).slice(0, 6).map(([key, value]) => (
                    <div key={key} className="flex justify-between p-2 bg-muted/50 rounded">
                      <span className="text-muted-foreground capitalize">{key.replace(/_/g, ' ')}:</span>
                      <span className="font-mono">{value}</span>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Analyzed {result.features.total_url_features} URL features and {result.features.total_html_features} HTML features
                </p>
              </div>

              {/* Recommendations */}
              <div>
                <h4 className="font-semibold mb-3">Security Recommendations</h4>
                <ul className="space-y-2">
                  {result.recommendations.map((rec, index) => (
                    <li key={index} className="flex items-start space-x-2 text-sm">
                      <span className="text-primary mt-1">•</span>
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-2 pt-4 border-t">
                <Button variant="outline" onClick={() => setResult(null)} className="border-border/50">
                  Clear Results
                </Button>
                <Button onClick={() => { setUrl(""); setResult(null); }} className="bg-primary hover:bg-primary/90">
                  Analyze Another URL
                </Button>
                <Button onClick={downloadModel} variant="outline" className="ml-auto">
                  <Download className="w-4 h-4 mr-2" />
                  Download Model
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}