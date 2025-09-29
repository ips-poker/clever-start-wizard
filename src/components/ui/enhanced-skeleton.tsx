import React from "react";
import { cn } from "@/lib/utils";

interface EnhancedSkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "glow" | "shimmer";
}

function EnhancedSkeleton({ className, variant = "default", ...props }: EnhancedSkeletonProps) {
  const variants = {
    default: "animate-pulse bg-muted",
    glow: "bg-gradient-to-r from-slate-800/50 via-slate-700/50 to-slate-800/50 bg-[length:200%_100%] animate-[shimmer_2s_infinite] rounded",
    shimmer: "bg-gradient-to-r from-transparent via-white/10 to-transparent bg-[length:200%_100%] animate-[shimmer_1.5s_infinite] relative overflow-hidden"
  };

  return (
    <div 
      className={cn(
        "rounded-md",
        variants[variant],
        className
      )}
      {...props}
    >
      {variant === "shimmer" && (
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-[shimmer_2s_infinite] bg-[length:200%_100%]" />
      )}
      
      <style>{`
        @keyframes shimmer {
          0% {
            background-position: 200% 0;
          }
          100% {
            background-position: -200% 0;
          }
        }
      `}</style>
    </div>
  );
}

export { EnhancedSkeleton };