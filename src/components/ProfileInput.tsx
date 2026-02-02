import { motion } from "framer-motion";
import { Trash2, Loader2, User, Briefcase } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { ProfileAnalysis } from "@/hooks/useProfileAnalysis";

interface ProfileInputProps {
  profile: ProfileAnalysis;
  index: number;
  onTextChange: (text: string) => void;
  onAnalyze: () => void;
  onRemove: () => void;
  canRemove: boolean;
}

export const ProfileInput = ({
  profile,
  index,
  onTextChange,
  onAnalyze,
  onRemove,
  canRemove,
}: ProfileInputProps) => {
  const hasResult = !!profile.feedback;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3, delay: index * 0.1 }}
      className="glass rounded-xl p-5 space-y-4"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
            <User className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h3 className="font-display font-semibold text-foreground">
              {profile.feedback?.candidateName || `Candidate ${index + 1}`}
            </h3>
            {profile.feedback?.currentRole && (
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <Briefcase className="w-3 h-3" />
                {profile.feedback.currentRole}
              </p>
            )}
          </div>
        </div>
        {canRemove && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onRemove}
            className="text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        )}
      </div>

      {!hasResult && (
        <>
          <Textarea
            placeholder="Paste LinkedIn profile, resume text, or candidate summary here..."
            value={profile.profileText}
            onChange={(e) => onTextChange(e.target.value)}
            className="min-h-[150px] bg-background/50 border-border/50 resize-none"
            disabled={profile.isAnalyzing}
          />

          <Button
            onClick={onAnalyze}
            disabled={profile.isAnalyzing || !profile.profileText.trim()}
            variant="hero"
            className="w-full"
          >
            {profile.isAnalyzing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Analyzing...
              </>
            ) : (
              "Analyze Profile"
            )}
          </Button>
        </>
      )}

      {profile.error && (
        <p className="text-sm text-destructive">{profile.error}</p>
      )}
    </motion.div>
  );
};
