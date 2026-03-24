"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
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
import { useAuditStats } from "@/services/dashboard.service";
import { Activity, Shield, FileText, Users } from "lucide-react";

const COLORS = ['#3b82f6', '#22c55e', '#f97316', '#ef4444', '#8b5cf6', '#ec4899'];

interface AuditStatsCardProps {
    title: string;
    description: string;
}

export function AuditStatsCard({ title, description }: AuditStatsCardProps) {
    const { data, isLoading, isError } = useAuditStats();

    if (isLoading) {
        return (
            <Card>
                <CardHeader>
                    <Skeleton className="h-6 w-48" />
                    <Skeleton className="h-4 w-64" />
                </CardHeader>
                <CardContent>
                    <Skeleton className="h-[250px] w-full" />
                </CardContent>
            </Card>
        );
    }

    if (isError || !data) {
        return (
            <Card>
                <CardContent className="flex items-center justify-center py-8 text-muted-foreground">
                    Không thể tải dữ liệu thống kê
                </CardContent>
            </Card>
        );
    }

    const actionChartData = data.byAction.map((a, idx) => ({
        name: a.label,
        value: a.count,
        fill: COLORS[idx % COLORS.length],
    }));

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    {title}
                </CardTitle>
                <CardDescription>{description}</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                    {/* Pie Chart theo hành động */}
                    <div>
                        <h4 className="text-sm font-medium mb-2">Theo Hành động (7 ngày)</h4>
                        <ResponsiveContainer width="100%" height={200}>
                            <PieChart>
                                <Pie
                                    data={actionChartData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={40}
                                    outerRadius={70}
                                    paddingAngle={2}
                                    dataKey="value"
                                >
                                    {actionChartData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.fill} />
                                    ))}
                                </Pie>
                                <Tooltip />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Bar Chart theo đối tượng */}
                    <div>
                        <h4 className="text-sm font-medium mb-2">Theo Đối tượng (7 ngày)</h4>
                        <ResponsiveContainer width="100%" height={200}>
                            <BarChart
                                data={data.byEntityType.slice(0, 5)}
                                layout="vertical"
                            >
                                <XAxis type="number" hide />
                                <YAxis
                                    dataKey="label"
                                    type="category"
                                    width={80}
                                    tickLine={false}
                                    axisLine={false}
                                    tick={{ fontSize: 11 }}
                                />
                                <Tooltip
                                    cursor={{ fill: 'transparent' }}
                                    formatter={(value) => [`${value} lượt`, 'Số lượng']}
                                />
                                <Bar dataKey="count" fill="#8b5cf6" radius={[0, 4, 4, 0]} barSize={20} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Stats Summary */}
                <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t">
                    <div className="text-center">
                        <p className="text-2xl font-bold text-blue-600">{data.totalLogs}</p>
                        <p className="text-xs text-muted-foreground">Tổng bản ghi</p>
                    </div>
                    <div className="text-center">
                        <p className="text-2xl font-bold text-green-600">
                            {data.byAction.find(a => a.action === 'CREATE')?.count || 0}
                        </p>
                        <p className="text-xs text-muted-foreground">Tạo mới (7 ngày)</p>
                    </div>
                    <div className="text-center">
                        <p className="text-2xl font-bold text-orange-600">
                            {data.byAction.find(a => a.action === 'UPDATE')?.count || 0}
                        </p>
                        <p className="text-xs text-muted-foreground">Cập nhật (7 ngày)</p>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

// Recent Activity List
export function RecentActivityList() {
    const { data, isLoading } = useAuditStats();

    if (isLoading) {
        return (
            <Card>
                <CardHeader>
                    <Skeleton className="h-6 w-48" />
                </CardHeader>
                <CardContent className="space-y-3">
                    {[1, 2, 3, 4, 5].map(i => (
                        <div key={i} className="flex items-center gap-3">
                            <Skeleton className="h-8 w-8 rounded-full" />
                            <div className="flex-1 space-y-1">
                                <Skeleton className="h-4 w-3/4" />
                                <Skeleton className="h-3 w-1/2" />
                            </div>
                        </div>
                    ))}
                </CardContent>
            </Card>
        );
    }

    const getActionIcon = (action: string) => {
        switch (action) {
            case 'CREATE': return <FileText className="h-4 w-4 text-green-500" />;
            case 'UPDATE': return <Activity className="h-4 w-4 text-orange-500" />;
            case 'DELETE': return <Shield className="h-4 w-4 text-red-500" />;
            case 'LOGIN': return <Users className="h-4 w-4 text-blue-500" />;
            default: return <Activity className="h-4 w-4 text-gray-500" />;
        }
    };

    const getActionColor = (action: string) => {
        switch (action) {
            case 'CREATE': return 'bg-green-100';
            case 'UPDATE': return 'bg-orange-100';
            case 'DELETE': return 'bg-red-100';
            case 'LOGIN': return 'bg-blue-100';
            default: return 'bg-gray-100';
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    Hoạt động gần đây
                </CardTitle>
                <CardDescription>10 hoạt động mới nhất trong hệ thống</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-3">
                    {data?.recentActivity.map((log) => (
                        <div key={log.id} className="flex items-start gap-3 py-2 border-b last:border-0">
                            <div className={`p-2 rounded-full ${getActionColor(log.action)}`}>
                                {getActionIcon(log.action)}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium">
                                    {log.actor} - {log.actionLabel}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    {log.entityLabel} • {new Date(log.createdAt).toLocaleString('vi-VN')}
                                </p>
                            </div>
                        </div>
                    ))}
                    {(!data?.recentActivity || data.recentActivity.length === 0) && (
                        <p className="text-center text-muted-foreground py-4">
                            Chưa có hoạt động nào
                        </p>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
