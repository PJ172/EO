
"use client";

import { useLogout } from "@/services/auth.service";
import { useAuth } from "@/contexts/auth-context";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarRail,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getAvatarUrl } from "@/lib/avatar-utils";
import { EmployeeAvatar } from "@/components/ui/employee-avatar";
import { SunplastLogo, SunplastLogoIcon } from "@/components/ui/sunplast-logo";
import { PermissionGate, usePermissionCheck } from "@/components/auth/permission-gate";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    LayoutDashboard,
    Users,
    Building2,
    FileText,
    DoorOpen,
    Settings,
    LogOut,
    ChevronUp,
    Search,
    Briefcase,
    FolderKanban,
    Activity,
    Factory,
    BadgeCheck,
    Monitor,
    Headphones,
    GitMerge,
    Trash2,
    CarFront,
    Ticket,
    HardDrive,
    BarChart3,
} from "lucide-react";

type MenuItem = {
    code?: string; // Unique identifier for visibility config
    title: string;
    url: string;
    icon?: any;
    permissions?: string[];
    items?: MenuItem[]; // Support for sub-menus
};

type MenuGroup = {
    title: string;
    items: MenuItem[];
};

const menuItems: MenuGroup[] = [
    {
        title: "Cài đặt Hệ thống",
        items: [
            {
                title: "Cài đặt",
                url: "/settings",
                icon: Settings,
                permissions: ["SETTINGS_VIEW", "SETTINGS_MANAGE"]
            },
        ],
    },
    {
        title: "Chung",
        items: [
            {
                title: "Tổng quan",
                url: "/general/dashboard",
                icon: LayoutDashboard,
            },
            {
                title: "Tin tức",
                url: "/general/news",
                icon: FileText,
                permissions: ["NEWS_READ"],
                code: "NEWS"
            },
        ],
    },
    {
        title: "Nhân sự",
        items: [
            {
                title: "Nhân viên",
                url: "/hr/employees",
                icon: Users,
                permissions: ["EMPLOYEE_READ"],
                code: "EMPLOYEES"
            },
            {
                title: "Sơ đồ tổ chức",
                url: "/hr/org-chart",
                icon: FolderKanban,
                permissions: ["ORGCHART_VIEW"],
                code: "ORGCHART"
            },
            {
                title: "Công việc",
                url: "/hr/tasks",
                icon: Briefcase,
                permissions: ["TASK_READ"],
                code: "TASKS"
            },
        ],
    },
    {
        title: "Hành chính",
        items: [
            {
                title: "Phòng họp",
                url: "/ga/meetings",
                icon: DoorOpen,
                permissions: ["ROOM_VIEW"],
                code: "MEETING"
            },
            {
                title: "Đặt xe",
                url: "/ga/cars",
                icon: CarFront,
                permissions: ["CAR_READ"],
                code: "CARS"
            },
        ],
    },
    {
        title: "ISO",
        items: [
            {
                title: "Tài liệu",
                url: "/iso/documents",
                icon: FileText,
                permissions: ["DOCUMENT_READ"],
                code: "DOCUMENTS"
            },
        ],
    },
    {
        title: "CNTT",
        items: [
            {
                title: "Tổng quan",
                url: "/cntt",
                icon: LayoutDashboard,
                permissions: ["ASSET_VIEW"],
                code: "IT_DASHBOARD"
            },
            {
                title: "Thiết bị",
                url: "/cntt/hardware",
                icon: Monitor,
                permissions: ["ASSET_VIEW"],
                code: "IT_ASSETS"
            },
            {
                title: "Phần mềm",
                url: "/cntt/software",
                icon: HardDrive,
                permissions: ["ASSET_VIEW"],
                code: "IT_SOFTWARE"
            },
            {
                title: "IT Helpdesk",
                url: "/cntt/helpdesk",
                icon: Ticket,
                permissions: ["TICKET_VIEW"],
                code: "IT_TICKETS"
            },
            {
                title: "Báo cáo",
                url: "/cntt/reports",
                icon: BarChart3,
                permissions: ["ASSET_VIEW"],
                code: "IT_REPORTS"
            },
        ],
    },

];

