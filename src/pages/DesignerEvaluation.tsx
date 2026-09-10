import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useParams, useNavigate } from "react-router-dom";
import { 
  ArrowLeft, 
  Star, 
  Mail, 
  Briefcase, 
  ExternalLink,
  FileImage,
  Check,
  X,
  MessageSquare,
  Calendar
} from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Profile {
  id: string;
  user_id: string;
  full_name: string | null;
  email: string;
  bio: string | null;
  avatar_url: string | null;
  portfolio_url: string | null;
  specializations: string[];
  years_experience: number | null;
}

interface Design {
  id: string;
  title: string;
  image_url: string;
  category: string | null;
  created_at: string;
  critique?: {
    overall_score: number | null;
  };
}

interface Evaluation {
  rating: number | null;
  status: string;
  notes: string | null;
}

const DesignerEvaluation = () => {
  const { designerId } = useParams<{ designerId: string }>();
  const navigate = useNavigate();
  const { user, role } = useAuth();
  
  const [profile, setProfile] = useState<Profile | null>(null);
  const [designs, setDesigns] = useState<Design[]>([]);
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
  const [loading, setLoading] = useState(true);
  const [rating, setRating] = useState<number>(0);
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<string>("pending");
  const [saving, setSaving] = useState(false);
  const [previewDesign, setPreviewDesign] = useState<Design | null>(null);
  const [zoomed, setZoomed] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (!designerId) return;

      try {
        // Fetch profile
        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("*")
          .eq("user_id", designerId)
          .maybeSingle();

        if (profileError) throw profileError;
        setProfile(profileData);

        // Fetch designs
        const { data: designsData, error: designsError } = await supabase
          .from("designs")
          .select(`
            id,
            title,
            image_url,
            category,
            created_at,
            ai_critiques (
              overall_score
            )
          `)
          .eq("designer_id", designerId)
          .order("created_at", { ascending: false });

        if (designsError) throw designsError;

        const formattedDesigns = designsData?.map(d => ({
          ...d,
          critique: d.ai_critiques?.[0],
        })) || [];
        setDesigns(formattedDesigns);

        // Fetch existing evaluation (for recruiters)
        if (user && role === "recruiter") {
          const { data: evalData, error: evalError } = await supabase
            .from("recruiter_evaluations")
            .select("*")
            .eq("recruiter_id", user.id)
            .eq("designer_id", designerId)
            .is("design_id", null)
            .maybeSingle();

          if (!evalError && evalData) {
            setEvaluation(evalData);
            setRating(evalData.rating || 0);
            setNotes(evalData.notes || "");
            setStatus(evalData.status || "pending");
          }
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [designerId, user, role]);

  const saveEvaluation = async () => {
    if (!user || !designerId || role !== "recruiter") return;

    setSaving(true);
    try {
      const evaluationData = {
        recruiter_id: user.id,
        designer_id: designerId,
        rating: rating || null,
        notes: notes || null,
        status,
      };

      if (evaluation) {
        // Update existing
        const { error } = await supabase
          .from("recruiter_evaluations")
          .update(evaluationData)
          .eq("recruiter_id", user.id)
          .eq("designer_id", designerId)
          .is("design_id", null);

        if (error) throw error;
      } else {
        // Insert new
        const { error } = await supabase
          .from("recruiter_evaluations")
          .insert(evaluationData);

        if (error) throw error;
      }

      toast.success("Evaluation saved!");
    } catch (error) {
      console.error("Error saving evaluation:", error);
      toast.error("Failed to save evaluation");
    } finally {
      setSaving(false);
    }
  };

  const getScoreColor = (score: number | null) => {
    if (!score) return "text-muted-foreground";
    if (score >= 80) return "text-accent";
    if (score >= 60) return "text-yellow-400";
    return "text-orange-400";
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="max-w-5xl mx-auto animate-pulse space-y-6">
          <div className="h-8 bg-secondary rounded w-1/3" />
          <div className="glass rounded-xl p-6 flex gap-6">
            <div className="w-24 h-24 rounded-full bg-secondary" />
            <div className="space-y-3 flex-1">
              <div className="h-6 bg-secondary rounded w-1/3" />
              <div className="h-4 bg-secondary rounded w-1/2" />
              <div className="h-16 bg-secondary rounded" />
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!profile) {
    return (
      <DashboardLayout>
        <div className="max-w-5xl mx-auto text-center py-12">
          <h1 className="font-display text-2xl font-bold text-foreground mb-4">
            Designer not found
          </h1>
          <Button variant="glass" onClick={() => navigate("/designers")}>
            Back to Designers
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Button
            variant="ghost"
            onClick={() => navigate("/designers")}
            className="mb-4 gap-2 text-muted-foreground"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Designers
          </Button>
        </motion.div>

        {/* Profile Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="glass rounded-xl p-6"
        >
          <div className="flex flex-col md:flex-row gap-6">
            <div className="w-24 h-24 rounded-full bg-gradient-primary flex items-center justify-center flex-shrink-0">
              {profile.avatar_url ? (
                <img 
                  src={profile.avatar_url} 
                  alt={profile.full_name || "Designer"} 
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                <span className="text-3xl font-bold text-primary-foreground">
                  {(profile.full_name || profile.email)[0].toUpperCase()}
                </span>
              )}
            </div>

            <div className="flex-1">
              <h1 className="font-display text-2xl font-bold text-foreground mb-1">
                {profile.full_name || "Designer"}
              </h1>
              
              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-4">
                <div className="flex items-center gap-1">
                  <Mail className="w-4 h-4" />
                  {profile.email}
                </div>
                {profile.years_experience && (
                  <div className="flex items-center gap-1">
                    <Briefcase className="w-4 h-4" />
                    {profile.years_experience} years experience
                  </div>
                )}
                {profile.portfolio_url && (
                  <a 
                    href={profile.portfolio_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-primary hover:underline"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Portfolio
                  </a>
                )}
              </div>

              {profile.bio && (
                <p className="text-muted-foreground mb-4">{profile.bio}</p>
              )}

              {profile.specializations && profile.specializations.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {profile.specializations.map((spec, i) => (
                    <span 
                      key={i}
                      className="text-xs px-3 py-1 rounded-full bg-primary/10 text-primary"
                    >
                      {spec}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </motion.div>

        {/* Recruiter Evaluation Panel */}
        {role === "recruiter" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="glass rounded-xl p-6"
          >
            <h2 className="font-display text-lg font-semibold text-foreground mb-4">
              Your Evaluation
            </h2>

            <div className="space-y-4">
              {/* Rating */}
              <div>
                <label className="text-sm text-muted-foreground mb-2 block">Rating</label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((value) => (
                    <button
                      key={value}
                      onClick={() => setRating(value)}
                      className="p-2 transition-colors"
                    >
                      <Star 
                        className={`w-6 h-6 ${
                          value <= rating 
                            ? "text-yellow-400 fill-yellow-400" 
                            : "text-muted-foreground"
                        }`} 
                      />
                    </button>
                  ))}
                </div>
              </div>

              {/* Status */}
              <div>
                <label className="text-sm text-muted-foreground mb-2 block">Status</label>
                <div className="flex flex-wrap gap-2">
                  {["pending", "shortlisted", "contacted", "rejected"].map((s) => (
                    <button
                      key={s}
                      onClick={() => setStatus(s)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        status === s 
                          ? "bg-primary text-primary-foreground" 
                          : "bg-secondary text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {s.charAt(0).toUpperCase() + s.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="text-sm text-muted-foreground mb-2 block">Notes</label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add your notes about this designer..."
                  rows={3}
                  className="bg-secondary/50 border-border resize-none"
                />
              </div>

              <Button 
                variant="hero" 
                onClick={saveEvaluation}
                disabled={saving}
                className="gap-2"
              >
                {saving ? "Saving..." : "Save Evaluation"}
              </Button>
            </div>
          </motion.div>
        )}

        {/* Designer's Work */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <h2 className="font-display text-xl font-semibold text-foreground mb-4">
            Portfolio ({designs.length} designs)
          </h2>

          {designs.length === 0 ? (
            <div className="glass rounded-xl p-12 text-center">
              <FileImage className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground">No designs uploaded yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {designs.map((design, index) => (
                <motion.div
                  key={design.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.3 + index * 0.05 }}
                  className="glass rounded-xl overflow-hidden group"
                >
                  <div className="aspect-video relative overflow-hidden bg-secondary">
                    <img
                      src={design.image_url}
                      alt={design.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                  
                  <div className="p-4">
                    <h3 className="font-display font-semibold text-foreground mb-1 truncate">
                      {design.title}
                    </h3>
                    
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Calendar className="w-3 h-3" />
                        {new Date(design.created_at).toLocaleDateString()}
                      </div>
                      
                      {design.critique?.overall_score && (
                        <div className={`flex items-center gap-1 font-medium ${getScoreColor(design.critique.overall_score)}`}>
                          <Star className="w-3 h-3" />
                          {design.critique.overall_score}/100
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </DashboardLayout>
  );
};

export default DesignerEvaluation;
