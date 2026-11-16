import * as React from "react";
import { cn } from "@/lib/utils";
export function Input({ className, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      className={cn(
        "flex h-14 w-full min-w-0 rounded-lg border border-input bg-transparent px-3 text-base outline-none transition-shadow placeholder:text-slate-400 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/15 aria-invalid:border-red-500 aria-invalid:ring-red-100 disabled:opacity-60",
        className,
      )}
      {...props}
    />
  );
}
