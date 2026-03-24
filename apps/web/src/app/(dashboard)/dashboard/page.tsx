"use client";

import { getAvatarVariant } from "../../../lib/utils";
import { useAuth } from "@/contexts/auth-context";
import { AppHeader } from "@/components/layout/app-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getAvatarUrl } from "@/lib/avatar-utils";
import { StatsCard } from "@/components/dashboard/stats-card";
import {
    Users,
    FileText,
    CalendarDays,
    DoorOpen,
    Clock,
    CheckCircle2,
    AlertCircle,
    ArrowRight,
} from "lucide-react";

// Mock data
const stats = [
    {
        title: "Tổng nhân viên",
        value: "1,234",
        change: "+12",
        changeLabel: "trong tháng",
        icon: Users,
        trend: "up" as const,
        iconColor: "text-primary",
        iconBgColor: "bg-primary/10",
    },
    {
        title: "Đơn nghỉ phép chờ duyệt",
        value: "23",
        change: "5",
        changeLabel: "mới hôm nay",
        icon: CalendarDays,
        trend: "down" as const, // High pending is usually bad/attention needed, but for "new today" it's just a count. Let's use neutral or up. Actually "5 new" implies up.
        iconColor: "text-warning",
        iconBgColor: "bg-warning/10",
    },
    {
        title: "Phòng họp đang sử dụng",
        value: "3/8",
        change: "2",
        changeLabel: "sắp kết thúc",
        icon: DoorOpen,
        trend: "neutral" as const,
        iconColor: "text-success",
        iconBgColor: "bg-success/10",
    },
    {
        title: "Tài liệu mới ban hành",
        value: "7",
        change: "+3",
        changeLabel: "tuần này",
        icon: FileText,
        trend: "up" as const,
        iconColor: "text-info",
        iconBgColor: "bg-info/10",
    },
];

const pendingApprovals = [
    {
        id: 1,
        type: "leave",
        title: "Đơn xin nghỉ phép",
        requester: "Nguyễn Văn A",
        department: "IT",
        date: "15-17/01/2026",
        avatar: "/avatars/1.jpg",
        priority: "normal",
    },
    {
        id: 2,
        type: "leave",
        title: "Đơn xin nghỉ phép",
        requester: "Trần Thị B",
        department: "HR",
        date: "20/01/2026",
        avatar: "/avatars/2.jpg",
        priority: "urgent",
    },
    {
        id: 3,
        type: "booking",
        title: "Đặt phòng họp VIP",
        requester: "Lê Văn C",
        department: "Sales",
        date: "24/01/2026 14:00-16:00",
        avatar: "/avatars/3.jpg",
        priority: "normal",
    },
];

const todaySchedule = [
    {
        id: 1,
        time: "09:00 - 10:00",
        title: "Daily Standup",
        room: "Phòng họp A",
        status: "completed",
    },
    {
        id: 2,
        time: "10:30 - 11:30",
        title: "Review Sprint Planning",
        room: "Phòng họp B",
        status: "ongoing",
    },
    {
        id: 3,
        time: "14:00 - 15:00",
        title: "Phỏng vấn ứng viên",
        room: "Phòng họp C",
        status: "upcoming",
    },
    {
        id: 4,
        time: "16:00 - 17:00",
        title: "Team Building Plan",
        room: "Phòng họp VIP",
        status: "upcoming",
    },
];

