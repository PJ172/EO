import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { LucideIcon, TrendingUp, TrendingDown, Minus } from "lucide-react";

interface StatsCardProps {
    title: string;
    value: string | number;
    icon: LucideIcon;
    change?: string | number;
    changeLabel?: string;
    trend?: "up" | "down" | "neutral";
    className?: string;
    iconColor?: string;
    iconBgColor?: string;
    delay?: number; // Animation delay in ms
}

export function StatsCard({
    title,
    value,
    icon: Icon,
    change,
    changeLabel,
    trend = "neutral",
    className,
    iconColor = "text-primary",
    iconBgColor = "bg-primary/10",
    delay = 0,
}: StatsCardProps) {
    return (
        <Card
            className={cn(
                "relative overflow-hidden glass-card animate-scale-in group",
                className
            )}
            style={{ animationDelay: `${delay}ms`, animationFillMode: 'both' }}
        >
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium text-muted-foreground truncate pr-4">
                    {title}
                </CardTitle>
                <div className={cn("p-2 rounded-xl transition-all duration-300 group-hover:scale-110 group-hover:shadow-sm", iconBgColor)}>
                    <Icon className={cn("h-4 w-4", iconColor)} />
                </div>
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold tracking-tight">{value}</div>
                {(change || changeLabel) && (
                    <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5">
                        {trend === "up" && <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />}
                        {trend === "down" && <TrendingDown className="h-3.5 w-3.5 text-rose-500" />}
                        {trend === "neutral" && <Minus className="h-3.5 w-3.5 text-muted-foreground" />}

                        <span className={cn(
                            "font-medium",
                            trend === "up" && "text-emerald-500",
                            trend === "down" && "text-rose-500",
                            trend === "neutral" && "text-muted-foreground"
                        )}>
                            {change}
                        </span>
                        <span className="opacity-80">{changeLabel}</span>
                    </p>
                )}

                {/* Decorative background element */}
                <div className="absolute -bottom-4 -right-4 h-24 w-24 rounded-full bg-gradient-to-br from-primary/5 to-transparent blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
            </CardContent>
        </Card>
    );
}

export default StatsCard;
