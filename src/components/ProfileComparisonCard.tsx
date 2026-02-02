import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2,
  Lightbulb,
  ChevronDown,
  Trophy,
  Target,
  User,
  Briefcase,
} from "lucide-react";
import { useState } from "react";
import type { ProfileFeedback, Category } from "@/hooks/useProfileAnalysis";

interface ProfileComparisonCardProps {
  feedback: ProfileFeedback;
  index: number;
}

const getScoreColor = (score: number) => {
  if (score >= 8) return "text-accent";
  if (score >= 6) return "text-yellow-400";
  return "text-orange-400";
};

const getScoreBg = (score: number) => {
  if (score >= 8) return "bg-accent/20";
  if (score >= 6) return "bg-yellow-400/20";
  return "bg-orange-400/20";
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case "excellent":
      return <Trophy className="w-4 h-4 text-accent" />;
    case "good":
      return <CheckCircle2 className="w-4 h-4 text-yellow-400" />;
    default:
      return <Target className="w-4 h-4 text-orange-400" />;
  }
};

const CategoryRow = ({ category }: { category: Category }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="border-b border-border/30 last:border-b-0">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full py-3 flex items-center justify-between hover:bg-white/5 transition-colors px-1"
      >
        <div className="flex items-center gap-2">
          {getStatusIcon(category.status)}
          <span className="text-sm text-foreground">{category.name}</span>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`text-lg font-bold ${getScoreColor(category.score)}`}
          >
            {category.score}
          </span>
          <ChevronDown
            className={`w-4 h-4 text-muted-foreground transition-transform ${
              isExpanded ? "rotate-180" : ""
            }`}
          />
        </div>
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="pb-3 px-1 space-y-2">
              {category.findings.map((finding, i) => (
                <div
                  key={i}
                  className={`p-2 rounded-lg text-xs ${
                    finding.type === "strength"
                      ? "bg-accent/10 border border-accent/20"
                      : "bg-primary/10 border border-primary/20"
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {finding.type === "strength" ? (
                      <CheckCircle2 className="w-3 h-3 text-accent mt-0.5 flex-shrink-0" />
                    ) : (
                      <Lightbulb className="w-3 h-3 text-primary mt-0.5 flex-shrink-0" />
                    )}
                    <div>
                      <p className="font-medium text-foreground">
                        {finding.title}
                      </p>
                      <p className="text-muted-foreground mt-1">
                        {finding.description}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export const ProfileComparisonCard = ({
  feedback,
  index,
}: ProfileComparisonCardProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.1 }}
      className="glass rounded-xl overflow-hidden flex flex-col h-full"
    >
      {/* Header with score */}
      <div className="p-5 border-b border-border/30">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
            <User className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-display font-semibold text-foreground truncate">
              {feedback.candidateName || "Unknown Candidate"}
            </h3>
            {feedback.currentRole && (
              <p className="text-sm text-muted-foreground flex items-center gap-1 truncate">
                <Briefcase className="w-3 h-3 flex-shrink-0" />
                {feedback.currentRole}
              </p>
            )}
          </div>
        </div>

        <div
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-full ${getScoreBg(
            feedback.overallScore
          )}`}
        >
          <span
            className={`font-display text-3xl font-bold ${getScoreColor(
              feedback.overallScore
            )}`}
          >
            {feedback.overallScore}
          </span>
          <span className="text-sm text-muted-foreground">/10</span>
        </div>

        <p className="text-sm text-muted-foreground mt-3">{feedback.summary}</p>
      </div>

      {/* Categories */}
      <div className="flex-1 overflow-auto px-4">
        {feedback.categories.map((category) => (
          <CategoryRow key={category.name} category={category} />
        ))}
      </div>

      {/* Top Priorities */}
      {feedback.topPriorities && feedback.topPriorities.length > 0 && (
        <div className="p-4 border-t border-border/30 bg-orange-400/5">
          <p className="text-xs font-medium text-orange-400 mb-2">
            Interview Follow-ups
          </p>
          <ul className="space-y-1">
            {feedback.topPriorities.slice(0, 3).map((priority, i) => (
              <li
                key={i}
                className="text-xs text-foreground/80 flex items-start gap-2"
              >
                <span className="text-orange-400 font-medium">{i + 1}.</span>
                <span className="line-clamp-2">{priority}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </motion.div>
  );
};
