import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"
import { motion, type HTMLMotionProps } from "motion/react"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:aria-invalid:border-destructive/50 rounded-md border border-transparent bg-clip-padding text-sm font-medium focus-visible:ring-3 aria-invalid:ring-3 [&_svg:not([class*='size-'])]:size-4 inline-flex items-center justify-center whitespace-nowrap transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none shrink-0 [&_svg]:shrink-0 outline-none group/button select-none",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/80",
        outline: "border-border bg-background hover:bg-muted hover:text-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50 aria-expanded:bg-muted aria-expanded:text-foreground shadow-xs",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80 aria-expanded:bg-secondary aria-expanded:text-secondary-foreground",
        ghost: "hover:bg-muted hover:text-foreground dark:hover:bg-muted/50 aria-expanded:bg-muted aria-expanded:text-foreground",
        destructive: "bg-destructive/10 hover:bg-destructive/20 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/20 text-destructive focus-visible:border-destructive/40 dark:hover:bg-destructive/30",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 gap-1.5 px-2.5 in-data-[slot=button-group]:rounded-md has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
        xs: "h-6 gap-1 rounded-[min(var(--radius-md),8px)] px-2 text-xs in-data-[slot=button-group]:rounded-md has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-8 gap-1 rounded-[min(var(--radius-md),10px)] px-2.5 in-data-[slot=button-group]:rounded-md has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5",
        lg: "h-10 gap-1.5 px-2.5 has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3",
        icon: "size-9",
        "icon-xs": "size-6 rounded-[min(var(--radius-md),8px)] in-data-[slot=button-group]:rounded-md [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-8 rounded-[min(var(--radius-md),10px)] in-data-[slot=button-group]:rounded-md",
        "icon-lg": "size-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

const MotionButtonPrimitive = motion.create(ButtonPrimitive)

type ButtonProps = ButtonPrimitive.Props &
  VariantProps<typeof buttonVariants> & {
    /** Opt out of the built-in press/hover scale animation. */
    disableMotion?: boolean
    /** Override the default press animation props (whileHover, whileTap, transition). */
    motionProps?: Pick<HTMLMotionProps<"button">, "whileHover" | "whileTap" | "transition">
  }

const defaultMotionProps = {
  whileHover: { scale: 1.05 },
  whileTap: { scale: 0.9 },
  transition: { type: "tween" as const, duration: 0.12, ease: [0.2, 0, 0, 1] as [number, number, number, number] },
} satisfies Pick<HTMLMotionProps<"button">, "whileHover" | "whileTap" | "transition">

/**
 * @description Site-wide Button. Wraps the base-ui Button primitive with
 * motion-driven hover and press feedback so clicks feel responsive. Opt
 * out per-instance with `disableMotion`, or override timing via
 * `motionProps`.
 *
 * @param props - Button props, including optional motion overrides
 * @returns The animated button element
 */
function Button({
  className,
  variant = "default",
  size = "default",
  disableMotion = false,
  motionProps,
  ...props
}: ButtonProps) {
  if (disableMotion) {
    return (
      <ButtonPrimitive
        data-slot="button"
        className={cn(buttonVariants({ variant, size, className }))}
        {...props}
      />
    )
  }
  // base-ui typings for onAnimationStart/onDrag*/onPan* collide with motion's
  // lifecycle-style variants. At runtime the handlers are forwarded to the
  // DOM as-is and behave correctly; cast through unknown to resolve the
  // purely-structural type clash.
  const MotionAny = MotionButtonPrimitive as unknown as React.ComponentType<
    ButtonPrimitive.Props & typeof defaultMotionProps & { "data-slot"?: string }
  >
  return (
    <MotionAny
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...defaultMotionProps}
      {...(motionProps as typeof defaultMotionProps)}
      {...props}
    />
  )
}

export { Button, buttonVariants }
