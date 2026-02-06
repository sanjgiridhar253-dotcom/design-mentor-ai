import { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Sparkles, User, Briefcase, Mail, Lock, UserCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

type AuthMode = "signin" | "signup";
type AppRole = "designer" | "recruiter";

const Auth = () => {
  const [mode, setMode] = useState<AuthMode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [selectedRole, setSelectedRole] = useState<AppRole | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (mode === "signin") {
        const { error } = await signIn(email, password);
        if (error) throw error;
        toast.success("Welcome back!");
        navigate("/dashboard");
      } else {
        if (!selectedRole) {
          toast.error("Please select a role");
          return;
        }
        const { error } = await signUp(email, password, selectedRole, fullName);
        if (error) throw error;
        toast.success("Account created! Please check your email to verify.");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Authentication failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background relative overflow-hidden flex items-center justify-center">
      {/* Background effects */}
      <div className="fixed inset-0 bg-gradient-hero pointer-events-none" />
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-primary/5 rounded-full blur-3xl pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-md mx-4"
      >
        <div className="glass rounded-2xl p-8">
          {/* Logo */}
          <div className="flex items-center justify-center gap-2 mb-8">
            <div className="p-1.5 rounded-lg bg-gradient-primary">
              <Sparkles className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-display font-semibold text-xl text-foreground">
              DesignCritique
            </span>
          </div>

          {/* Title */}
          <h1 className="font-display text-2xl font-bold text-center text-foreground mb-2">
            {mode === "signin" ? "Welcome Back" : "Create Account"}
          </h1>
          <p className="text-muted-foreground text-center mb-8">
            {mode === "signin" 
              ? "Sign in to continue to your dashboard" 
              : "Join as a designer or recruiter"}
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            {mode === "signup" && (
              <>
                {/* Role Selection */}
                <div className="space-y-3">
                  <Label className="text-foreground">I am a...</Label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setSelectedRole("designer")}
                      className={`p-4 rounded-xl border-2 transition-all ${
                        selectedRole === "designer"
                          ? "border-primary bg-primary/10"
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      <User className={`w-8 h-8 mx-auto mb-2 ${
                        selectedRole === "designer" ? "text-primary" : "text-muted-foreground"
                      }`} />
                      <div className={`font-medium ${
                        selectedRole === "designer" ? "text-foreground" : "text-muted-foreground"
                      }`}>
                        Designer
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Upload & get feedback
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSelectedRole("recruiter")}
                      className={`p-4 rounded-xl border-2 transition-all ${
                        selectedRole === "recruiter"
                          ? "border-primary bg-primary/10"
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      <Briefcase className={`w-8 h-8 mx-auto mb-2 ${
                        selectedRole === "recruiter" ? "text-primary" : "text-muted-foreground"
                      }`} />
                      <div className={`font-medium ${
                        selectedRole === "recruiter" ? "text-foreground" : "text-muted-foreground"
                      }`}>
                        Recruiter
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Review designers
                      </div>
                    </button>
                  </div>
                </div>

                {/* Full Name */}
                <div className="space-y-2">
                  <Label htmlFor="fullName" className="text-foreground">Full Name</Label>
                  <div className="relative">
                    <UserCircle className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      id="fullName"
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="John Doe"
                      required
                      className="pl-10 bg-secondary/50 border-border"
                    />
                  </div>
                </div>
              </>
            )}

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-foreground">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  className="pl-10 bg-secondary/50 border-border"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-2">
              <Label htmlFor="password" className="text-foreground">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={6}
                  className="pl-10 bg-secondary/50 border-border"
                />
              </div>
            </div>

            <Button
              type="submit"
              variant="hero"
              size="lg"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? "Please wait..." : mode === "signin" ? "Sign In" : "Create Account"}
            </Button>
          </form>

          {/* Toggle Mode */}
          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {mode === "signin" 
                ? "Don't have an account? Sign up" 
                : "Already have an account? Sign in"}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Auth;
