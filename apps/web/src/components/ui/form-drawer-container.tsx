"use client";

import * as React from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

interface FormDrawerContainerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
  size?: "sm" | "md" | "lg" | "xl" | "2xl" | "3xl";
}

export function FormDrawerContainer({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  className,
  size = "md",
}: FormDrawerContainerProps) {
  // Map sizes to max-width classes for responsiveness
  const sizeClasses = {
    sm: "sm:max-w-sm", // 384px
    md: "sm:max-w-md", // 448px
    lg: "sm:max-w-lg", // 512px
    xl: "sm:max-w-xl", // 576px
    "2xl": "sm:max-w-2xl", // 672px
    "3xl": "sm:max-w-3xl", // 768px
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className={cn(
          "flex flex-col h-full p-0 gap-0 w-full border-l border-slate-200/60 dark:border-slate-800/60",
          sizeClasses[size],
          className
        )}
      >
        <SheetHeader className="p-6 border-b border-slate-100 dark:border-slate-900 bg-slate-50/50 dark:bg-slate-950/20">
          <SheetTitle className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            {title}
          </SheetTitle>
          {description && (
            <SheetDescription className="text-slate-500 text-sm font-medium mt-1">
              {description}
            </SheetDescription>
          )}
        </SheetHeader>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {children}
        </div>

        {footer && (
          <SheetFooter className="p-6 border-t border-slate-100 dark:border-slate-900 bg-background flex flex-col sm:flex-row gap-3">
            {footer}
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  );
}
