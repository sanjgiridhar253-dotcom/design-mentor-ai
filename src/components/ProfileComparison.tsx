import { motion, AnimatePresence } from "framer-motion";
import { Plus, Sparkles, RotateCcw, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ProfileInput } from "@/components/ProfileInput";
import { ProfileComparisonCard } from "@/components/ProfileComparisonCard";
import { useProfileAnalysis } from "@/hooks/useProfileAnalysis";
import { useEffect } from "react";

const MAX_PROFILES = 4;

export const ProfileComparison = () => {
  const {
    profiles,
    jobDescription,
    setJobDescription,
    addProfile,
    removeProfile,
    updateProfileText,
    analyzeProfile,
    analyzeAllProfiles,
    resetAll,
  } = useProfileAnalysis();

  // Add first profile on mount
  useEffect(() => {
    if (profiles.length === 0) {
      addProfile();
    }
  }, []);

  const analyzedProfiles = profiles.filter((p) => p.feedback);
  const pendingProfiles = profiles.filter((p) => !p.feedback);
  const isAnyAnalyzing = profiles.some((p) => p.isAnalyzing);
  const hasResults = analyzedProfiles.length > 0;

  if (hasResults && pendingProfiles.length === 0) {
    // Show comparison results
    return (
      <div className="w-full max-w-7xl mx-auto space-y-8">
        {/* Results Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/20 mb-4">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-foreground/80">
              {analyzedProfiles.length} Profile
              {analyzedProfiles.length > 1 ? "s" : ""} Analyzed
            </span>
          </div>
          <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-2">
            Candidate Comparison
          </h2>
          {jobDescription && (
            <p className="text-sm text-muted-foreground max-w-xl mx-auto">
              Evaluated against your job requirements
            </p>
          )}
        </motion.div>

        {/* Comparison Grid */}
        <div
          className={`grid gap-6 ${
            analyzedProfiles.length === 1
              ? "grid-cols-1 max-w-xl mx-auto"
              : analyzedProfiles.length === 2
              ? "grid-cols-1 md:grid-cols-2"
              : analyzedProfiles.length === 3
              ? "grid-cols-1 md:grid-cols-3"
              : "grid-cols-1 md:grid-cols-2 lg:grid-cols-4"
          }`}
        >
          {analyzedProfiles.map((profile, index) => (
            <ProfileComparisonCard
              key={profile.id}
              feedback={profile.feedback!}
              index={index}
            />
          ))}
        </div>

        {/* Actions */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="flex flex-wrap justify-center gap-4"
        >
          <Button variant="glass" size="lg" onClick={resetAll} className="gap-2">
            <RotateCcw className="w-4 h-4" />
            Start New Comparison
          </Button>
        </motion.div>
      </div>
    );
  }

  // Show input form
  return (
    <div className="w-full max-w-5xl mx-auto space-y-8">
      {/* Job Description (Optional) */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass rounded-xl p-5 space-y-3"
      >
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-primary" />
          <h3 className="font-display font-semibold text-foreground">
            Job Description
          </h3>
          <span className="text-xs text-muted-foreground">(Optional)</span>
        </div>
        <Textarea
          placeholder="Paste job description to evaluate candidates against specific requirements..."
          value={jobDescription}
          onChange={(e) => setJobDescription(e.target.value)}
          className="min-h-[100px] bg-background/50 border-border/50 resize-none"
        />
      </motion.div>

      {/* Profile Inputs */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-display font-semibold text-foreground">
            Candidate Profiles
          </h3>
          <span className="text-sm text-muted-foreground">
            {profiles.length}/{MAX_PROFILES}
          </span>
        </div>

        <AnimatePresence mode="popLayout">
          {profiles.map((profile, index) => (
            <ProfileInput
              key={profile.id}
              profile={profile}
              index={index}
              onTextChange={(text) => updateProfileText(profile.id, text)}
              onAnalyze={() => analyzeProfile(profile.id)}
              onRemove={() => removeProfile(profile.id)}
              canRemove={profiles.length > 1}
            />
          ))}
        </AnimatePresence>

        {profiles.length < MAX_PROFILES && (
          <motion.div layout>
            <Button
              variant="outline"
              onClick={addProfile}
              className="w-full border-dashed gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Another Profile
            </Button>
          </motion.div>
        )}
      </div>

      {/* Analyze All Button */}
      {profiles.filter((p) => p.profileText.trim()).length > 1 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center"
        >
          <Button
            variant="hero"
            size="xl"
            onClick={analyzeAllProfiles}
            disabled={isAnyAnalyzing}
            className="gap-2"
          >
            <Sparkles className="w-5 h-5" />
            Compare All Profiles
          </Button>
        </motion.div>
      )}
    </div>
  );
};
