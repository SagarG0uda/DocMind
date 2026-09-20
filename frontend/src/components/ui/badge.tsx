import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-purple-600 text-white shadow hover:bg-purple-700",
        secondary: "border-transparent bg-purple-100 text-purple-900 hover:bg-purple-200",
        destructive: "border-transparent bg-red-600 text-white shadow hover:bg-red-700",
        outline: "text-stone-950 border-purple-200",
        success: "border-transparent bg-emerald-100 text-emerald-900 border-emerald-300",
        warning: "border-transparent bg-amber-100 text-amber-900 border-amber-300",
        citation: "border-purple-300 bg-purple-50 text-purple-800 font-mono hover:bg-purple-200 hover:border-purple-400 cursor-pointer shadow-sm",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
