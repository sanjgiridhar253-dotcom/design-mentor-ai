import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Sparkles, User, Briefcase, Mail, Lock, UserCircle, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { lovable } from "@/integrations/lovable/index";

type AuthMode = "signin" | "signup";
type AppRole = "designer" | "recruiter";
type FormStatus = "idle" | "loading" | "success" | "error";

const Auth = () => {
  const [mode, setMode] = useState<AuthMode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [selectedRole, setSelectedRole] = useState<AppRole | null>(null);
  const [status, setStatus] = useState<FormStatus>("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();

  const resetStatus = () => {
    setStatus("idle");
    setErrorMessage("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");
    setErrorMessage("");

    try {
      if (mode === "signin") {
        const { error } = await signIn(email, password);
        if (error) throw error;
        setStatus("success");
        setTimeout(() => navigate("/dashboard"), 600);
      } else {
        if (!selectedRole) {
          setStatus("error");
          setErrorMessage("Please select whether you're a designer or recruiter.");
          return;
        }
        if (!fullName.trim()) {
          setStatus("error");
          setErrorMessage("Please enter your full name.");
          return;
        }
        if (password.length < 6) {
          setStatus("error");
          setErrorMessage("Password must be at least 6 characters.");
          return;
        }
        const { error } = await signUp(email, password, selectedRole, fullName);
        if (error) throw error;
        setStatus("success");
        setTimeout(() => navigate("/dashboard"), 600);
      }
    } catch (error) {
      setStatus("error");
      const msg = error instanceof Error ? error.message : "Something went wrong. Please try again.";
      if (msg.includes("Invalid login credentials")) {
        setErrorMessage("Incorrect email or password. Please try again.");
      } else if (msg.includes("already registered") || msg.includes("already been registered")) {
        setErrorMessage("This email is already registered. Try signing in instead.");
      } else if (msg.includes("rate limit") || msg.includes("too many")) {
        setErrorMessage("Too many attempts. Please wait a moment and try again.");
      } else {
        setErrorMessage(msg);
      }
    }
  };

  const switchMode = () => {
    setMode(mode === "signin" ? "signup" : "signin");
    resetStatus();
  };

  return (
    <div className="min-h-screen bg-background relative overflow-hidden flex items-center justify-center">
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

          {/* Status Banner */}
          <AnimatePresence mode="wait">
            {status === "success" && (
              <motion.div
                key="success"
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="mb-6 flex items-center gap-3 rounded-xl border border-green-500/30 bg-green-500/10 px-4 py-3"
              >
                <CheckCircle className="w-5 h-5 text-green-500 shrink-0" />
                <span className="text-sm text-green-400">
                  {mode === "signin" ? "Signed in! Redirecting..." : "Account created! Redirecting..."}
                </span>
              </motion.div>
            )}
            {status === "error" && errorMessage && (
              <motion.div
                key="error"
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="mb-6 flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3"
              >
                <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                <span className="text-sm text-destructive">{errorMessage}</span>
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleSubmit} className="space-y-6">
            {mode === "signup" && (
              <>
                {/* Role Selection */}
                <div className="space-y-3">
                  <Label className="text-foreground">I am a...</Label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => { setSelectedRole("designer"); resetStatus(); }}
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
                      }`}>Designer</div>
                      <div className="text-xs text-muted-foreground mt-1">Upload & get feedback</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => { setSelectedRole("recruiter"); resetStatus(); }}
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
                      }`}>Recruiter</div>
                      <div className="text-xs text-muted-foreground mt-1">Review designers</div>
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
                      onChange={(e) => { setFullName(e.target.value); resetStatus(); }}
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
                  onChange={(e) => { setEmail(e.target.value); resetStatus(); }}
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
                  onChange={(e) => { setPassword(e.target.value); resetStatus(); }}
                  placeholder="••••••••"
                  required
                  minLength={6}
                  className="pl-10 bg-secondary/50 border-border"
                />
              </div>
              {mode === "signup" && (
                <p className="text-xs text-muted-foreground">Must be at least 6 characters</p>
              )}
            </div>

            <Button
              type="submit"
              variant="hero"
              size="lg"
              className="w-full"
              disabled={status === "loading" || status === "success"}
            >
              {status === "loading" ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {mode === "signin" ? "Signing in..." : "Creating account..."}
                </span>
              ) : status === "success" ? (
                <span className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  {mode === "signin" ? "Signed in!" : "Account created!"}
                </span>
              ) : (
                mode === "signin" ? "Sign In" : "Create Account"
              )}
            </Button>
          </form>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">or continue with</span>
            </div>
          </div>

          {/* Google OAuth */}
          <Button
            type="button"
            variant="outline"
            size="lg"
            className="w-full"
            disabled={status === "loading" || status === "success"}
            onClick={async () => {
              setStatus("loading");
              setErrorMessage("");
              const result = await lovable.auth.signInWithOAuth("google", {
                redirect_uri: window.location.origin,
              });
              if (result?.error) {
                setStatus("error");
                setErrorMessage("Google sign-in failed. Please try again.");
              }
            }}
          >
            <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </Button>

          {/* Toggle Mode */}
          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={switchMode}
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
