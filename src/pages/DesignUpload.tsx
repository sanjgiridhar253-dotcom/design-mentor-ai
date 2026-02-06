import { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Upload, Sparkles, X, Image as ImageIcon } from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const DesignUpload = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const handleFileSelect = (selectedFile: File) => {
    if (selectedFile.type.startsWith("image/")) {
      setFile(selectedFile);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(selectedFile);
    } else {
      toast.error("Please select an image file");
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !user) return;

    setIsUploading(true);

    try {
      // Upload image to storage
      const fileExt = file.name.split(".").pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from("designs")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from("designs")
        .getPublicUrl(fileName);

      // Create design record
      const { data: design, error: designError } = await supabase
        .from("designs")
        .insert({
          designer_id: user.id,
          title,
          description,
          category,
          image_url: publicUrl,
        })
        .select()
        .single();

      if (designError) throw designError;

      // Analyze design with AI
      setIsAnalyzing(true);
      
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const result = reader.result as string;
          resolve(result.split(",")[1]);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const { data: analysisData, error: analysisError } = await supabase.functions.invoke(
        "analyze-design",
        {
          body: {
            imageBase64: base64,
            mimeType: file.type,
          },
        }
      );

      if (!analysisError && analysisData?.feedback) {
        // Save critique
        await supabase.from("ai_critiques").insert({
          design_id: design.id,
          overall_score: analysisData.feedback.overallScore * 10,
          layout_score: analysisData.feedback.categories?.find((c: any) => c.name === "Layout")?.score * 10 || null,
          color_score: analysisData.feedback.categories?.find((c: any) => c.name === "Color Harmony")?.score * 10 || null,
          typography_score: analysisData.feedback.categories?.find((c: any) => c.name === "Typography")?.score * 10 || null,
          strengths: analysisData.feedback.categories?.flatMap((c: any) => 
            c.findings?.filter((f: any) => f.type === "strength").map((f: any) => f.title) || []
          ),
          improvements: analysisData.feedback.categories?.flatMap((c: any) => 
            c.findings?.filter((f: any) => f.type === "improvement").map((f: any) => f.title) || []
          ),
          quick_wins: analysisData.feedback.topPriorities || [],
          detailed_feedback: analysisData.feedback,
        });
      }

      toast.success("Design uploaded and analyzed!");
      navigate(`/critique/${design.id}`);
    } catch (error) {
      console.error("Upload error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to upload design");
    } finally {
      setIsUploading(false);
      setIsAnalyzing(false);
    }
  };

  const clearFile = () => {
    setFile(null);
    setPreview(null);
  };

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="font-display text-3xl font-bold text-foreground mb-2">
            Upload New Design
          </h1>
          <p className="text-muted-foreground mb-8">
            Share your work and get AI-powered feedback to improve your skills.
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Upload Zone */}
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              className={`relative rounded-2xl transition-all duration-300 ${
                isDragging ? "scale-[1.02]" : ""
              }`}
            >
              <div className={`absolute inset-0 rounded-2xl bg-gradient-primary opacity-50 ${
                isDragging ? "opacity-100" : ""
              } transition-opacity duration-300`} />
              
              <div className="relative glass rounded-xl overflow-hidden">
                {preview ? (
                  <div className="relative">
                    <img
                      src={preview}
                      alt="Preview"
                      className="w-full h-auto max-h-[400px] object-contain"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-transparent to-transparent" />
                    <div className="absolute bottom-4 right-4">
                      <Button
                        type="button"
                        variant="glass"
                        size="sm"
                        onClick={clearFile}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center py-16 cursor-pointer group">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                      className="sr-only"
                    />
                    <div className={`p-6 rounded-2xl mb-6 transition-all ${
                      isDragging ? "bg-primary/20" : "bg-secondary/50 group-hover:bg-secondary"
                    }`}>
                      <Upload className={`w-10 h-10 ${
                        isDragging ? "text-primary" : "text-muted-foreground group-hover:text-primary"
                      }`} />
                    </div>
                    <h3 className="text-xl font-display font-semibold text-foreground mb-2">
                      {isDragging ? "Drop it here!" : "Upload your design"}
                    </h3>
                    <p className="text-muted-foreground text-center">
                      Drag and drop, or <span className="text-primary font-medium">browse</span>
                    </p>
                    <p className="text-muted-foreground/60 text-sm mt-2">
                      PNG, JPG, WebP up to 10MB
                    </p>
                  </label>
                )}
              </div>
            </div>

            {/* Form Fields */}
            <div className="glass rounded-xl p-6 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title" className="text-foreground">Design Title *</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., E-commerce Dashboard"
                  required
                  className="bg-secondary/50 border-border"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description" className="text-foreground">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Tell us about your design..."
                  rows={3}
                  className="bg-secondary/50 border-border resize-none"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="category" className="text-foreground">Category</Label>
                <Input
                  id="category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="e.g., Web App, Mobile, Dashboard"
                  className="bg-secondary/50 border-border"
                />
              </div>
            </div>

            {/* Submit */}
            <Button
              type="submit"
              variant="hero"
              size="xl"
              className="w-full gap-2"
              disabled={!file || !title || isUploading || isAnalyzing}
            >
              {isAnalyzing ? (
                <>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  >
                    <Sparkles className="w-5 h-5" />
                  </motion.div>
                  Analyzing with AI...
                </>
              ) : isUploading ? (
                <>
                  <Upload className="w-5 h-5" />
                  Uploading...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  Upload & Get AI Feedback
                </>
              )}
            </Button>
          </form>
        </motion.div>
      </div>
    </DashboardLayout>
  );
};

export default DesignUpload;
