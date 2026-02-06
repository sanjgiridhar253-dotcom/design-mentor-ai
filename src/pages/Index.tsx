import { motion } from "framer-motion";
import { 
  Sparkles, 
  Layout, 
  Palette, 
  Type, 
  Layers, 
  Zap,
  ArrowRight 
} from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { UploadZone } from "@/components/UploadZone";
import { FeatureCard } from "@/components/FeatureCard";
import { FeedbackResults } from "@/components/FeedbackResults";
import { Button } from "@/components/ui/button";
import { useDesignAnalysis } from "@/hooks/useDesignAnalysis";

const features = [
  {
    icon: Layout,
    title: "Layout Analysis",
    description: "Get insights on spacing, alignment, and visual hierarchy to create balanced compositions."
  },
  {
    icon: Palette,
    title: "Color Harmony",
    description: "Receive feedback on your color palette, contrast ratios, and accessibility compliance."
  },
  {
    icon: Type,
    title: "Typography Review",
    description: "Optimize font pairings, sizes, and readability for better user experience."
  },
  {
    icon: Layers,
    title: "Component Structure",
    description: "Learn how to improve consistency and reusability across your UI components."
  },
  {
    icon: Zap,
    title: "Quick Wins",
    description: "Get actionable, prioritized suggestions you can implement right away."
  },
  {
    icon: Sparkles,
    title: "Mentor Tone",
    description: "Feedback that's encouraging and educational, not harsh or robotic."
  }
];

const Index = () => {
  const { isAnalyzing, feedback, analyzeDesign, resetAnalysis } = useDesignAnalysis();

  const handleFileSelect = (file: File) => {
    analyzeDesign(file);
  };

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Background effects */}
      <div className="fixed inset-0 bg-gradient-hero pointer-events-none" />
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-primary/5 rounded-full blur-3xl pointer-events-none" />
      
      <Header />

      <main className="relative pt-32 pb-16">
        {/* Hero Section */}
        <section className="container mx-auto px-6 text-center mb-24">
          {feedback ? (
            <FeedbackResults feedback={feedback} onReset={resetAnalysis} />
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="max-w-4xl mx-auto"
            >
              {/* Badge */}
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass mb-8"
              >
                <Sparkles className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium text-foreground/80">
                  AI-Powered Design Feedback
                </span>
              </motion.div>

              {/* Headline */}
              <h1 className="font-display text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-6">
                <span className="text-foreground">Your Personal</span>
                <br />
                <span className="text-gradient">Design Mentor</span>
              </h1>

              {/* Subheadline */}
              <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-12">
                Upload your UI screenshots and receive thoughtful, structured feedback 
                from an AI that actually helps you grow as a designer.
              </p>

              {/* Upload Zone */}
              <UploadZone onFileSelect={handleFileSelect} isAnalyzing={isAnalyzing} />

              {/* Trust indicators */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.6 }}
                className="mt-8 flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground"
              >
                <span className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-accent" />
                  Free to try
                </span>
                <span className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-accent" />
                  No signup required
                </span>
                <span className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-accent" />
                  Instant feedback
                </span>
              </motion.div>
            </motion.div>
          )}
        </section>

        {/* Features Section */}
        <section id="features" className="container mx-auto px-6 mb-24">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-16"
          >
            <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">
              Comprehensive Design Analysis
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Get feedback across all the dimensions that matter for great UI design.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <FeatureCard
                key={feature.title}
                icon={feature.icon}
                title={feature.title}
                description={feature.description}
                delay={index * 0.1}
              />
            ))}
          </div>
        </section>

      </main>

      <Footer />
    </div>
  );
};

export default Index;
