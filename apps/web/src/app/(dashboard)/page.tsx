"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
    Users,
    UserCheck,
    CalendarDays,
    Clock,
    FileText,
    DoorOpen,
    TrendingUp,
    AlertCircle,
    LayoutDashboard
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    Legend,
} from "recharts";
import { PendingApprovalsWidget } from "@/components/documents/pending-approvals-widget";
import { useDashboardStats } from "@/services/dashboard.service";

// Màu sắc cho biểu đồ
const COLORS = ['#3b82f6', '#22c55e', '#f97316', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

// Skeleton Loading
function StatsWidgetsSkeleton() {
    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map(i => (
                <Card key={i}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-4 w-4" />
                    </CardHeader>
                    <CardContent>
                        <Skeleton className="h-8 w-16 mb-2" />
                        <Skeleton className="h-3 w-32" />
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}

// Stat Widget Component
function StatCard({
    title,
    value,
    subtitle,
    icon: Icon,
    trend,
    valueColor = "text-foreground"
}: {
    title: string;
    value: number | string;
    subtitle: string;
    icon: any;
    trend?: { value: number; label: string };
    valueColor?: string;
}) {
    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{title}</CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className={`text-2xl font-bold ${valueColor}`}>{value}</div>
                <p className="text-xs text-muted-foreground">{subtitle}</p>
                {trend && (
                    <div className="flex items-center mt-1 text-xs">
                        <TrendingUp className="h-3 w-3 mr-1 text-green-500" />
                        <span className="text-green-500">+{trend.value}</span>
                        <span className="text-muted-foreground ml-1">{trend.label}</span>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

// Stats Widgets
function StatsWidgets() {
    const { data, isLoading, isError } = useDashboardStats();

    if (isLoading) return <StatsWidgetsSkeleton />;

    if (isError || !data) {
        return (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card className="col-span-full">
                    <CardContent className="flex items-center justify-center py-8 text-muted-foreground">
                        <AlertCircle className="h-5 w-5 mr-2" />
                        Không thể tải dữ liệu thống kê
                    </CardContent>
                </Card>
            </div>
        );
    }

    const officialCount = data.employees.byStatus.find(s => s.status === 'OFFICIAL')?.count || 0;
    const totalEmployees = data.employees.total;
    const officialPercent = totalEmployees > 0 ? Math.round((officialCount / totalEmployees) * 100) : 0;

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <StatCard
                title="Tổng Nhân sự"
                value={totalEmployees}
                subtitle="Toàn công ty"
                icon={Users}
            />
            <StatCard
                title="Nhân viên Chính thức"
                value={officialCount}
                subtitle={`${officialPercent}% tổng số`}
                icon={UserCheck}
                valueColor="text-blue-600"
            />
            <StatCard
                title="Nghỉ phép hôm nay"
                value={data.leaves.todayLeaves}
                subtitle={`${data.leaves.pendingRequests} đang chờ duyệt`}
                icon={CalendarDays}
                valueColor={data.leaves.todayLeaves > 0 ? "text-orange-600" : "text-foreground"}
            />
            <StatCard
                title="Đặt phòng hôm nay"
                value={data.bookings.today}
                subtitle={`${data.bookings.thisWeek} lượt tuần này`}
                icon={DoorOpen}
                valueColor="text-green-600"
            />
        </div>
    );
}

// Department Chart
function DepartmentChart() {
    const { data, isLoading } = useDashboardStats();

    if (isLoading) {
        return (
            <Card className="col-span-4">
                <CardHeader>
                    <Skeleton className="h-6 w-48" />
                </CardHeader>
                <CardContent>
                    <Skeleton className="h-[350px] w-full" />
                </CardContent>
            </Card>
        );
    }

    const chartData = data?.employees.byDepartment.slice(0, 8).map(d => ({
        name: d.departmentName.length > 15 ? d.departmentName.substring(0, 15) + '...' : d.departmentName,
        total: d.count,
    })) || [];

    return (
        <Card className="col-span-4">
            <CardHeader>
                <CardTitle>Nhân sự theo Phòng ban</CardTitle>
                <CardDescription>Phân bố nhân viên trong công ty</CardDescription>
            </CardHeader>
            <CardContent>
                <ResponsiveContainer width="100%" height={350}>
                    <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                        <XAxis type="number" hide />
                        <YAxis
                            dataKey="name"
                            type="category"
                            width={120}
                            tickLine={false}
                            axisLine={false}
                            tick={{ fontSize: 12 }}
                        />
                        <Tooltip
                            cursor={{ fill: 'transparent' }}
                            formatter={(value) => [`${value} người`, 'Số lượng']}
                        />
                        <Bar dataKey="total" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={28} />
                    </BarChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    );
}

// Request Stats Chart
function RequestStatsChart() {
    const { data, isLoading } = useDashboardStats();

    if (isLoading) {
        return (
            <Card className="col-span-3">
                <CardHeader>
                    <Skeleton className="h-6 w-48" />
                </CardHeader>
                <CardContent>
                    <Skeleton className="h-[300px] w-full" />
                </CardContent>
            </Card>
        );
    }

    const chartData = data?.requests.byStatus.map((s, idx) => ({
        name: s.label,
        value: s.count,
        fill: COLORS[idx % COLORS.length],
    })) || [];

    return (
        <Card className="col-span-3">
            <CardHeader>
                <CardTitle>Tờ trình / Đề xuất</CardTitle>
                <CardDescription>
                    <Badge variant="outline" className="mr-2">
                        {data?.requests.pending || 0} đang chờ duyệt
                    </Badge>
                </CardDescription>
            </CardHeader>
            <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                        <Pie
                            data={chartData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={100}
                            paddingAngle={2}
                            dataKey="value"
                            label={({ name, value }) => `${name}: ${value}`}
                        >
                            {chartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.fill} />
                            ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                    </PieChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    );
}

// Upcoming Bookings
function UpcomingBookings() {
    const { data, isLoading } = useDashboardStats();

    if (isLoading) {
        return (
            <Card className="col-span-3">
                <CardHeader>
                    <Skeleton className="h-6 w-48" />
                </CardHeader>
                <CardContent className="space-y-4">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="flex items-center gap-4">
                            <Skeleton className="h-10 w-10 rounded" />
                            <div className="flex-1 space-y-2">
                                <Skeleton className="h-4 w-3/4" />
                                <Skeleton className="h-3 w-1/2" />
                            </div>
                        </div>
                    ))}
                </CardContent>
            </Card>
        );
    }

    const upcomingBookings = data?.bookings.upcomingToday || [];

    return (
        <Card className="col-span-3">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    Cuộc họp sắp diễn ra
                </CardTitle>
                <CardDescription>Lịch họp trong ngày hôm nay</CardDescription>
            </CardHeader>
            <CardContent>
                {upcomingBookings.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                        <CalendarDays className="h-12 w-12 mx-auto mb-2 opacity-50" />
                        <p>Không có cuộc họp nào sắp diễn ra</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {upcomingBookings.map((booking) => (
                            <div key={booking.id} className="flex items-start gap-4 p-3 rounded-lg bg-muted/50">
                                <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
                                    <DoorOpen className="h-6 w-6" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-medium truncate">{booking.title}</p>
                                    <p className="text-sm text-muted-foreground">
                                        {booking.roomName} • {booking.organizer}
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        {new Date(booking.startTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                                        {' - '}
                                        {new Date(booking.endTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

// Main Dashboard Page
export default function DashboardPage() {
    return (
        <div className="flex-1 space-y-6 p-2">
            <div className="flex items-center justify-between">
                <div className="flex-1">
                    <PageHeader
                        title={
                            <span className="flex items-center gap-2">
                                <LayoutDashboard className="h-6 w-6 text-violet-600 dark:text-violet-400" /> Tổng quan
                            </span>
                        }
                        description="Bảng điều khiển hệ thống eOffice"
                        className="mb-0 border-none bg-transparent p-0 shadow-none"
                    />
                </div>
            </div>

            {/* Stats Cards */}
            <StatsWidgets />

            {/* Charts Row 1 */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                <DepartmentChart />
                <UpcomingBookings />
            </div>

            {/* Charts Row 2 */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                <RequestStatsChart />
                <PendingApprovalsWidget />
            </div>
        </div>
    );
}