import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
    SidebarMenuSub,
    SidebarMenuSubButton,
    SidebarMenuSubItem,
    SidebarMenuButton as UIButton,
} from "@/components/ui/sidebar";
import { ChevronRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { useModuleVisibility } from "@/hooks/use-module-visibility";

export function AppSidebar() {
    const pathname = usePathname();
    const router = useRouter();
    const logoutMutation = useLogout();
    const { user } = useAuth();
    const { canAny } = usePermissionCheck();

    const displayName = user?.employee?.fullName || user?.username || "User";
    const displayEmail = user?.email || "";
    const initials = displayName.split(" ").map(n => n.charAt(0)).join("").substring(0, 2).toUpperCase();

    const handleLogout = () => {
        logoutMutation.mutate(undefined, {
            onSettled: () => {
                router.push("/login");
            },
        });
    };

    // --- Fetch Module Visibility Config ---
    const { isVisible } = useModuleVisibility();

    const isModuleVisible = (item: MenuItem) => {
        if (!item.code) return true;
        return isVisible(item.code);
    };

    return (
        <Sidebar collapsible="icon">
            <SidebarHeader className="border-b border-sidebar-border">
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link href="/general/dashboard" className="flex flex-col !items-start !py-3 gap-0.5">
                                <div className="flex items-center gap-1">
                                    <SunplastLogoIcon size={32} />
                                    <span className="font-extrabold text-[16px] tracking-tight group-data-[collapsible=icon]:hidden" style={{ color: '#1B3A8C' }}>
                                        plast
                                    </span>
                                </div>
                                <span className="text-[11px] font-bold tracking-wide group-data-[collapsible=icon]:hidden"
                                    style={{
                                        background: 'linear-gradient(90deg, #2563EB 0%, #0EA5E9 50%, #06B6D4 100%)',
                                        WebkitBackgroundClip: 'text',
                                        WebkitTextFillColor: 'transparent',
                                    }}
                                >
                                    eOffice
                                </span>
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent>
                {/* Search */}
                <SidebarGroup className="py-2">
                    <SidebarMenuButton
                        className="w-full justify-start gap-2 text-sidebar-foreground/70"
                        tooltip="Tìm kiếm"
                        onClick={() => document.dispatchEvent(new CustomEvent("open-command-menu"))}
                    >
                        <Search className="size-4" />
                        <span>Tìm kiếm...</span>
                        <kbd className="ml-auto pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border border-sidebar-border bg-sidebar-accent px-1.5 font-mono text-[10px] font-medium opacity-100">
                            <span className="text-xs">⌘</span>K
                        </kbd>
                    </SidebarMenuButton>
                </SidebarGroup>

                {/* Menu Groups */}
                {menuItems.map((group) => {
                    // Filter by permissions AND by module visibility config
                    const visibleItems = group.items.filter(item => {
                        // 1. Check module visibility (UI Setting)
                        if (!isModuleVisible(item)) return false;

                        // 2. Check permissions (Security)
                        if (!item.permissions || item.permissions.length === 0) return true;
                        return canAny(item.permissions);
                    });

                    if (visibleItems.length === 0) return null;

                    return (
                        <SidebarGroup key={group.title}>
                            <SidebarGroupLabel className="uppercase font-bold tracking-wider text-[0.7rem]">{group.title}</SidebarGroupLabel>
                            <SidebarGroupContent>
                                <SidebarMenu>
                                    {visibleItems.map((item) => {
                                        // Handle Sub-menus (Collapsible)
                                        if (item.items && item.items.length > 0) {
                                            const visibleSubItems = item.items.filter(subItem => {
                                                if (!subItem.permissions || subItem.permissions.length === 0) return true;
                                                return canAny(subItem.permissions);
                                            });

                                            if (visibleSubItems.length === 0) return null;

                                            const isActive = visibleSubItems.some(subItem => pathname === subItem.url || pathname.startsWith(`${subItem.url}/`));

                                            return (
                                                <Collapsible
                                                    key={item.title}
                                                    asChild
                                                    defaultOpen={isActive}
                                                    className="group/collapsible"
                                                >
                                                    <SidebarMenuItem>
                                                        <CollapsibleTrigger asChild>
                                                            <SidebarMenuButton tooltip={item.title}>
                                                                {item.icon && <item.icon className="size-4" />}
                                                                <span className="uppercase tracking-wide font-medium text-xs">{item.title}</span>
                                                                <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                                                            </SidebarMenuButton>
                                                        </CollapsibleTrigger>
                                                        <CollapsibleContent>
                                                            <SidebarMenuSub>
                                                                {visibleSubItems.map((subItem) => (
                                                                    <SidebarMenuSubItem key={subItem.title}>
                                                                        <SidebarMenuSubButton
                                                                            asChild
                                                                            isActive={pathname === subItem.url}
                                                                        >
                                                                            <Link href={subItem.url}>
                                                                                <span className="uppercase tracking-wide text-[0.7rem]">{subItem.title}</span>
                                                                            </Link>
                                                                        </SidebarMenuSubButton>
                                                                    </SidebarMenuSubItem>
                                                                ))}
                                                            </SidebarMenuSub>
                                                        </CollapsibleContent>
                                                    </SidebarMenuItem>
                                                </Collapsible>
                                            );
                                        }

                                        // Regular single item
                                        return (
                                            <SidebarMenuItem key={item.title}>
                                                <SidebarMenuButton
                                                    asChild
                                                    isActive={pathname === item.url || (item.url !== '/dashboard' && item.url !== '/cntt' && pathname.startsWith(item.url + '/'))}
                                                    tooltip={item.title}
                                                >
                                                    <Link href={item.url}>
                                                        {item.icon && <item.icon className="size-4" />}
                                                        <span className="uppercase tracking-wide font-medium text-xs">{item.title}</span>
                                                    </Link>
                                                </SidebarMenuButton>
                                            </SidebarMenuItem>
                                        );
                                    })}
                                </SidebarMenu>
                            </SidebarGroupContent>
                        </SidebarGroup>
                    );
                })}
            </SidebarContent>

            <SidebarFooter className="border-t border-sidebar-border">
                <SidebarMenu>
                    <SidebarMenuItem>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <SidebarMenuButton
                                    size="lg"
                                    className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                                >
                                    <EmployeeAvatar
                                        avatar={user?.employee?.avatar}
                                        fullName={displayName}
                                        className="h-8 w-8 rounded-lg"
                                        fallbackClassName="rounded-lg bg-primary text-primary-foreground"
                                    />
                                    <div className="grid flex-1 text-left text-sm leading-tight">
                                        <span className="truncate font-semibold">{displayName}</span>
                                        <span className="truncate text-xs text-sidebar-foreground/70">
                                            {displayEmail}
                                        </span>
                                    </div>
                                    <ChevronUp className="ml-auto size-4" />
                                </SidebarMenuButton>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                                className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
                                side="top"
                                align="end"
                                sideOffset={4}
                            >
                                <DropdownMenuItem asChild>
                                    <Link href="/profile" className="cursor-pointer flex items-center">
                                        <BadgeCheck className="mr-2 h-4 w-4" />
                                        <span>Trang cá nhân</span>
                                    </Link>
                                </DropdownMenuItem>

                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                    className="text-destructive focus:text-destructive cursor-pointer"
                                    onClick={handleLogout}
                                >
                                    <LogOut className="mr-2 h-4 w-4" />
                                    <span>Đăng xuất</span>
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarFooter>

            <SidebarRail />
        </Sidebar>
    );
}
