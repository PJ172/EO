
import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { RoomBooking, MeetingRoom } from "@/services/booking.service";
import { differenceInMinutes, format, getHours, startOfDay, eachDayOfInterval, isSameDay, subDays } from "date-fns";
import { vi } from "date-fns/locale";
import { BarChart as BarChartIcon, Users, Clock, CalendarDays, TrendingUp, PieChart as PieChartIcon, Activity } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    LineChart,
    Line,
    PieChart,
    Pie,
    Cell,
    Area,
    AreaChart
} from 'recharts';

interface BookingReportDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    bookings: RoomBooking[];
    rooms: MeetingRoom[];
}

// Professional Blue Palette
const COLORS = [
    '#3b82f6', // blue-500
    '#60a5fa', // blue-400
    '#93c5fd', // blue-300
    '#2563eb', // blue-600
    '#1d4ed8', // blue-700
    '#dbeafe', // blue-100
];

export function BookingReportDialog({ open, onOpenChange, bookings, rooms }: BookingReportDialogProps) {
    const [activeTab, setActiveTab] = useState("overview");

    const stats = useMemo(() => {
        if (!bookings || bookings.length === 0) return null;

        let totalDurationMinutes = 0;
        const roomUsage: Record<string, number> = {};
        const organizerUsage: Record<string, { count: number, name: string }> = {};
        const hourlyDistribution: Record<number, number> = {};

        // Initialize hourly buckets (7-19)
        for (let i = 7; i <= 19; i++) hourlyDistribution[i] = 0;

        const dateDistribution: Record<string, number> = {};

        bookings.forEach(booking => {
            const start = new Date(booking.startDatetime);
            const end = new Date(booking.endDatetime);
            const duration = differenceInMinutes(end, start);
            totalDurationMinutes += duration;

            const roomName = booking.room?.name || 'Unknown';
            roomUsage[roomName] = (roomUsage[roomName] || 0) + 1;

            const organizer = booking.organizer;
            const organizerName = organizer
                ? `${organizer.lastName} ${organizer.firstName}`.trim() || 'Unknown'
                : 'Unknown';

            if (!organizerUsage[organizerName]) {
                organizerUsage[organizerName] = { count: 0, name: organizerName };
            }
            organizerUsage[organizerName].count += 1;

            const hour = getHours(start);
            if (hour >= 7 && hour <= 19) {
                hourlyDistribution[hour] = (hourlyDistribution[hour] || 0) + 1;
            }

            const dateKey = format(start, 'dd/MM');
            dateDistribution[dateKey] = (dateDistribution[dateKey] || 0) + 1;
        });

        const sortedRooms = Object.entries(roomUsage)
            .sort((a, b) => b[1] - a[1])
            .map(([name, count]) => ({ name, count }));

        const topRoom = sortedRooms.length > 0 ? sortedRooms[0] : null;

        const sortedOrganizers = Object.values(organizerUsage)
            .sort((a, b) => b.count - a.count)
            .slice(0, 5);
        const topOrganizer = sortedOrganizers.length > 0 ? sortedOrganizers[0] : null;

        const hourlyRwData = Object.entries(hourlyDistribution).map(([hour, count]) => ({
            hour: `${hour}:00`,
            count
        }));

        const dailyTrendData = Object.entries(dateDistribution).map(([date, count]) => ({
            date,
            count
        })).sort((a, b) => a.date.localeCompare(b.date));

        return {
            totalBookings: bookings.length,
            totalHours: (totalDurationMinutes / 60).toFixed(1),
            averageDuration: (totalDurationMinutes / bookings.length).toFixed(0) + ' phút',
            topRoom,
            topOrganizer,
            sortedRooms,
            sortedOrganizers,
            hourlyData: hourlyRwData,
            dailyTrendData
        };
    }, [bookings]);

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-white dark:bg-gray-800 p-3 border border-gray-100 dark:border-gray-700 shadow-lg rounded-lg text-sm">
                    <p className="font-semibold mb-1">{label}</p>
                    <p className="text-blue-600 dark:text-blue-400">
                        {payload[0].name}: <span className="font-bold">{payload[0].value}</span>
                    </p>
                </div>
            );
        }
        return null;
    };

    if (!stats) return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Báo cáo đặt phòng</DialogTitle>
                </DialogHeader>
                <div className="py-12 text-center text-muted-foreground flex flex-col items-center">
                    <Activity className="h-12 w-12 text-gray-200 mb-3" />
                    <p>Chưa có dữ liệu đặt phòng trong giai đoạn này.</p>
                </div>
            </DialogContent>
        </Dialog>
    );

    // Calculate dynamic height for vertical bar chart
    const roomChartHeight = Math.max(stats.sortedRooms.length * 50 + 60, 300);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[750px] max-h-[90vh] overflow-y-auto p-0">
                <div className="px-6 py-4 border-b flex items-center gap-3 bg-gray-50/50 dark:bg-gray-900/20">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                        <Activity className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                        <DialogTitle className="text-lg font-semibold">Báo cáo hoạt động</DialogTitle>
                        <p className="text-sm text-muted-foreground">Thống kê chi tiết tình hình sử dụng phòng họp</p>
                    </div>
                </div>

                <div className="p-6">
                    <Tabs defaultValue="overview" className="w-full" onValueChange={setActiveTab}>
                        <TabsList className="grid w-full grid-cols-3 mb-6 bg-gray-100 dark:bg-gray-800 h-10 p-1">
                            <TabsTrigger value="overview" className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 data-[state=active]:shadow-sm">Tổng quan</TabsTrigger>
                            <TabsTrigger value="rooms" className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 data-[state=active]:shadow-sm">Hiệu suất phòng</TabsTrigger>
                            <TabsTrigger value="trends" className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 data-[state=active]:shadow-sm">Xu hướng</TabsTrigger>
                        </TabsList>

                        {/* OVERVIEW TAB */}
                        <TabsContent value="overview" className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <Card className="border-none shadow-sm bg-blue-50 dark:bg-blue-900/10">
                                    <CardContent className="p-6 flex flex-col items-center text-center">
                                        <div className="p-3 bg-white dark:bg-gray-800 rounded-full shadow-sm mb-3">
                                            <CalendarDays className="h-5 w-5 text-blue-500" />
                                        </div>
                                        <div className="text-2xl font-bold text-gray-800 dark:text-gray-100">{stats.totalBookings}</div>
                                        <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium mt-1">Cuộc họp</p>
                                    </CardContent>
                                </Card>
                                <Card className="border-none shadow-sm bg-green-50 dark:bg-green-900/10">
                                    <CardContent className="p-6 flex flex-col items-center text-center">
                                        <div className="p-3 bg-white dark:bg-gray-800 rounded-full shadow-sm mb-3">
                                            <Clock className="h-5 w-5 text-green-500" />
                                        </div>
                                        <div className="text-2xl font-bold text-gray-800 dark:text-gray-100">{stats.totalHours}</div>
                                        <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium mt-1">Tổng giờ</p>
                                    </CardContent>
                                </Card>
                                <Card className="border-none shadow-sm bg-purple-50 dark:bg-purple-900/10">
                                    <CardContent className="p-6 flex flex-col items-center text-center">
                                        <div className="p-3 bg-white dark:bg-gray-800 rounded-full shadow-sm mb-3">
                                            <TrendingUp className="h-5 w-5 text-purple-500" />
                                        </div>
                                        <div className="text-lg font-bold text-gray-800 dark:text-gray-100 truncate w-full px-2">{stats.topRoom?.name || "N/A"}</div>
                                        <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium mt-1">Hot nhất</p>
                                    </CardContent>
                                </Card>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-7 gap-6">
                                <Card className="md:col-span-3 shadow-none border">
                                    <CardHeader className="pb-3">
                                        <CardTitle className="text-base font-semibold">Top Người đặt</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="space-y-4">
                                            {stats.sortedOrganizers.map((org, index) => (
                                                <div key={index} className="flex items-center justify-between group">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold transition-colors ${index === 0 ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
                                                            {index + 1}
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{org.name}</p>
                                                        </div>
                                                    </div>
                                                    <div className="text-sm font-semibold text-gray-600 dark:text-gray-400 bg-gray-50 px-2 py-1 rounded">
                                                        {org.count}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </CardContent>
                                </Card>

                                <Card className="md:col-span-4 shadow-none border">
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-base font-semibold">Tỷ lệ sử dụng</CardTitle>
                                    </CardHeader>
                                    <CardContent className="h-[300px] flex items-center justify-center">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie
                                                    data={stats.sortedRooms}
                                                    cx="50%"
                                                    cy="50%"
                                                    innerRadius={60}
                                                    outerRadius={80}
                                                    paddingAngle={5}
                                                    dataKey="count"
                                                >
                                                    {stats.sortedRooms.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                    ))}
                                                </Pie>
                                                <Tooltip content={<CustomTooltip />} />
                                                <Legend
                                                    layout="vertical"
                                                    verticalAlign="middle"
                                                    align="right"
                                                    wrapperStyle={{ fontSize: '12px' }}
                                                />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </CardContent>
                                </Card>
                            </div>
                        </TabsContent>

                        {/* ROOMS TAB */}
                        <TabsContent value="rooms" className="space-y-6">
                            <Card className="shadow-none border">
                                <CardHeader>
                                    <CardTitle className="text-base">Tần suất theo phòng</CardTitle>
                                </CardHeader>
                                <CardContent style={{ height: roomChartHeight }}>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart
                                            data={stats.sortedRooms}
                                            layout="vertical"
                                            margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
                                        >
                                            <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={true} stroke="#f0f0f0" />
                                            <XAxis type="number" allowDecimals={false} hide />
                                            <YAxis
                                                dataKey="name"
                                                type="category"
                                                width={150}
                                                tick={{ fontSize: 13, fill: '#6b7280' }}
                                                axisLine={false}
                                                tickLine={false}
                                            />
                                            <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f9fafb' }} />
                                            <Bar
                                                dataKey="count"
                                                name="Số cuộc họp"
                                                fill="#3b82f6"
                                                radius={[0, 4, 4, 0]}
                                                barSize={24}
                                                label={{ position: 'right', fill: '#6b7280', fontSize: 12 }}
                                            />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        {/* TRENDS TAB */}
                        <TabsContent value="trends" className="space-y-6">
                            <Card className="shadow-none border">
                                <CardHeader>
                                    <CardTitle className="text-base">Khung giờ phổ biến</CardTitle>
                                    <CardDescription>Thời điểm bắt đầu họp thường xuyên nhất</CardDescription>
                                </CardHeader>
                                <CardContent className="h-[350px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={stats.hourlyData} margin={{ top: 20, right: 10, left: 0, bottom: 0 }}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                            <XAxis dataKey="hour" tick={{ fontSize: 12, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                                            <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} />
                                            <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f9fafb' }} />
                                            <Bar dataKey="count" name="Số cuộc họp" fill="#f59e0b" radius={[4, 4, 0, 0]} maxBarSize={50} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </CardContent>
                            </Card>

                            <Card className="shadow-none border">
                                <CardHeader>
                                    <CardTitle className="text-base">Xu hướng 7 ngày qua</CardTitle>
                                </CardHeader>
                                <CardContent className="h-[350px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={stats.dailyTrendData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                            <defs>
                                                <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                            <XAxis dataKey="date" tick={{ fontSize: 12, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                                            <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} />
                                            <Tooltip content={<CustomTooltip />} />
                                            <Area
                                                type="monotone"
                                                dataKey="count"
                                                name="Số cuộc họp"
                                                stroke="#3b82f6"
                                                fillOpacity={1}
                                                fill="url(#colorCount)"
                                                strokeWidth={2}
                                            />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </CardContent>
                            </Card>
                        </TabsContent>
                    </Tabs>
                </div>
            </DialogContent>
        </Dialog>
    );
}
