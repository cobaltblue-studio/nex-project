import { clsx } from "clsx";
import { Sparkles, Zap, Flame, Crown } from "lucide-react";

interface LeagueBadgeProps {
  league: string;
  className?: string;
  showIcon?: boolean;
}

export function LeagueBadge({ league, className, showIcon = true }: LeagueBadgeProps) {
  const config: Record<string, { color: string, border: string, shadow: string, icon: React.ElementType }> = {
    Spark: { 
      color: "text-zinc-400", 
      border: "border-zinc-500/30 bg-zinc-500/10", 
      shadow: "shadow-none",
      icon: Sparkles
    },
    Core: { 
      color: "text-cyan-400", 
      border: "border-cyan-500/30 bg-cyan-500/10", 
      shadow: "shadow-[0_0_10px_rgba(34,211,238,0.2)]",
      icon: Zap
    },
    Ascendant: { 
      color: "text-fuchsia-400", 
      border: "border-fuchsia-500/40 bg-fuchsia-500/10", 
      shadow: "shadow-[0_0_15px_rgba(192,38,211,0.3)]",
      icon: Flame
    },
    Sovereign: { 
      color: "text-amber-400", 
      border: "border-amber-500/50 bg-amber-500/10", 
      shadow: "shadow-[0_0_20px_rgba(251,191,36,0.4)]",
      icon: Crown
    },
  };

  const c = config[league] || config.Spark;
  const Icon = c.icon;

  return (
    <div className={clsx(
      "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border backdrop-blur-sm",
      c.color, c.border, c.shadow, className
    )}>
      {showIcon && <Icon className="w-3.5 h-3.5" />}
      {league}
    </div>
  );
}
