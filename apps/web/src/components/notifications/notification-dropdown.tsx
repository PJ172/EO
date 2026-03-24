"use client";

import { useEffect, useState } from "react";
import { useSocket } from "@/components/providers/socket-provider";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "@/components/ui/toaster";

interface Notification {
    id: string;
    title: string;
    message: string;
    createdAt: string;
    isRead: boolean;
}

export function NotificationDropdown() {
    const { socket, isConnected } = useSocket();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);

    useEffect(() => {
        if (!socket) return;

        // Listen for new notifications
        socket.on("notification", (data: any) => {
            console.log("New notification:", data);

            const newNotif: Notification = {
                id: Date.now().toString(), // Temp ID
                title: data.title || "Thông báo mới",
                message: data.message || "Bạn có thông báo mới",
                createdAt: new Date().toISOString(),
                isRead: false,
            };

            setNotifications((prev) => [newNotif, ...prev]);
            setUnreadCount((prev) => prev + 1);

            toast(newNotif.title, {
                description: newNotif.message,
            });
        });

        return () => {
            socket.off("notification");
        };
    }, [socket]);

    const markAllRead = () => {
        setUnreadCount(0);
        setNotifications((prev) => prev.map(n => ({ ...n, isRead: true })));
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] text-white">
                            {unreadCount}
                        </span>
                    )}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
                <DropdownMenuLabel className="flex justify-between items-center">
                    <span>Thông báo ({isConnected ? "Online" : "Offline"})</span>
                    {unreadCount > 0 && (
                        <span
                            className="text-xs text-primary cursor-pointer hover:underline"
                            onClick={markAllRead}
                        >
                            Đã đọc tất cả
                        </span>
                    )}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <div className="max-h-[300px] overflow-y-auto">
                    {notifications.length === 0 ? (
                        <div className="p-4 text-center text-sm text-muted-foreground">
                            Không có thông báo mới
                        </div>
                    ) : (
                        notifications.map((notif) => (
                            <DropdownMenuItem key={notif.id} className="flex flex-col items-start p-3 cursor-pointer">
                                <div className="flex w-full justify-between gap-2">
                                    <span className={`font-medium ${!notif.isRead ? "text-primary" : ""}`}>
                                        {notif.title}
                                    </span>
                                    {!notif.isRead && <span className="h-2 w-2 rounded-full bg-blue-500 mt-1" />}
                                </div>
                                <p className="text-sm text-muted-foreground line-clamp-2">
                                    {notif.message}
                                </p>
                                <span className="text-xs text-muted-foreground mt-1">
                                    Vừa xong
                                </span>
                            </DropdownMenuItem>
                        ))
                    )}
                </div>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
