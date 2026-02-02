import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface Finding {
  type: "strength" | "improvement";
  title: string;
  description: string;
}

export interface Category {
  name: string;
  score: number;
  status: "excellent" | "good" | "needs-work";
  findings: Finding[];
}

export interface ProfileFeedback {
  overallScore: number;
  summary: string;
  categories: Category[];
  topPriorities: string[];
  candidateName?: string;
  currentRole?: string;
}

export interface ProfileAnalysis {
  id: string;
  profileText: string;
  feedback: ProfileFeedback | null;
  isAnalyzing: boolean;
  error: string | null;
}

export const useProfileAnalysis = () => {
  const [profiles, setProfiles] = useState<ProfileAnalysis[]>([]);
  const [jobDescription, setJobDescription] = useState<string>("");

  const addProfile = () => {
    const newProfile: ProfileAnalysis = {
      id: crypto.randomUUID(),
      profileText: "",
      feedback: null,
      isAnalyzing: false,
      error: null,
    };
    setProfiles((prev) => [...prev, newProfile]);
    return newProfile.id;
  };

  const removeProfile = (id: string) => {
    setProfiles((prev) => prev.filter((p) => p.id !== id));
  };

  const updateProfileText = (id: string, text: string) => {
    setProfiles((prev) =>
      prev.map((p) => (p.id === id ? { ...p, profileText: text } : p))
    );
  };

  const analyzeProfile = async (id: string) => {
    const profile = profiles.find((p) => p.id === id);
    if (!profile || !profile.profileText.trim()) {
      toast.error("Please enter profile text first");
      return;
    }

    setProfiles((prev) =>
      prev.map((p) =>
        p.id === id ? { ...p, isAnalyzing: true, error: null, feedback: null } : p
      )
    );

    try {
      const { data, error: functionError } = await supabase.functions.invoke(
        "analyze-profile",
        {
          body: {
            profileText: profile.profileText,
            jobDescription: jobDescription || undefined,
          },
        }
      );

      if (functionError) {
        throw new Error(functionError.message);
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      if (!data?.feedback) {
        throw new Error("No feedback received");
      }

      setProfiles((prev) =>
        prev.map((p) =>
          p.id === id
            ? { ...p, feedback: data.feedback, isAnalyzing: false }
            : p
        )
      );

      toast.success("Profile analysis complete!");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to analyze profile";
      setProfiles((prev) =>
        prev.map((p) =>
          p.id === id ? { ...p, error: message, isAnalyzing: false } : p
        )
      );
      toast.error(message);
    }
  };

  const analyzeAllProfiles = async () => {
    const profilesToAnalyze = profiles.filter(
      (p) => p.profileText.trim() && !p.feedback
    );

    if (profilesToAnalyze.length === 0) {
      toast.error("No profiles to analyze");
      return;
    }

    await Promise.all(profilesToAnalyze.map((p) => analyzeProfile(p.id)));
  };

  const resetAll = () => {
    setProfiles([]);
    setJobDescription("");
  };

  return {
    profiles,
    jobDescription,
    setJobDescription,
    addProfile,
    removeProfile,
    updateProfileText,
    analyzeProfile,
    analyzeAllProfiles,
    resetAll,
  };
};
