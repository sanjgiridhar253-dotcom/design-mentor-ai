import { useNavigate } from "react-router-dom";
import { User, FileImage, Clock, CheckCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DesignerCardProps {
  designer: {
    user_id: string;
    full_name: string | null;
    email: string;
    avatar_url: string | null;
    design_count: number;
    pending_count: number;
    reviewed_count: number;
    latest_design_date: string | null;
  };
}

export const DesignerCard = ({ designer }: DesignerCardProps) => {
  const navigate = useNavigate();

  const status = designer.pending_count > 0 ? "pending" : designer.reviewed_count > 0 ? "reviewed" : "no_designs";

  const statusConfig = {
    pending: { label: "Pending Review", icon: Clock, className: "text-yellow-400 bg-yellow-400/10" },
    reviewed: { label: "Reviewed", icon: CheckCircle, className: "text-accent bg-accent/10" },
    no_designs: { label: "No Submissions", icon: AlertCircle, className: "text-muted-foreground bg-muted/50" },
  };

  const { label, icon: StatusIcon, className } = statusConfig[status];

  return (
    <div className="glass rounded-xl p-6 flex flex-col gap-4 hover:bg-secondary/30 transition-colors">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-full bg-gradient-primary flex items-center justify-center flex-shrink-0">
          {designer.avatar_url ? (
            <img
              src={designer.avatar_url}
              alt={designer.full_name || "Designer"}
              className="w-full h-full rounded-full object-cover"
            />
          ) : (
            <User className="w-5 h-5 text-primary-foreground" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="font-display font-semibold text-foreground truncate">
            {designer.full_name || "Unnamed Designer"}
          </h3>
          <p className="text-sm text-muted-foreground">UI/UX Designer</p>
        </div>
      </div>

      <div className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full w-fit ${className}`}>
        <StatusIcon className="w-3.5 h-3.5" />
        {label}
      </div>

      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        <div className="flex items-center gap-1">
          <FileImage className="w-4 h-4" />
          <span>{designer.design_count} design{designer.design_count !== 1 ? "s" : ""}</span>
        </div>
        {designer.latest_design_date && (
          <div className="flex items-center gap-1">
            <Clock className="w-4 h-4" />
            <span>{new Date(designer.latest_design_date).toLocaleDateString()}</span>
          </div>
        )}
      </div>

      <Button
        variant="hero"
        size="sm"
        className="w-full gap-2 mt-auto"
        onClick={() => navigate(`/designer/${designer.user_id}`)}
        disabled={status === "no_designs"}
      >
        Review Design
      </Button>
    </div>
  );
};
