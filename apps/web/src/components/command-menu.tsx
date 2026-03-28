"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
    Building2,
    LayoutDashboard,
    LogOut,
    Moon,
    Sun,
    Users,
    Factory,
    Briefcase,
    FolderKanban,
    CalendarDays,
    DoorOpen,
    FileText,
    Car,
    Settings
} from "lucide-react";

import {
    CommandDialog,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
    CommandSeparator,
} from "@/components/ui/command";
import { useLogout } from "@/services/auth.service";

export function CommandMenu() {
    const [open, setOpen] = React.useState(false);
    const router = useRouter();
    const logoutMutation = useLogout();

    React.useEffect(() => {
        const down = (e: KeyboardEvent) => {
            if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                setOpen((open) => !open);
            }
        };

        const openHandler = () => setOpen(true);

        document.addEventListener("keydown", down);
        document.addEventListener("open-command-menu", openHandler);

        return () => {
            document.removeEventListener("keydown", down);
            document.removeEventListener("open-command-menu", openHandler);
        };
    }, []);

    const runCommand = React.useCallback((command: () => unknown) => {
        setOpen(false);
        command();
    }, []);

    const handleThemeChange = (theme: "light" | "dark") => {
        runCommand(() => {
            const root = document.documentElement;
            root.classList.remove("light", "dark");
            root.classList.add(theme);
            localStorage.setItem("theme", theme);
        });
    };

    const handleLogout = () => {
        runCommand(() => {
            logoutMutation.mutate(undefined, {
                onSettled: () => {
                    router.push("/login");
                },
            });
        });
    };

    return (
        <CommandDialog open={open} onOpenChange={setOpen}>
            <CommandInput placeholder="Nhập lệnh hoặc tìm kiếm..." />
            <CommandList>
                <CommandEmpty>Không tìm thấy kết quả.</CommandEmpty>
                <CommandGroup heading="Liên kết nhanh">
                    <CommandItem onSelect={() => runCommand(() => router.push("/general/dashboard"))}>
                        <LayoutDashboard className="mr-2 h-4 w-4" />
                        <span>Tổng quan</span>
                    </CommandItem>
                    <CommandItem onSelect={() => runCommand(() => router.push("/hr/org-chart"))}>
                        <FolderKanban className="mr-2 h-4 w-4" />
                        <span>Sơ đồ tổ chức</span>
                    </CommandItem>
                    <CommandItem onSelect={() => runCommand(() => router.push("/hr/employees"))}>
                        <Users className="mr-2 h-4 w-4" />
                        <span>Nhân viên</span>
                    </CommandItem>
                    <CommandItem onSelect={() => runCommand(() => router.push("/hr/tasks"))}>
                        <Briefcase className="mr-2 h-4 w-4" />
                        <span>Công việc</span>
                    </CommandItem>
                    <CommandItem onSelect={() => runCommand(() => router.push("/iso/documents"))}>
                        <FileText className="mr-2 h-4 w-4" />
                        <span>Tài liệu</span>
                    </CommandItem>
                    <CommandItem onSelect={() => runCommand(() => router.push("/general/news"))}>
                        <FileText className="mr-2 h-4 w-4" />
                        <span>Tin tức</span>
                    </CommandItem>
                </CommandGroup>
                <CommandSeparator />
                <CommandGroup heading="Hành chính & CNTT">
                    <CommandItem onSelect={() => runCommand(() => router.push("/ga/meetings"))}>
                        <DoorOpen className="mr-2 h-4 w-4" />
                        <span>Phòng họp</span>
                    </CommandItem>
                    <CommandItem onSelect={() => runCommand(() => router.push("/ga/cars"))}>
                        <Car className="mr-2 h-4 w-4" />
                        <span>Đặt xe</span>
                    </CommandItem>
                    <CommandItem onSelect={() => runCommand(() => router.push("/cntt/it-ticket"))}>
                        <Briefcase className="mr-2 h-4 w-4" />
                        <span>IT Ticket</span>
                    </CommandItem>
                    <CommandItem onSelect={() => runCommand(() => router.push("/cntt/it-assets"))}>
                        <Briefcase className="mr-2 h-4 w-4" />
                        <span>Thiết bị CNTT</span>
                    </CommandItem>
                </CommandGroup>
                <CommandSeparator />
                <CommandGroup heading="Cài đặt">
                    <CommandItem onSelect={() => runCommand(() => router.push("/settings/companies"))}>
                        <Building2 className="mr-2 h-4 w-4" />
                        <span>Công ty</span>
                    </CommandItem>
                    <CommandItem onSelect={() => runCommand(() => router.push("/settings/factories"))}>
                        <Factory className="mr-2 h-4 w-4" />
                        <span>Nhà máy</span>
                    </CommandItem>
                    <CommandItem onSelect={() => runCommand(() => router.push("/settings/departments"))}>
                        <Building2 className="mr-2 h-4 w-4" />
                        <span>Phòng ban</span>
                    </CommandItem>
                    <CommandItem onSelect={() => runCommand(() => router.push("/settings/divisions"))}>
                        <Building2 className="mr-2 h-4 w-4" />
                        <span>Khối</span>
                    </CommandItem>
                    <CommandItem onSelect={() => runCommand(() => router.push("/settings/sections"))}>
                        <Building2 className="mr-2 h-4 w-4" />
                        <span>Bộ phận</span>
                    </CommandItem>
                    <CommandItem onSelect={() => runCommand(() => router.push("/settings/job-titles"))}>
                        <Briefcase className="mr-2 h-4 w-4" />
                        <span>Chức danh</span>
                    </CommandItem>
                </CommandGroup>
                <CommandSeparator />
                <CommandGroup heading="Hệ thống">
                    <CommandItem onSelect={() => handleThemeChange("light")}>
                        <Sun className="mr-2 h-4 w-4" />
                        <span>Giao diện Sáng</span>
                    </CommandItem>
                    <CommandItem onSelect={() => handleThemeChange("dark")}>
                        <Moon className="mr-2 h-4 w-4" />
                        <span>Giao diện Tối</span>
                    </CommandItem>
                    <CommandItem onSelect={() => runCommand(() => router.push("/settings"))}>
                        <Settings className="mr-2 h-4 w-4" />
                        <span>Cài đặt</span>
                    </CommandItem>
                    <CommandItem onSelect={() => handleLogout()}>
                        <LogOut className="mr-2 h-4 w-4" />
                        <span>Đăng xuất</span>
                    </CommandItem>
                </CommandGroup>
            </CommandList>
        </CommandDialog>
    );
}
