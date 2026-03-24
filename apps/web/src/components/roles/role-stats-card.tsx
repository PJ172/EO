"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { Shield, Users, Lock, TrendingUp, AlertTriangle } from "lucide-react";

import { type Role, type Permission } from "@/services/roles.service";

interface RoleStatsCardProps {
    roles: Role[];
    permissionsGrouped: Record<string, Permission[]>;
    isLoading?: boolean;
}

const COLORS = ['#3b82f6', '#22c55e', '#f97316', '#8b5cf6', '#ec4899', '#14b8a6', '#f59e0b', '#ef4444'];

export function RoleStatsCard({ roles, permissionsGrouped, isLoading }: RoleStatsCardProps) {
    if (isLoading) {
        return <RoleStatsSkeleton />;
    }

    const totalRoles = roles.length;
    const totalPermissions = Object.values(permissionsGrouped).flat().length;
    const totalUsers = roles.reduce((sum, r) => sum + r.usersCount, 0);
    const avgPermsPerRole = totalRoles > 0 ? Math.round(roles.reduce((sum, r) => sum + r.permissionsCount, 0) / totalRoles) : 0;

    // Users per role chart data
    const usersPerRoleData = roles
        .filter(r => r.usersCount > 0)
        .sort((a, b) => b.usersCount - a.usersCount)
        .slice(0, 6)
        .map(r => ({
            name: r.name,
            users: r.usersCount,
        }));

    // Permissions per module chart data
    const moduleData = Object.entries(permissionsGrouped).map(([module, perms], idx) => ({
        name: getModuleLabel(module),
        value: perms.length,
        fill: COLORS[idx % COLORS.length],
    }));

    // Find roles with no permissions (potential issues)
    const emptyRoles = roles.filter(r => r.permissionsCount === 0);

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {/* Stats Cards */}
            <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-200">
                <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-muted-foreground">Tổng Vai trò</p>
                            <p className="text-2xl font-bold text-blue-600">{totalRoles}</p>
                        </div>
                        <div className="p-3 bg-blue-500/20 rounded-full">
                            <Shield className="h-6 w-6 text-blue-600" />
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-200">
                <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-muted-foreground">Tổng Quyền</p>
                            <p className="text-2xl font-bold text-green-600">{totalPermissions}</p>
                        </div>
                        <div className="p-3 bg-green-500/20 rounded-full">
                            <Lock className="h-6 w-6 text-green-600" />
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-200">
                <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-muted-foreground">Tổng Người dùng</p>
                            <p className="text-2xl font-bold text-purple-600">{totalUsers}</p>
                        </div>
                        <div className="p-3 bg-purple-500/20 rounded-full">
                            <Users className="h-6 w-6 text-purple-600" />
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-orange-500/10 to-orange-600/5 border-orange-200">
                <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-muted-foreground">TB Quyền/Role</p>
                            <p className="text-2xl font-bold text-orange-600">{avgPermsPerRole}</p>
                        </div>
                        <div className="p-3 bg-orange-500/20 rounded-full">
                            <TrendingUp className="h-6 w-6 text-orange-600" />
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Charts Row */}
            <Card className="md:col-span-2">
                <CardHeader className="pb-2">
                    <CardTitle className="text-base">Người dùng theo Vai trò</CardTitle>
                </CardHeader>
                <CardContent>
                    <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={usersPerRoleData} layout="vertical">
                            <XAxis type="number" hide />
                            <YAxis
                                dataKey="name"
                                type="category"
                                width={100}
                                tickLine={false}
                                axisLine={false}
                                tick={{ fontSize: 12 }}
                            />
                            <Tooltip
                                cursor={{ fill: 'transparent' }}
                                formatter={(value) => [`${value} người dùng`, 'Số lượng']}
                            />
                            <Bar dataKey="users" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={24} />
                        </BarChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>

            <Card className="md:col-span-2">
                <CardHeader className="pb-2">
                    <CardTitle className="text-base">Quyền theo Module</CardTitle>
                </CardHeader>
                <CardContent>
                    <ResponsiveContainer width="100%" height={200}>
                        <PieChart>
                            <Pie
                                data={moduleData}
                                cx="50%"
                                cy="50%"
                                innerRadius={50}
                                outerRadius={80}
                                paddingAngle={2}
                                dataKey="value"
                            >
                                {moduleData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.fill} />
                                ))}
                            </Pie>
                            <Tooltip />
                            <Legend />
                        </PieChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>

            {/* Alerts */}
            {emptyRoles.length > 0 && (
                <Card className="md:col-span-4 border-amber-200 bg-amber-50/50">
                    <CardContent className="pt-4">
                        <div className="flex items-start gap-3">
                            <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
                            <div>
                                <p className="font-medium text-amber-800">Cảnh báo: Vai trò chưa có quyền</p>
                                <p className="text-sm text-amber-700">
                                    Các vai trò sau chưa được gán quyền: {emptyRoles.map(r => r.name).join(', ')}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}

function RoleStatsSkeleton() {
    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map(i => (
                <Card key={i}>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div className="space-y-2">
                                <Skeleton className="h-4 w-24" />
                                <Skeleton className="h-8 w-16" />
                            </div>
                            <Skeleton className="h-12 w-12 rounded-full" />
                        </div>
                    </CardContent>
                </Card>
            ))}
            <Card className="md:col-span-2">
                <CardContent className="pt-6">
                    <Skeleton className="h-[200px] w-full" />
                </CardContent>
            </Card>
            <Card className="md:col-span-2">
                <CardContent className="pt-6">
                    <Skeleton className="h-[200px] w-full" />
                </CardContent>
            </Card>
        </div>
    );
}

const MODULE_LABELS: Record<string, string> = {
    'ADMIN': 'Hệ thống',
    'HR': 'Nhân sự',
    'ORG': 'Tổ chức',
    'DOCUMENTS': 'Tài liệu',
    'LEAVE': 'Nghỉ phép',
    'BOOKING': 'Phòng họp',
    'CAR_BOOKING': 'Đặt xe',
    'NEWS': 'Tin tức',
    'PROJECTS': 'Dự án',
    'TASKS': 'Công việc',
    'KPI': 'KPI',
    'REQUESTS': 'Đề xuất',
};

function getModuleLabel(module: string): string {
    return MODULE_LABELS[module] || module;
}
