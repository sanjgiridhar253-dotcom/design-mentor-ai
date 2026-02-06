import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { FileImage, Plus, Star, Calendar, Eye } from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

interface Design {
  id: string;
  title: string;
  description: string | null;
  image_url: string;
  category: string | null;
  created_at: string;
  critique?: {
    overall_score: number | null;
  };
}

const MyDesigns = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [designs, setDesigns] = useState<Design[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDesigns = async () => {
      if (!user) return;

      try {
        const { data, error } = await supabase
          .from("designs")
          .select(`
            id,
            title,
            description,
            image_url,
            category,
            created_at,
            ai_critiques (
              overall_score
            )
          `)
          .eq("designer_id", user.id)
          .order("created_at", { ascending: false });

        if (error) throw error;

        const formattedDesigns = data?.map(d => ({
          ...d,
          critique: d.ai_critiques?.[0],
        })) || [];

        setDesigns(formattedDesigns);
      } catch (error) {
        console.error("Error fetching designs:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDesigns();
  }, [user]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const getScoreColor = (score: number | null) => {
    if (!score) return "text-muted-foreground";
    if (score >= 80) return "text-accent";
    if (score >= 60) return "text-yellow-400";
    return "text-orange-400";
  };

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="font-display text-3xl font-bold text-foreground mb-2">
                My Designs
              </h1>
              <p className="text-muted-foreground">
                View and manage your uploaded designs
              </p>
            </div>
            <Button variant="hero" onClick={() => navigate("/upload")} className="gap-2">
              <Plus className="w-4 h-4" />
              Upload New
            </Button>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="glass rounded-xl overflow-hidden animate-pulse">
                  <div className="aspect-video bg-secondary" />
                  <div className="p-4 space-y-3">
                    <div className="h-5 bg-secondary rounded w-3/4" />
                    <div className="h-4 bg-secondary rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : designs.length === 0 ? (
            <div className="glass rounded-xl p-12 text-center">
              <FileImage className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h2 className="font-display text-xl font-semibold text-foreground mb-2">
                No designs yet
              </h2>
              <p className="text-muted-foreground mb-6">
                Upload your first design to get AI-powered feedback
              </p>
              <Button variant="hero" onClick={() => navigate("/upload")} className="gap-2">
                <Plus className="w-4 h-4" />
                Upload Your First Design
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {designs.map((design, index) => (
                <motion.div
                  key={design.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: index * 0.1 }}
                  onClick={() => navigate(`/critique/${design.id}`)}
                  className="glass rounded-xl overflow-hidden cursor-pointer group hover:bg-secondary/30 transition-colors"
                >
                  <div className="aspect-video relative overflow-hidden bg-secondary">
                    <img
                      src={design.image_url}
                      alt={design.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button size="sm" variant="hero" className="gap-1">
                        <Eye className="w-3 h-3" />
                        View
                      </Button>
                    </div>
                  </div>
                  
                  <div className="p-4">
                    <h3 className="font-display font-semibold text-foreground mb-1 truncate">
                      {design.title}
                    </h3>
                    
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Calendar className="w-3 h-3" />
                        {formatDate(design.created_at)}
                      </div>
                      
                      {design.critique?.overall_score && (
                        <div className={`flex items-center gap-1 font-medium ${getScoreColor(design.critique.overall_score)}`}>
                          <Star className="w-3 h-3" />
                          {design.critique.overall_score}/100
                        </div>
                      )}
                    </div>

                    {design.category && (
                      <div className="mt-2">
                        <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary">
                          {design.category}
                        </span>
                      </div>
                    )}
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

export default MyDesigns;
