import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-poker-gold focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-gradient-gold text-poker-charcoal font-semibold shadow-gold hover:shadow-gold-intense hover:scale-105 transition-all duration-300",
        destructive: "bg-poker-ruby text-poker-cream hover:bg-poker-ruby/90 shadow-card",
        outline: "border border-poker-border bg-poker-surface hover:bg-poker-surface-elevated hover:border-poker-gold transition-all duration-300",
        secondary: "bg-gradient-steel text-poker-cream hover:shadow-elegant transition-all duration-300",
        ghost: "hover:bg-poker-surface-elevated hover:text-poker-gold transition-all duration-300",
        link: "text-poker-gold underline-offset-4 hover:underline hover:text-poker-gold-light",
        luxury: "bg-gradient-royal text-poker-cream font-bold shadow-elegant hover:shadow-dramatic hover:scale-105 transition-all duration-500",
        emerald: "bg-gradient-emerald text-poker-cream font-semibold shadow-emerald hover:shadow-floating hover:scale-105 transition-all duration-300",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
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
