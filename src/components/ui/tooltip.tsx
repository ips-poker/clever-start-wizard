import * as React from "react"

import { cn } from "@/lib/utils"

// Упрощённые тултипы без Radix, чтобы избежать конфликтов React hooks
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
  return asChild && React.isValidElement(children)
    ? React.cloneElement(children, { ...props, className: cn(className, children.props.className) })
    : (
      <span ref={ref as any} className={className} {...props}>
        {children}
      </span>
    );
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
>(({ className, children, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn(
        "z-50 overflow-hidden rounded-md bg-primary px-3 py-1.5 text-xs text-primary-foreground",
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
