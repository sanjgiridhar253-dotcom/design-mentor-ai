import { motion } from "framer-motion";
import { 
  Sparkles, 
  Users, 
  Target, 
  Brain, 
  Scale, 
  TrendingUp,
  ClipboardCheck 
} from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { FeatureCard } from "@/components/FeatureCard";
import { ProfileComparison } from "@/components/ProfileComparison";

const features = [
  {
    icon: Users,
    title: "Side-by-Side Comparison",
    description: "Compare up to 4 candidates simultaneously with detailed scoring breakdowns."
  },
  {
    icon: Target,
    title: "Role Fit Analysis",
    description: "Evaluate candidates against specific job requirements and responsibilities."
  },
  {
    icon: Brain,
    title: "Skills Assessment",
    description: "AI-powered analysis of technical skills, experience levels, and certifications."
  },
  {
    icon: Scale,
    title: "Objective Scoring",
    description: "Consistent 1-10 ratings across multiple dimensions for fair comparison."
  },
  {
    icon: TrendingUp,
    title: "Growth Potential",
    description: "Identify candidates with high learning ability and career trajectory."
  },
  {
    icon: ClipboardCheck,
    title: "Interview Follow-ups",
    description: "Get prioritized questions and verification points for each candidate."
  }
];

const Index = () => {
  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Background effects */}
      <div className="fixed inset-0 bg-gradient-hero pointer-events-none" />
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-primary/5 rounded-full blur-3xl pointer-events-none" />
      
      <Header />

      <main className="relative pt-32 pb-16">
        {/* Hero Section */}
        <section className="container mx-auto px-6 text-center mb-24">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-5xl mx-auto"
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
                AI-Powered Talent Analysis
              </span>
            </motion.div>

            {/* Headline */}
            <h1 className="font-display text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-6">
              <span className="text-foreground">Smart</span>
              <br />
              <span className="text-gradient">Profile Comparison</span>
            </h1>

            {/* Subheadline */}
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-12">
              Compare candidate profiles side-by-side with AI-powered analysis. 
              Get objective scores, detailed breakdowns, and interview follow-ups.
            </p>

            {/* Profile Comparison */}
            <ProfileComparison />

            {/* Trust indicators */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.6 }}
              className="mt-8 flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground"
            >
              <span className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-accent" />
                Compare up to 4 profiles
              </span>
              <span className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-accent" />
                Objective scoring
              </span>
              <span className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-accent" />
                Interview insights
              </span>
            </motion.div>
          </motion.div>
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
              Comprehensive Candidate Analysis
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Evaluate candidates across all the dimensions that matter for great hires.
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
