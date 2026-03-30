import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Sparkles, User, Briefcase, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { lovable } from "@/integrations/lovable/index";

type AppRole = "designer" | "recruiter";
type PageStatus = "idle" | "loading" | "success" | "error";

const Auth = () => {
  const [status, setStatus] = useState<PageStatus>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [selectedRole, setSelectedRole] = useState<AppRole | null>(null);

  const { user, role, needsRole, assignRole } = useAuth();
  const navigate = useNavigate();

  // Redirect if fully set up
  useEffect(() => {
    if (user && role) {
      navigate("/dashboard");
    }
  }, [user, role, navigate]);

  const handleGoogleSignIn = async () => {
    setStatus("loading");
    setErrorMessage("");
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result?.error) {
      setStatus("error");
      setErrorMessage("Google sign-in failed. Please try again.");
    }
  };

  const handleRoleSubmit = async () => {
    if (!selectedRole) {
      setStatus("error");
      setErrorMessage("Please select your role to continue.");
      return;
    }
    setStatus("loading");
    setErrorMessage("");
    const { error } = await assignRole(selectedRole);
    if (error) {
      setStatus("error");
      setErrorMessage("Failed to set role. Please try again.");
    } else {
      setStatus("success");
      setTimeout(() => navigate("/dashboard"), 600);
    }
  };

  // Show role selection if signed in but no role
  if (user && needsRole) {
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
            <div className="flex items-center justify-center gap-2 mb-8">
              <div className="p-1.5 rounded-lg bg-gradient-primary">
                <Sparkles className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="font-display font-semibold text-xl text-foreground">
                DesignCritique
              </span>
            </div>

            <h1 className="font-display text-2xl font-bold text-center text-foreground mb-2">
              One more step
            </h1>
            <p className="text-muted-foreground text-center mb-8">
              Tell us how you'll use DesignCritique
            </p>

            <AnimatePresence mode="wait">
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
              {status === "success" && (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="mb-6 flex items-center gap-3 rounded-xl border border-green-500/30 bg-green-500/10 px-4 py-3"
                >
                  <CheckCircle className="w-5 h-5 text-green-500 shrink-0" />
                  <span className="text-sm text-green-400">All set! Redirecting...</span>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="grid grid-cols-2 gap-3 mb-6">
              <button
                type="button"
                onClick={() => { setSelectedRole("designer"); setStatus("idle"); setErrorMessage(""); }}
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
                onClick={() => { setSelectedRole("recruiter"); setStatus("idle"); setErrorMessage(""); }}
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

            <Button
              variant="hero"
              size="lg"
              className="w-full"
              disabled={status === "loading" || status === "success"}
              onClick={handleRoleSubmit}
            >
              {status === "loading" ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Setting up...
                </span>
              ) : status === "success" ? (
                <span className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  All set!
                </span>
              ) : (
                "Continue"
              )}
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

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
          <div className="flex items-center justify-center gap-2 mb-8">
            <div className="p-1.5 rounded-lg bg-gradient-primary">
              <Sparkles className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-display font-semibold text-xl text-foreground">
              DesignCritique
            </span>
          </div>

          <h1 className="font-display text-2xl font-bold text-center text-foreground mb-2">
            Welcome to DesignCritique
          </h1>
          <p className="text-muted-foreground text-center mb-8">
            Sign in with your Google account to get started
          </p>

          <AnimatePresence mode="wait">
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

          <Button
            type="button"
            variant="outline"
            size="lg"
            className="w-full h-12 text-base"
            disabled={status === "loading"}
            onClick={handleGoogleSignIn}
          >
            {status === "loading" ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin" />
                Connecting...
              </span>
            ) : (
              <>
                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Continue with Google
              </>
            )}
          </Button>

          <p className="text-xs text-muted-foreground text-center mt-6">
            By signing in, you agree to our terms of service and privacy policy.
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default Auth;
