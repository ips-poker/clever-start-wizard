import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium ring-offset-background transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-poker-charcoal text-poker-cream hover:bg-poker-charcoal-light shadow-card hover:shadow-elegant",
        destructive: "bg-poker-red text-poker-cream hover:bg-poker-red/90 shadow-card",
        outline: "border-2 border-poker-steel bg-transparent text-poker-charcoal hover:bg-poker-steel hover:text-poker-cream shadow-subtle",
        secondary: "bg-poker-platinum text-poker-charcoal hover:bg-poker-platinum-light shadow-minimal",
        ghost: "hover:bg-poker-platinum/50 hover:text-poker-charcoal",
        link: "text-poker-charcoal underline-offset-4 hover:underline",
        premium: "bg-gradient-gold text-poker-charcoal font-semibold shadow-gold hover:shadow-elegant hover:scale-105",
      },
      size: {
        default: "h-11 px-6 py-3",
        sm: "h-9 rounded-md px-4 text-xs",
        lg: "h-13 rounded-lg px-10 py-4 text-base",
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
