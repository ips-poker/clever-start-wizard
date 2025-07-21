import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-semibold ring-offset-background transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-gradient-button text-poker-text-inverse hover:bg-gradient-button-hover shadow-card hover:shadow-elevated hover:scale-[1.02] active:scale-[0.98]",
        destructive:
          "bg-poker-error text-poker-text-inverse hover:bg-poker-error/90 shadow-card hover:shadow-elevated",
        outline:
          "border-2 border-poker-border bg-poker-surface hover:bg-poker-surface-elevated hover:border-poker-accent shadow-minimal hover:shadow-subtle",
        secondary:
          "bg-poker-surface-elevated text-poker-text-primary hover:bg-poker-secondary shadow-minimal hover:shadow-subtle",
        ghost: "hover:bg-poker-surface-elevated hover:text-poker-text-primary",
        link: "text-poker-accent underline-offset-4 hover:underline font-medium",
        premium: "bg-poker-accent text-poker-text-inverse shadow-subtle hover:shadow-card hover:scale-[1.02] active:scale-[0.98] font-bold hover:bg-poker-accent-dark",
        accent: "bg-poker-accent text-poker-text-inverse shadow-subtle hover:shadow-card hover:scale-[1.02] active:scale-[0.98] hover:bg-poker-accent-dark",
        success: "bg-poker-success text-poker-text-inverse shadow-subtle hover:shadow-card hover:scale-[1.02] active:scale-[0.98] hover:bg-poker-success/90",
        elegant: "bg-poker-surface border border-poker-border text-poker-text-primary hover:bg-poker-surface-elevated hover:border-poker-accent shadow-card hover:shadow-elevated backdrop-blur-xl",
      },
      size: {
        default: "h-11 px-6 py-2.5",
        sm: "h-9 rounded-md px-4 text-xs",
        lg: "h-12 rounded-xl px-8 text-base",
        xl: "h-14 rounded-xl px-10 text-lg",
        icon: "h-11 w-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
