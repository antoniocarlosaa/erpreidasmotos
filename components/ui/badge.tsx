import * as React from "react";
import { cn } from "./button";

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?:
    | "default"
    | "secondary"
    | "outline"
    | "destructive"
    | "buyer"
    | "seller"
    | "finalizing"
    | "despachante"
    | "payment"
    | "transferring"
    | "doc"
    | "completed";
}

function Badge({ className, variant = "default", ...props }: BadgeProps) {
  const baseStyles =
    "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2";
  
  const variants = {
    default: "border-transparent bg-primary text-primary-foreground shadow hover:bg-primary/80",
    secondary: "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
    outline: "text-foreground",
    destructive: "border-transparent bg-destructive text-destructive-foreground shadow hover:bg-destructive/80",
    
    // Status custom colors defined in globals.css
    buyer: "border-transparent bg-status-buyer/15 text-status-buyer border border-status-buyer/30",
    seller: "border-transparent bg-status-seller/15 text-status-seller border border-status-seller/30",
    finalizing: "border-transparent bg-status-finalizing/15 text-status-finalizing border border-status-finalizing/30",
    despachante: "border-transparent bg-status-despachante/15 text-status-despachante border border-status-despachante/30",
    payment: "border-transparent bg-status-payment/15 text-status-payment border border-status-payment/30",
    transferring: "border-transparent bg-status-transferring/15 text-status-transferring border border-status-transferring/30",
    doc: "border-transparent bg-status-doc/15 text-status-doc border border-status-doc/30",
    completed: "border-transparent bg-status-completed/15 text-status-completed border border-status-completed/30",
  };

  return (
    <div className={cn(baseStyles, variants[variant], className)} {...props} />
  );
}

export { Badge };
export type { BadgeProps as BadgeComponentProps };
