"use client";

import { Toaster as SonnerToaster } from "sonner";

export function Toaster() {
    return (
        <SonnerToaster
            position="top-center"
            toastOptions={{
                duration: 4000,
                classNames: {
                    toast:
                        "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
                    description: "group-[.toast]:text-muted-foreground",
                    actionButton:
                        "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
                    cancelButton:
                        "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
                    success:
                        "group-[.toaster]:bg-success/10 group-[.toaster]:text-success group-[.toaster]:border-success/30",
                    error:
                        "group-[.toaster]:bg-destructive/10 group-[.toaster]:text-destructive group-[.toaster]:border-destructive/30",
                    warning:
                        "group-[.toaster]:bg-warning/10 group-[.toaster]:text-warning group-[.toaster]:border-warning/30",
                    info: "group-[.toaster]:bg-info/10 group-[.toaster]:text-info group-[.toaster]:border-info/30",
                },
            }}
            richColors
            closeButton
        />
    );
}

// Re-export toast functions for easy access
export { toast } from "sonner";
