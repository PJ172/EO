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
                    <CommandItem onSelect={() => runCommand(() => router.push("/dashboard"))}>
                        <LayoutDashboard className="mr-2 h-4 w-4" />
                        <span>Dashboard</span>
                    </CommandItem>
                    <CommandItem onSelect={() => runCommand(() => router.push("/org-chart"))}>
                        <FolderKanban className="mr-2 h-4 w-4" />
                        <span>Sơ đồ tổ chức</span>
                    </CommandItem>
                    <CommandItem onSelect={() => runCommand(() => router.push("/employees"))}>
                        <Users className="mr-2 h-4 w-4" />
                        <span>Nhân viên</span>
                    </CommandItem>
                    <CommandItem onSelect={() => runCommand(() => router.push("/factories"))}>
                        <Factory className="mr-2 h-4 w-4" />
                        <span>Nhà máy</span>
                    </CommandItem>
                    <CommandItem onSelect={() => runCommand(() => router.push("/companies"))}>
                        <Building2 className="mr-2 h-4 w-4" />
                        <span>Công ty</span>
                    </CommandItem>
                    <CommandItem onSelect={() => runCommand(() => router.push("/divisions"))}>
                        <Building2 className="mr-2 h-4 w-4" />
                        <span>Khối (Division)</span>
                    </CommandItem>
                    <CommandItem onSelect={() => runCommand(() => router.push("/departments"))}>
                        <Building2 className="mr-2 h-4 w-4" />
                        <span>Phòng ban</span>
                    </CommandItem>
                    <CommandItem onSelect={() => runCommand(() => router.push("/sections"))}>
                        <Building2 className="mr-2 h-4 w-4" />
                        <span>Bộ phận</span>
                    </CommandItem>
                    <CommandItem onSelect={() => runCommand(() => router.push("/job-titles"))}>
                        <Briefcase className="mr-2 h-4 w-4" />
                        <span>Chức vụ</span>
                    </CommandItem>
                </CommandGroup>
                <CommandSeparator />
                <CommandGroup heading="Quy trình & Khác">
                    <CommandItem onSelect={() => runCommand(() => router.push("/requests"))}>
                        <FileText className="mr-2 h-4 w-4" />
                        <span>Tờ trình</span>
                    </CommandItem>
                    <CommandItem onSelect={() => runCommand(() => router.push("/leaves"))}>
                        <CalendarDays className="mr-2 h-4 w-4" />
                        <span>Nghỉ phép</span>
                    </CommandItem>
                    <CommandItem onSelect={() => runCommand(() => router.push("/bookings"))}>
                        <DoorOpen className="mr-2 h-4 w-4" />
                        <span>Phòng họp</span>
                    </CommandItem>
                    <CommandItem onSelect={() => runCommand(() => router.push("/cars"))}>
                        <Car className="mr-2 h-4 w-4" />
                        <span>Đặt xe</span>
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
