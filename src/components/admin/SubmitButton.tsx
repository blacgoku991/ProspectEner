"use client";

import { Loader2 } from "lucide-react";
import { useFormStatus } from "react-dom";
import { cn } from "@/lib/cn";

export function SubmitButton({ children, className, variant = "primary", confirm }: { children: React.ReactNode; className?: string; variant?: "primary" | "ghost" | "danger" | "dark"; confirm?: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      onClick={(e) => {
        if (confirm && !window.confirm(confirm)) e.preventDefault();
      }}
      className={cn(
        variant === "primary" && "btn-primary",
        variant === "ghost" && "btn-ghost",
        variant === "dark" && "btn-dark",
        variant === "danger" && "btn bg-red-600 text-white hover:bg-red-700",
        className,
      )}
    >
      {pending && <Loader2 className="size-4 animate-spin" aria-hidden />}
      {children}
    </button>
  );
}
