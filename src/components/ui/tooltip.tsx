import * as React from "react"

import { cn } from "@/lib/utils"

// Временные заглушки для устранения React hook ошибок
const TooltipProvider = ({ children, ...props }: { children: React.ReactNode; [key: string]: any }) => {
  return <>{children}</>;
};

const Tooltip = ({ children, ...props }: { children: React.ReactNode; [key: string]: any }) => {
  return <>{children}</>;
};

const TooltipTrigger = React.forwardRef<
  HTMLElement,
  React.HTMLAttributes<HTMLElement> & { children: React.ReactNode; asChild?: boolean }
>(({ className, children, asChild = false, ...props }, ref) => {
  return asChild && React.isValidElement(children) ? 
    React.cloneElement(children, { ...props, className: cn(className, children.props.className) }) :
    <span ref={ref as any} className={className} {...props}>{children}</span>;
});
TooltipTrigger.displayName = "TooltipTrigger";

const TooltipContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { 
    sideOffset?: number; 
    side?: string; 
    align?: string; 
    hidden?: boolean;
    [key: string]: any; 
  }
>(({ className, sideOffset = 4, children, side, align, hidden, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn(
        "hidden", // Скрываем контент пока не исправим проблемы с React
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
});
TooltipContent.displayName = "TooltipContent";

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider }
