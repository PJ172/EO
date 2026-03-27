import * as React from "react"
import Link from "next/link"
import { ArrowLeft, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface PageHeaderProps {
    title: string | React.ReactNode;
    description?: string | React.ReactNode;
    backHref?: string;
    onBack?: () => void;
    icon?: React.ReactNode;
    actions?: React.ReactNode;
    className?: string;
}

export function PageHeader({
    title,
    description,
    backHref,
    onBack,
    icon,
    actions,
    className
}: PageHeaderProps) {
    return (
        <div className={cn("relative rounded-2xl overflow-hidden bg-card/60 backdrop-blur-xl border border-white/20 dark:border-white/5 shadow-lg mb-2 group/header", className)}>
            <div className="absolute inset-0 bg-gradient-to-r from-blue-600/8 via-blue-400/5 to-transparent pointer-events-none" />

            <div className="relative p-3 md:px-4 md:py-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-4 sm:gap-6">
                    {/* Back button */}
                    {(backHref || onBack) && (
                        <Button
                            variant="outline"
                            size="icon"
                            className="h-10 w-10 shrink-0 rounded-full bg-background/50 hover:bg-background/80 shadow-sm border-slate-200/60 dark:border-slate-800/60"
                            asChild={!!backHref}
                            onClick={onBack}
                            type="button"
                        >
                            {backHref ? (
                                <Link href={backHref}><ArrowLeft className="h-5 w-5 text-muted-foreground" /></Link>
                            ) : (
                                <ArrowLeft className="h-5 w-5 text-muted-foreground" />
                            )}
                        </Button>
                    )}

                    {/* Optional Icon/Avatar or Default Icon */}
                    <div className="shrink-0">
                        {icon ? icon : (
                            <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-sm">
                                <div className="h-5 w-5 sm:h-6 sm:w-6 bg-white/20 rounded-md backdrop-blur-sm" />
                            </div>
                        )}
                    </div>

                    {/* Text block */}
                    <div>
                        <h2 className="text-lg sm:text-xl font-bold tracking-tight text-slate-800 dark:text-slate-100">
                            {title}
                        </h2>
                        {description && (
                            <p className="text-sm font-medium text-muted-foreground mt-1 tracking-wide">
                                {description}
                            </p>
                        )}
                    </div>
                </div>

                {/* Actions (typically Cancel/Save buttons) */}
                {actions && (
                    <div className="hidden md:flex flex-col items-end gap-1.5 self-center">
                        <div className="flex gap-2">
                            {actions}
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
