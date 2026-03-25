import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { RotateCw, ArrowLeft } from "lucide-react";
import Link from "next/link";

interface PageHeaderProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
    title: React.ReactNode;
    description?: string;
    search?: React.ReactNode;
    filter?: React.ReactNode;
    pills?: React.ReactNode;
    children?: React.ReactNode;
    actions?: React.ReactNode;
    onRefresh?: () => void;
    isRefreshing?: boolean;
    refreshLabel?: string;
    backHref?: string;
    backLabel?: string;
    icon?: React.ReactNode;
    showRefreshIconOnly?: boolean;
    titleClassName?: string;
}

export function PageHeader({
    title,
    description,
    search,
    filter,
    pills,
    children,
    actions,
    onRefresh,
    isRefreshing,
    refreshLabel,
    backHref,
    backLabel,
    icon,
    showRefreshIconOnly = false,
    titleClassName,
    className,
    ...props
}: PageHeaderProps) {
    return (
        <div className={cn("flex flex-col gap-4 md:flex-row md:items-center md:justify-between py-0 mb-2", className)} {...props}>
            <div className="flex flex-col md:flex-row md:items-center gap-4 flex-1 min-w-0">
                <div className="flex items-center gap-3 shrink-0">
                    {backHref && (
                        <Button
                            variant="ghost"
                            size="icon"
                            asChild
                            className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground"
                            title={backLabel || "Quay lại"}
                        >
                            <Link href={backHref}>
                                <ArrowLeft className="h-4 w-4" />
                            </Link>
                        </Button>
                    )}
                    {icon && (
                        <div className="shrink-0 flex items-center justify-center">
                            {icon}
                        </div>
                    )}
                    <div className="space-y-0.5 h-full flex flex-col justify-center overflow-hidden">
                        <h2 className={cn("text-xl sm:text-2xl font-bold tracking-tight bg-gradient-to-r from-slate-600 to-slate-800 dark:from-slate-300 dark:to-slate-100 bg-clip-text text-transparent leading-none py-1 truncate", titleClassName)}>{title}</h2>
                        {description && (
                            <p className="text-[11px] sm:text-xs text-muted-foreground truncate">
                                {description}
                            </p>
                        )}
                    </div>
                </div>
                {search && (
                    <div className="w-full max-w-xs min-w-0">
                        {search}
                    </div>
                )}
                {pills && (
                    <div className="flex items-center gap-1.5 flex-1 min-w-0 overflow-x-auto no-scrollbar py-0.5">
                        {pills}
                    </div>
                )}
                {filter && (
                    <div className="shrink-0">
                        {filter}
                    </div>
                )}
                {(children || actions || onRefresh) && (
                    <div className="flex items-center gap-2 shrink-0 ml-auto">
                        {children}
                        {actions}
                        {onRefresh && (
                            <Button
                                variant="outline"
                                size={refreshLabel && !showRefreshIconOnly ? "sm" : "icon"}
                                onClick={onRefresh}
                                disabled={isRefreshing}
                                className={cn(
                                    "shrink-0 bg-white/80 backdrop-blur-sm border-border/50 hover:bg-slate-100 transition-all rounded-lg shadow-sm text-foreground",
                                    refreshLabel && !showRefreshIconOnly ? "h-9 px-4 font-semibold gap-2" : "h-9 w-9"
                                )}
                                title={refreshLabel && !showRefreshIconOnly ? undefined : "Làm mới dữ liệu"}
                            >
                                <RotateCw className={cn("h-4 w-4 text-emerald-600", isRefreshing && "animate-spin", refreshLabel && !showRefreshIconOnly && "mr-0")} />
                                {refreshLabel && !showRefreshIconOnly && <span>{refreshLabel}</span>}
                            </Button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
