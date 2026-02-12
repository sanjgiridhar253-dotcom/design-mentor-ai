import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Users, Clock, CheckCircle, FileImage } from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { DesignerCard } from "@/components/DesignerCard";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

interface DesignerInfo {
  user_id: string;
  full_name: string | null;
  email: string;
  avatar_url: string | null;
  design_count: number;
  pending_count: number;
  reviewed_count: number;
  latest_design_date: string | null;
}

const RecruiterDashboard = () => {
  const { user } = useAuth();
  const [designers, setDesigners] = useState<DesignerInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;

      try {
        // Get all designer user IDs
        const { data: roles } = await supabase
          .from("user_roles")
          .select("user_id")
          .eq("role", "designer");

        const designerIds = roles?.map((r) => r.user_id) || [];
        if (designerIds.length === 0) {
          setDesigners([]);
          setLoading(false);
          return;
        }

        // Fetch profiles, designs, and recruiter's evaluations in parallel
        const [profilesRes, designsRes, evalsRes] = await Promise.all([
          supabase.from("profiles").select("*").in("user_id", designerIds),
          supabase.from("designs").select("id, designer_id, created_at").in("designer_id", designerIds),
          supabase.from("recruiter_evaluations").select("designer_id").eq("recruiter_id", user.id),
        ]);

        const profiles = profilesRes.data || [];
        const designs = designsRes.data || [];
        const evals = evalsRes.data || [];
        const evaluatedDesignerIds = new Set(evals.map((e) => e.designer_id));

        const designerInfos: DesignerInfo[] = profiles.map((profile) => {
          const userDesigns = designs.filter((d) => d.designer_id === profile.user_id);
          const designCount = userDesigns.length;
          const isReviewed = evaluatedDesignerIds.has(profile.user_id);
          const latestDesign = userDesigns.sort(
            (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          )[0];

          return {
            user_id: profile.user_id,
            full_name: profile.full_name,
            email: profile.email,
            avatar_url: profile.avatar_url,
            design_count: designCount,
            pending_count: designCount > 0 && !isReviewed ? designCount : 0,
            reviewed_count: isReviewed ? designCount : 0,
            latest_design_date: latestDesign?.created_at || null,
          };
        });

        // Sort: pending first, then reviewed, then no designs
        designerInfos.sort((a, b) => {
          if (a.pending_count > 0 && b.pending_count === 0) return -1;
          if (a.pending_count === 0 && b.pending_count > 0) return 1;
          return b.design_count - a.design_count;
        });

        setDesigners(designerInfos);
      } catch (error) {
        console.error("Error fetching recruiter dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  const totalDesigners = designers.length;
  const pendingReview = designers.filter((d) => d.pending_count > 0).length;
  const recentlyEvaluated = designers.filter((d) => d.reviewed_count > 0).length;
  const totalDesigns = designers.reduce((sum, d) => sum + d.design_count, 0);

  const stats = [
    { label: "Designers Submitted", value: totalDesigners, icon: Users, color: "text-primary" },
    { label: "Pending Review", value: pendingReview, icon: Clock, color: "text-yellow-400" },
    { label: "Evaluated", value: recentlyEvaluated, icon: CheckCircle, color: "text-accent" },
    { label: "Total Designs", value: totalDesigns, icon: FileImage, color: "text-orange-400" },
  ];

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="font-display text-3xl font-bold text-foreground mb-2">
            Recruiter Dashboard 🧠
          </h1>
          <p className="text-muted-foreground">
            Your judging hub — review designer submissions and manage evaluations.
          </p>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
        >
          {stats.map((stat) => (
            <div key={stat.label} className="glass rounded-xl p-6 hover:bg-secondary/30 transition-colors">
              <div className="flex items-center gap-3 mb-4">
                <div className={`p-2 rounded-lg bg-secondary ${stat.color}`}>
                  <stat.icon className="w-5 h-5" />
                </div>
                <span className="text-sm text-muted-foreground">{stat.label}</span>
              </div>
              <div className="font-display text-3xl font-bold text-foreground">
                {loading ? "..." : stat.value}
              </div>
            </div>
          ))}
        </motion.div>

        {/* Designer Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <h2 className="font-display text-xl font-semibold text-foreground mb-4">
            Designer Submissions
          </h2>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="glass rounded-xl p-6 animate-pulse h-52">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 rounded-full bg-secondary" />
                    <div className="space-y-2 flex-1">
                      <div className="h-4 bg-secondary rounded w-3/4" />
                      <div className="h-3 bg-secondary rounded w-1/2" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : designers.length === 0 ? (
            <div className="glass rounded-xl p-12 text-center">
              <Users className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="font-display text-lg font-semibold text-foreground mb-2">
                No designers yet
              </h3>
              <p className="text-muted-foreground">
                Designers will appear here once they submit their work.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {designers.map((designer, index) => (
                <motion.div
                  key={designer.user_id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: index * 0.05 }}
                >
                  <DesignerCard designer={designer} />
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </DashboardLayout>
  );
};

export default RecruiterDashboard;