export default function DashboardPage() {
    const { user } = useAuth();
    const displayName = user?.employee?.fullName || user?.username || "User";

    return (
        <>
            <AppHeader title="Dashboard" />

            <main className="flex-1 overflow-auto p-6 animate-fade-in">
                {/* Welcome Section */}
                <div className="mb-8 animate-slide-up-fade" style={{ animationDelay: '100ms' }}>
                    <h2 className="text-2xl font-bold tracking-tight">
                        Xin chào, {displayName}! 👋
                    </h2>
                    <p className="text-muted-foreground">
                        Chào mừng bạn quay trở lại. Đây là tổng quan hoạt động hôm nay.
                    </p>
                </div>

                {/* Stats Grid */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
                    {stats.map((stat, index) => (
                        <StatsCard
                            key={stat.title}
                            {...stat}
                            delay={200 + index * 100}
                        />
                    ))}
                </div>

                {/* Main Content Grid */}
                <div className="grid gap-6 lg:grid-cols-2 animate-slide-up-fade" style={{ animationDelay: '600ms' }}>
                    {/* Pending Approvals */}
                    <Card className="glass-card">
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle>Chờ phê duyệt</CardTitle>
                                <CardDescription>
                                    Các yêu cầu đang chờ xử lý của bạn
                                </CardDescription>
                            </div>
                            <Button variant="ghost" size="sm" className="gap-1 rounded-full">
                                Xem tất cả
                                <ArrowRight className="h-4 w-4" />
                            </Button>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {pendingApprovals.map((item) => (
                                    <div
                                        key={item.id}
                                        className="flex items-center gap-4 p-3 rounded-xl border bg-card/50 hover:bg-accent/50 transition-colors group cursor-pointer"
                                    >
                                        <Avatar className="h-10 w-10 ring-2 ring-background group-hover:ring-primary/20 transition-all">
                                            <AvatarImage src={getAvatarVariant(item.requester)} />
                                            <AvatarFallback>
                                                {item.requester.split(" ").pop()?.charAt(0)}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">
                                                    {item.title}
                                                </p>
                                                {item.priority === "urgent" && (
                                                    <Badge variant="destructive" className="text-[10px] px-1.5 h-5">
                                                        Gấp
                                                    </Badge>
                                                )}
                                            </div>
                                            <p className="text-xs text-muted-foreground">
                                                {item.requester} • {item.department} • {item.date}
                                            </p>
                                        </div>
                                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Button size="sm" variant="outline" className="h-8 rounded-full">
                                                Từ chối
                                            </Button>
                                            <Button size="sm" className="h-8 rounded-full">Duyệt</Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Today's Schedule */}
                    <Card className="glass-card">
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle>Lịch hôm nay</CardTitle>
                                <CardDescription>
                                    Các cuộc họp và sự kiện trong ngày
                                </CardDescription>
                            </div>
                            <Button variant="ghost" size="sm" className="gap-1 rounded-full">
                                Xem lịch
                                <ArrowRight className="h-4 w-4" />
                            </Button>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {todaySchedule.map((event) => (
                                    <div
                                        key={event.id}
                                        className="flex items-start gap-4 p-3 rounded-xl border bg-card/50"
                                    >
                                        <div className="flex flex-col items-center mt-1">
                                            {event.status === "completed" && (
                                                <CheckCircle2 className="h-5 w-5 text-success" />
                                            )}
                                            {event.status === "ongoing" && (
                                                <Clock className="h-5 w-5 text-primary animate-pulse" />
                                            )}
                                            {event.status === "upcoming" && (
                                                <AlertCircle className="h-5 w-5 text-muted-foreground" />
                                            )}
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex items-center justify-between">
                                                <p
                                                    className={`text-sm font-medium ${event.status === "completed"
                                                        ? "line-through text-muted-foreground"
                                                        : ""
                                                        }`}
                                                >
                                                    {event.title}
                                                </p>
                                                {event.status === "ongoing" && (
                                                    <Badge className="bg-primary/10 text-primary hover:bg-primary/20 border-primary/20">
                                                        Đang diễn ra
                                                    </Badge>
                                                )}
                                            </div>
                                            <p className="text-xs text-muted-foreground mt-1 flex items-center">
                                                <Clock className="inline h-3 w-3 mr-1" />
                                                {event.time}
                                                <span className="mx-2">•</span>
                                                {event.room}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </main>
        </>
    );
}
