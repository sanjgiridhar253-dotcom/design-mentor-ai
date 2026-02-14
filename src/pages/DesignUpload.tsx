import { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Upload, Sparkles, X, Link, ImageIcon, ExternalLink } from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type UploadMode = "file" | "url";

const DesignUpload = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [uploadMode, setUploadMode] = useState<UploadMode>("file");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState("");
  const [urlPreviewValid, setUrlPreviewValid] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [portfolioUrl, setPortfolioUrl] = useState("");
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

  const handleUrlChange = (url: string) => {
    setImageUrl(url);
    setUrlPreviewValid(false);

    if (url.match(/^https?:\/\/.+\.(png|jpe?g|webp|gif|svg|bmp)(\?.*)?$/i) || url.match(/^https?:\/\/.+/i)) {
      // Try loading as image
      const img = new Image();
      img.onload = () => {
        setUrlPreviewValid(true);
        setPreview(url);
      };
      img.onerror = () => {
        setUrlPreviewValid(false);
        setPreview(null);
      };
      img.src = url;
    }
  };

  const isReadyToSubmit = () => {
    if (!title || !user) return false;
    if (uploadMode === "file") return !!file;
    if (uploadMode === "url") return !!imageUrl && urlPreviewValid;
    return false;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !isReadyToSubmit()) return;

    setIsUploading(true);

    try {
      let finalImageUrl = "";
      let base64ForAnalysis: string | null = null;
      let mimeTypeForAnalysis = "image/png";

      if (uploadMode === "file" && file) {
        // Upload image to storage
        const fileExt = file.name.split(".").pop();
        const fileName = `${user.id}/${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from("designs")
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from("designs")
          .getPublicUrl(fileName);

        finalImageUrl = publicUrl;
        mimeTypeForAnalysis = file.type;

        // Get base64 for analysis
        base64ForAnalysis = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const result = reader.result as string;
            resolve(result.split(",")[1]);
          };
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
      } else if (uploadMode === "url") {
        finalImageUrl = imageUrl;
        // For URL-based uploads, we'll pass the URL to the analysis function
      }

      // Build description with portfolio URL if provided
      const fullDescription = portfolioUrl
        ? `${description}\n\nPortfolio: ${portfolioUrl}`.trim()
        : description;

      // Create design record
      const { data: design, error: designError } = await supabase
        .from("designs")
        .insert({
          designer_id: user.id,
          title,
          description: fullDescription,
          category,
          image_url: finalImageUrl,
        })
        .select()
        .single();

      if (designError) throw designError;

      // Analyze design with AI
      setIsAnalyzing(true);

      const analysisBody: Record<string, string> = {};
      if (base64ForAnalysis) {
        analysisBody.imageBase64 = base64ForAnalysis;
        analysisBody.mimeType = mimeTypeForAnalysis;
      } else {
        analysisBody.imageUrl = finalImageUrl;
      }

      const { data: analysisData, error: analysisError } = await supabase.functions.invoke(
        "analyze-design",
        { body: analysisBody }
      );

      if (!analysisError && analysisData?.feedback) {
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
    setImageUrl("");
    setUrlPreviewValid(false);
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
            {/* Upload Mode Toggle */}
            <div className="flex gap-2 p-1 rounded-xl bg-secondary/50 w-fit">
              <button
                type="button"
                onClick={() => { setUploadMode("file"); clearFile(); }}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  uploadMode === "file"
                    ? "bg-primary text-primary-foreground shadow-md"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Upload className="w-4 h-4" />
                Upload File
              </button>
              <button
                type="button"
                onClick={() => { setUploadMode("url"); clearFile(); }}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  uploadMode === "url"
                    ? "bg-primary text-primary-foreground shadow-md"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Link className="w-4 h-4" />
                Paste URL
              </button>
            </div>

            {/* Upload Zone */}
            {uploadMode === "file" ? (
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
            ) : (
              <div className="glass rounded-xl p-6 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="imageUrl" className="text-foreground">Image URL *</Label>
                  <div className="relative">
                    <ExternalLink className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      id="imageUrl"
                      type="url"
                      value={imageUrl}
                      onChange={(e) => handleUrlChange(e.target.value)}
                      placeholder="https://example.com/design.png"
                      className="pl-10 bg-secondary/50 border-border"
                    />
                  </div>
                  <p className="text-muted-foreground/60 text-xs">
                    Paste a direct link to your design image (PNG, JPG, WebP, etc.)
                  </p>
                </div>

                {/* URL Preview */}
                {preview && urlPreviewValid && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="relative rounded-xl overflow-hidden border border-border"
                  >
                    <img
                      src={preview}
                      alt="URL Preview"
                      className="w-full h-auto max-h-[400px] object-contain"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-transparent to-transparent" />
                    <div className="absolute bottom-4 left-4 flex items-center gap-2 text-sm text-muted-foreground">
                      <ImageIcon className="w-4 h-4 text-accent" />
                      <span>Image loaded successfully</span>
                    </div>
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
                  </motion.div>
                )}

                {imageUrl && !urlPreviewValid && (
                  <p className="text-sm text-muted-foreground">
                    Validating image URL... Make sure it's a direct link to an image file.
                  </p>
                )}
              </div>
            )}

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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="category" className="text-foreground">Category</Label>
                  <Input
                    id="category"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder="e.g., Web App, Mobile"
                    className="bg-secondary/50 border-border"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="portfolioUrl" className="text-foreground">Portfolio URL</Label>
                  <div className="relative">
                    <Link className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="portfolioUrl"
                      type="url"
                      value={portfolioUrl}
                      onChange={(e) => setPortfolioUrl(e.target.value)}
                      placeholder="https://yourportfolio.com"
                      className="pl-9 bg-secondary/50 border-border"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Submit */}
            <Button
              type="submit"
              variant="hero"
              size="xl"
              className="w-full gap-2"
              disabled={!isReadyToSubmit() || isUploading || isAnalyzing}
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
