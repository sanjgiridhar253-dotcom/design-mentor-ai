import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

/* ---------- Analysis sessions (quick / landing-page analyses) ---------- */

export const saveAnalysisSession = async (params: {
  userId: string;
  imageUrl?: string | null;
  designId?: string | null;
  source?: string;
  feedback: unknown;
  overallScore?: number | null;
}) => {
  const { error } = await supabase.from("analysis_sessions").insert({
    user_id: params.userId,
    design_id: params.designId ?? null,
    image_url: params.imageUrl ?? null,
    source: params.source ?? "landing",
    feedback: params.feedback as Json,
    overall_score: params.overallScore ?? null,
  });
  if (error) throw error;
};

export const listAnalysisSessions = async (userId: string) => {
  const { data, error } = await supabase
    .from("analysis_sessions")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
};

/* ---------- Per-design recruiter evaluations ---------- */

export const upsertDesignEvaluation = async (params: {
  recruiterId: string;
  designId: string;
  designerId: string;
  rating?: number | null;
  notes?: string | null;
  status?: string;
}) => {
  const { error } = await supabase
    .from("design_evaluations")
    .upsert(
      {
        recruiter_id: params.recruiterId,
        design_id: params.designId,
        designer_id: params.designerId,
        rating: params.rating ?? null,
        notes: params.notes ?? null,
        status: params.status ?? "pending",
      },
      { onConflict: "recruiter_id,design_id" }
    );
  if (error) throw error;
};

export const listDesignEvaluations = async (designerId: string) => {
  const { data, error } = await supabase
    .from("design_evaluations")
    .select("*")
    .eq("designer_id", designerId)
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
};

/* ---------- Multi-design comparisons ---------- */

export const createComparison = async (params: {
  ownerId: string;
  title?: string;
  designIds: string[];
  result?: unknown;
}) => {
  const { data, error } = await supabase
    .from("design_comparisons")
    .insert({
      owner_id: params.ownerId,
      title: params.title ?? "Comparison",
      design_ids: params.designIds,
      result: (params.result ?? null) as Json,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
};

export const saveComparisonResult = async (id: string, result: unknown) => {
  const { error } = await supabase
    .from("design_comparisons")
    .update({ result: result as Json })
    .eq("id", id);
  if (error) throw error;
};

export const listComparisons = async (ownerId: string) => {
  const { data, error } = await supabase
    .from("design_comparisons")
    .select("*")
    .eq("owner_id", ownerId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
};

export const deleteComparison = async (id: string) => {
  const { error } = await supabase.from("design_comparisons").delete().eq("id", id);
  if (error) throw error;
};
