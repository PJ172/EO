"use client";

import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { ThemeSwitch } from "@/components/layout/theme-switch";
import { NotificationDropdown } from "@/components/notifications/notification-dropdown";

interface AppHeaderProps {
    title?: string;
    children?: React.ReactNode;
}

export function AppHeader({ title, children }: AppHeaderProps) {
    return (
        <header className="flex h-16 shrink-0 items-center gap-2 bg-transparent px-4 transition-all duration-300">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />

            {title && (
                <h1 className="text-lg font-semibold tracking-tight">{title}</h1>
            )}

            <div className="flex-1">{children}</div>

            <div className="flex items-center gap-2">
                {/* Notifications */}
                <NotificationDropdown />

                {/* Theme Switch */}
                <ThemeSwitch />
            </div>
        </header>
    );
}
