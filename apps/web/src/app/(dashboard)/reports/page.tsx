'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
    Card, CardContent, CardDescription, CardHeader, CardTitle
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend
} from 'recharts';
import {
    Users, Calendar, DoorOpen, FileText, TrendingUp, TrendingDown,
    AlertTriangle, Download, BarChart3, FolderKanban, Car, Send,
    UtensilsCrossed, Headphones
} from 'lucide-react';
import { PermissionGate } from '@/components/auth/permission-gate';
import { apiClient as api } from '@/lib/api-client';
import { PageHeader } from '@/components/ui/page-header';

const CHART_COLORS = [
    '#4f46e5', '#06b6d4', '#10b981', '#f59e0b', '#ef4444',
    '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#6366f1',
];

const PERIOD_OPTIONS = [
    { value: 'daily', label: 'Ngày' },
    { value: 'weekly', label: 'Tuần' },
    { value: 'monthly', label: 'Tháng' },
    { value: 'quarterly', label: 'Quý' },
    { value: 'yearly', label: 'Năm' },
];

function ReportSkeleton() {
    return (
        <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-4">
                {[...Array(4)].map((_, i) => (
                    <Skeleton key={i} className="h-32" />
                ))}
            </div>
            <div className="grid gap-4 md:grid-cols-2">
                <Skeleton className="h-64" />
                <Skeleton className="h-64" />
            </div>
        </div>
    );
}

// ==================== HR Report Tab ====================
function HRReportTab({ period }: { period: string }) {
    const { data, isLoading } = useQuery({
        queryKey: ['report-hr', period],
        queryFn: () => api.get(`/reports/hr?period=${period}`).then(r => r.data),
    });

    if (isLoading) return <ReportSkeleton />;
    if (!data) return <div className="text-center py-8 text-muted-foreground">Không có dữ liệu</div>;

    return (
        <div className="space-y-6">
            {/* Summary cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Tổng nhân sự</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{data.summary.totalEmployees}</div>
                        <p className="text-xs text-muted-foreground">Active: {data.summary.activeEmployees}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Tuyển mới</CardTitle>
                        <TrendingUp className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">{data.summary.newHires}</div>
                        <p className="text-xs text-muted-foreground">Trong kỳ</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Nghỉ việc</CardTitle>
                        <TrendingDown className="h-4 w-4 text-red-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-600">{data.summary.resignations}</div>
                        <p className="text-xs text-muted-foreground">Trong kỳ</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Turnover Rate</CardTitle>
                        <BarChart3 className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{data.summary.turnoverRate}</div>
                        <p className="text-xs text-muted-foreground">Tỷ lệ nghỉ việc</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">HĐ sắp hết hạn</CardTitle>
                        <AlertTriangle className="h-4 w-4 text-yellow-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-yellow-600">{data.contractExpiringSoon?.length || 0}</div>
                        <p className="text-xs text-muted-foreground">Trong 30 ngày</p>
                    </CardContent>
                </Card>
            </div>

            {/* Charts */}
            <div className="grid gap-4 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle>Nhân sự theo phòng ban</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={data.byDepartment?.slice(0, 10)}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="departmentName" fontSize={11} angle={-30} textAnchor="end" height={80} />
                                <YAxis />
                                <Tooltip />
                                <Bar dataKey="count" fill="#4f46e5" radius={[4, 4, 0, 0]} name="Số lượng" />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>Phân bổ trạng thái</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                                <Pie data={data.byStatus} dataKey="count" nameKey="label"
                                    cx="50%" cy="50%" outerRadius={100} label>
                                    {data.byStatus?.map((_: any, i: number) => (
                                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>

            {/* Contract alerts Table */}
            {data.contractExpiringSoon?.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5 text-yellow-500" />
                            Hợp đồng sắp hết hạn (30 ngày)
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 shadow-[0_1px_2px_rgba(0,0,0,0.04)] ring-1 ring-border/50">
                                <TableRow>
                                    <TableHead>Mã nhân viên</TableHead>
                                    <TableHead>Họ và tên</TableHead>
                                    <TableHead>Phòng ban</TableHead>
                                    <TableHead>Loại HĐ</TableHead>
                                    <TableHead>Ngày hết hạn</TableHead>
                                    <TableHead>Còn lại</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {data.contractExpiringSoon.map((e: any) => (
                                    <TableRow key={e.id}>
                                        <TableCell className="font-mono">{e.employeeCode}</TableCell>
                                        <TableCell className="font-medium">{e.fullName}</TableCell>
                                        <TableCell>{e.departmentName}</TableCell>
                                        <TableCell>{e.contractType}</TableCell>
                                        <TableCell>{e.contractEndDate ? new Date(e.contractEndDate).toLocaleDateString('vi-VN') : ''}</TableCell>
                                        <TableCell>
                                            <Badge variant={e.daysLeft <= 7 ? 'destructive' : e.daysLeft <= 14 ? 'secondary' : 'outline'}>
                                                {e.daysLeft} ngày
                                            </Badge>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}

// ==================== Attendance Report Tab ====================
function AttendanceReportTab({ period }: { period: string }) {
    const { data, isLoading } = useQuery({
        queryKey: ['report-attendance', period],
        queryFn: () => api.get(`/reports/attendance?period=${period}`).then(r => r.data),
    });

    if (isLoading) return <ReportSkeleton />;
    if (!data) return <div className="text-center py-8 text-muted-foreground">Không có dữ liệu</div>;

    return (
        <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Tổng bản ghi</CardTitle>
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{data.summary.totalRecords}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Nhân viên chấm công</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{data.summary.uniqueEmployees}</div>
                        <p className="text-xs text-muted-foreground">{data.summary.attendanceRate} tỷ lệ</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Tổng giờ làm</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{data.summary.totalWorkHours}h</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Tổng OT</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-orange-500">{data.summary.totalOvertimeHours}h</div>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
                <Card>
                    <CardHeader><CardTitle>Phân bổ trạng thái chấm công</CardTitle></CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                                <Pie data={data.byStatus} dataKey="count" nameKey="label"
                                    cx="50%" cy="50%" outerRadius={100} label>
                                    {data.byStatus?.map((_: any, i: number) => (
                                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                {data.topLateAbsent?.length > 0 && (
                    <Card>
                        <CardHeader><CardTitle>Top đi muộn / vắng mặt</CardTitle></CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 shadow-[0_1px_2px_rgba(0,0,0,0.04)] ring-1 ring-border/50">
                                    <TableRow>
                                        <TableHead>Mã nhân viên</TableHead>
                                        <TableHead>Họ và tên</TableHead>
                                        <TableHead>Phòng ban</TableHead>
                                        <TableHead className="text-right">Số lần</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {data.topLateAbsent.map((e: any) => (
                                        <TableRow key={e.employeeId}>
                                            <TableCell className="font-mono">{e.employeeCode}</TableCell>
                                            <TableCell>{e.fullName}</TableCell>
                                            <TableCell>{e.departmentName}</TableCell>
                                            <TableCell className="text-right font-bold text-red-500">{e.count}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    );
}

// ==================== Leave Report Tab ====================
function LeaveReportTab({ period }: { period: string }) {
    const { data, isLoading } = useQuery({
        queryKey: ['report-leave', period],
        queryFn: () => api.get(`/reports/leave?period=${period}`).then(r => r.data),
    });

    if (isLoading) return <ReportSkeleton />;
    if (!data) return <div className="text-center py-8 text-muted-foreground">Không có dữ liệu</div>;

    return (
        <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Tổng đơn</CardTitle>
                        <FileText className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{data.summary.totalRequests}</div>
                    </CardContent>
                </Card>
                <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Đã duyệt</CardTitle></CardHeader>
                    <CardContent><div className="text-2xl font-bold text-green-600">{data.summary.approved}</div></CardContent></Card>
                <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Chờ duyệt</CardTitle></CardHeader>
                    <CardContent><div className="text-2xl font-bold text-yellow-600">{data.summary.pending}</div></CardContent></Card>
                <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Từ chối</CardTitle></CardHeader>
                    <CardContent><div className="text-2xl font-bold text-red-600">{data.summary.rejected}</div></CardContent></Card>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
                <Card>
                    <CardHeader><CardTitle>Theo loại nghỉ phép</CardTitle></CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={data.byType}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="typeName" fontSize={11} />
                                <YAxis />
                                <Tooltip />
                                <Bar dataKey="count" fill="#10b981" radius={[4, 4, 0, 0]} name="Số đơn" />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader><CardTitle>Theo phòng ban</CardTitle></CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={data.byDepartment?.slice(0, 10)}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="departmentName" fontSize={11} angle={-20} textAnchor="end" height={70} />
                                <YAxis />
                                <Tooltip />
                                <Bar dataKey="count" fill="#f59e0b" radius={[4, 4, 0, 0]} name="Số đơn" />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

// ==================== Booking Report Tab ====================
function BookingReportTab({ period }: { period: string }) {
    const { data, isLoading } = useQuery({
        queryKey: ['report-booking', period],
        queryFn: () => api.get(`/reports/booking?period=${period}`).then(r => r.data),
    });

    if (isLoading) return <ReportSkeleton />;
    if (!data) return <div className="text-center py-8 text-muted-foreground">Không có dữ liệu</div>;

    return (
        <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-4">
                <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Tổng lượt đặt</CardTitle>
                    <DoorOpen className="h-4 w-4 text-muted-foreground" /></CardHeader>
                    <CardContent><div className="text-2xl font-bold">{data.summary.totalBookings}</div></CardContent></Card>
                <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Đã xác nhận</CardTitle></CardHeader>
                    <CardContent><div className="text-2xl font-bold text-green-600">{data.summary.confirmed}</div></CardContent></Card>
                <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Đã hủy</CardTitle></CardHeader>
                    <CardContent><div className="text-2xl font-bold text-red-600">{data.summary.cancelled}</div></CardContent></Card>
                <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Tỷ lệ hủy</CardTitle></CardHeader>
                    <CardContent><div className="text-2xl font-bold">{data.summary.cancellationRate}</div></CardContent></Card>
            </div>

            <Card>
                <CardHeader><CardTitle>Sử dụng phòng họp</CardTitle></CardHeader>
                <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={data.byRoom}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="roomName" fontSize={12} />
                            <YAxis />
                            <Tooltip />
                            <Bar dataKey="bookingCount" fill="#06b6d4" radius={[4, 4, 0, 0]} name="Lượt đặt" />
                        </BarChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>
        </div>
    );
}

// ==================== Projects Report Tab ====================
function ProjectsReportTab({ period }: { period: string }) {
    const { data, isLoading } = useQuery({
        queryKey: ['report-projects', period],
        queryFn: () => api.get(`/reports/projects?period=${period}`).then(r => r.data),
    });
    if (isLoading) return <ReportSkeleton />;
    if (!data) return <div className="text-center py-8 text-muted-foreground">Không có dữ liệu</div>;
    return (
        <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-5">
                <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Dự án</CardTitle></CardHeader>
                    <CardContent><div className="text-2xl font-bold">{data.summary.totalProjects}</div></CardContent></Card>
                <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Công việc</CardTitle></CardHeader>
                    <CardContent><div className="text-2xl font-bold">{data.summary.totalTasks}</div></CardContent></Card>
                <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Hoàn thành</CardTitle></CardHeader>
                    <CardContent><div className="text-2xl font-bold text-green-600">{data.summary.completedTasks}</div></CardContent></Card>
                <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Quá hạn</CardTitle></CardHeader>
                    <CardContent><div className="text-2xl font-bold text-red-600">{data.summary.overdueTasks}</div></CardContent></Card>
                <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Tỷ lệ HT</CardTitle></CardHeader>
                    <CardContent><div className="text-2xl font-bold">{data.summary.completionRate}</div></CardContent></Card>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
                <Card><CardHeader><CardTitle>Dự án theo trạng thái</CardTitle></CardHeader><CardContent>
                    <ResponsiveContainer width="100%" height={250}><PieChart>
                        <Pie data={data.projectsByStatus} dataKey="count" nameKey="label" cx="50%" cy="50%" outerRadius={80} label>
                            {data.projectsByStatus?.map((_: any, i: number) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                        </Pie><Tooltip /><Legend /></PieChart></ResponsiveContainer></CardContent></Card>
                <Card><CardHeader><CardTitle>Công việc theo trạng thái</CardTitle></CardHeader><CardContent>
                    <ResponsiveContainer width="100%" height={250}><BarChart data={data.tasksByStatus}>
                        <CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="label" fontSize={11} /><YAxis /><Tooltip />
                        <Bar dataKey="count" fill="#8b5cf6" radius={[4, 4, 0, 0]} name="Số lượng" />
                    </BarChart></ResponsiveContainer></CardContent></Card>
            </div>
        </div>
    );
}

// ==================== Car Booking Report Tab ====================
function CarBookingReportTab({ period }: { period: string }) {
    const { data, isLoading } = useQuery({
        queryKey: ['report-car-booking', period],
        queryFn: () => api.get(`/reports/car-booking?period=${period}`).then(r => r.data),
    });
    if (isLoading) return <ReportSkeleton />;
    if (!data) return <div className="text-center py-8 text-muted-foreground">Không có dữ liệu</div>;
    return (
        <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-4">
                <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Tổng lượt đặt</CardTitle></CardHeader>
                    <CardContent><div className="text-2xl font-bold">{data.summary.totalBookings}</div></CardContent></Card>
                <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Đã xác nhận</CardTitle></CardHeader>
                    <CardContent><div className="text-2xl font-bold text-green-600">{data.summary.confirmed}</div></CardContent></Card>
                <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Đã hủy</CardTitle></CardHeader>
                    <CardContent><div className="text-2xl font-bold text-red-600">{data.summary.cancelled}</div></CardContent></Card>
                <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Tỷ lệ sử dụng</CardTitle></CardHeader>
                    <CardContent><div className="text-2xl font-bold">{data.summary.utilizationRate}</div></CardContent></Card>
            </div>
            <Card><CardHeader><CardTitle>Sử dụng xe theo biển số</CardTitle></CardHeader><CardContent>
                <ResponsiveContainer width="100%" height={250}><BarChart data={data.byCar}>
                    <CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="licensePlate" fontSize={11} /><YAxis /><Tooltip />
                    <Bar dataKey="bookingCount" fill="#14b8a6" radius={[4, 4, 0, 0]} name="Lượt đặt" />
                </BarChart></ResponsiveContainer></CardContent></Card>
        </div>
    );
}

// ==================== Requests Report Tab ====================
function RequestsReportTab({ period }: { period: string }) {
    const { data, isLoading } = useQuery({
        queryKey: ['report-requests', period],
        queryFn: () => api.get(`/reports/requests?period=${period}`).then(r => r.data),
    });
    if (isLoading) return <ReportSkeleton />;
    if (!data) return <div className="text-center py-8 text-muted-foreground">Không có dữ liệu</div>;
    return (
        <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-4">
                <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Tổng yêu cầu</CardTitle></CardHeader>
                    <CardContent><div className="text-2xl font-bold">{data.summary.totalRequests}</div></CardContent></Card>
                <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Đã duyệt</CardTitle></CardHeader>
                    <CardContent><div className="text-2xl font-bold text-green-600">{data.summary.approved}</div></CardContent></Card>
                <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Chờ duyệt</CardTitle></CardHeader>
                    <CardContent><div className="text-2xl font-bold text-yellow-600">{data.summary.pending}</div></CardContent></Card>
                <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Tỷ lệ duyệt</CardTitle></CardHeader>
                    <CardContent><div className="text-2xl font-bold">{data.summary.approvalRate}</div></CardContent></Card>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
                <Card><CardHeader><CardTitle>Theo loại yêu cầu</CardTitle></CardHeader><CardContent>
                    <ResponsiveContainer width="100%" height={250}><PieChart>
                        <Pie data={data.byType} dataKey="count" nameKey="label" cx="50%" cy="50%" outerRadius={80} label>
                            {data.byType?.map((_: any, i: number) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                        </Pie><Tooltip /><Legend /></PieChart></ResponsiveContainer></CardContent></Card>
                <Card><CardHeader><CardTitle>Theo trạng thái</CardTitle></CardHeader><CardContent>
                    <ResponsiveContainer width="100%" height={250}><BarChart data={data.byStatus}>
                        <CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="label" fontSize={11} /><YAxis /><Tooltip />
                        <Bar dataKey="count" fill="#f97316" radius={[4, 4, 0, 0]} name="Số lượng" />
                    </BarChart></ResponsiveContainer></CardContent></Card>
            </div>
        </div>
    );
}

// ==================== Meals Report Tab ====================
function MealReportTab({ period }: { period: string }) {
    const { data, isLoading } = useQuery({
        queryKey: ['report-meal', period],
        queryFn: () => api.get(`/reports/meal?period=${period}`).then(r => r.data),
    });
    if (isLoading) return <ReportSkeleton />;
    if (!data) return <div className="text-center py-8 text-muted-foreground">Không có dữ liệu</div>;
    return (
        <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-4">
                <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Tổng đăng ký</CardTitle></CardHeader>
                    <CardContent><div className="text-2xl font-bold">{data.summary.totalRegistrations}</div></CardContent></Card>
                <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Đã ĐK</CardTitle></CardHeader>
                    <CardContent><div className="text-2xl font-bold text-green-600">{data.summary.registered}</div></CardContent></Card>
                <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Đã hủy</CardTitle></CardHeader>
                    <CardContent><div className="text-2xl font-bold text-red-600">{data.summary.cancelled}</div></CardContent></Card>
                <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Chi phí ước tính</CardTitle></CardHeader>
                    <CardContent><div className="text-xl font-bold text-blue-600">{data.summary.estimatedCost}</div></CardContent></Card>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
                <Card><CardHeader><CardTitle>Theo ca ăn</CardTitle></CardHeader><CardContent>
                    <ResponsiveContainer width="100%" height={250}><BarChart data={data.bySession}>
                        <CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="sessionName" fontSize={11} /><YAxis /><Tooltip />
                        <Bar dataKey="count" fill="#ec4899" radius={[4, 4, 0, 0]} name="Suất" />
                    </BarChart></ResponsiveContainer></CardContent></Card>
                <Card><CardHeader><CardTitle>Theo trạng thái</CardTitle></CardHeader><CardContent>
                    <ResponsiveContainer width="100%" height={250}><PieChart>
                        <Pie data={data.byStatus} dataKey="count" nameKey="label" cx="50%" cy="50%" outerRadius={80} label>
                            {data.byStatus?.map((_: any, i: number) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                        </Pie><Tooltip /><Legend /></PieChart></ResponsiveContainer></CardContent></Card>
            </div>
        </div>
    );
}

// ==================== Ticket Report Tab ====================
function TicketReportTab({ period }: { period: string }) {
    const { data, isLoading } = useQuery({
        queryKey: ['report-ticket', period],
        queryFn: () => api.get(`/reports/ticket?period=${period}`).then(r => r.data),
    });
    if (isLoading) return <ReportSkeleton />;
    if (!data) return <div className="text-center py-8 text-muted-foreground">Không có dữ liệu</div>;
    return (
        <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-4">
                <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Tổng ticket</CardTitle></CardHeader>
                    <CardContent><div className="text-2xl font-bold">{data.summary.totalTickets}</div></CardContent></Card>
                <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Đã giải quyết</CardTitle></CardHeader>
                    <CardContent><div className="text-2xl font-bold text-green-600">{data.summary.resolved}</div></CardContent></Card>
                <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Avg giải quyết</CardTitle></CardHeader>
                    <CardContent><div className="text-2xl font-bold">{data.summary.avgResolutionHours}h</div></CardContent></Card>
                <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">SLA đạt</CardTitle></CardHeader>
                    <CardContent><div className="text-2xl font-bold text-blue-600">{data.summary.slaCompliancePercent}%</div></CardContent></Card>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
                <Card><CardHeader><CardTitle>Theo mức ưu tiên</CardTitle></CardHeader><CardContent>
                    <ResponsiveContainer width="100%" height={250}><BarChart data={data.byPriority}>
                        <CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="label" fontSize={11} /><YAxis /><Tooltip />
                        <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} name="Ticket" />
                    </BarChart></ResponsiveContainer></CardContent></Card>
                <Card><CardHeader><CardTitle>Theo danh mục</CardTitle></CardHeader><CardContent>
                    <ResponsiveContainer width="100%" height={250}><PieChart>
                        <Pie data={data.byCategory} dataKey="count" nameKey="categoryName" cx="50%" cy="50%" outerRadius={80} label>
                            {data.byCategory?.map((_: any, i: number) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                        </Pie><Tooltip /><Legend /></PieChart></ResponsiveContainer></CardContent></Card>
            </div>
        </div>
    );
}

// ==================== MAIN PAGE ====================
export default function ReportsPage() {
    const [period, setPeriod] = useState('monthly');

    const handleExportHR = async () => {
        try {
            const res = await api.get(`/reports/export/hr?period=${period}`, { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([res.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `bao-cao-nhan-su-${period}.xlsx`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (err) {
            console.error('Export failed:', err);
        }
    };

    return (
        <PermissionGate permissions={['REPORT_VIEW']}>
            <div className="flex flex-col h-[calc(100vh-0rem)] space-y-4 p-2 bg-background">
                <div className="bg-card/60 backdrop-blur-xl border border-border/50 shadow-sm rounded-xl p-2 animate-in fade-in slide-in-from-top-4 duration-500">
                <PageHeader
                    title="Trung tâm Báo cáo"
                    icon={
                        <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-xl flex items-center justify-center shadow-sm bg-gradient-to-br from-indigo-500 to-indigo-700">
                            <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5 text-white" style={{ margin: '2px' }} />
                        </div>
                    }
                    className="mb-0 border-none bg-transparent p-0 shadow-none"
                >
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1 rounded-lg bg-muted p-1">
                            {PERIOD_OPTIONS.map(opt => (
                                <button
                                    key={opt.value}
                                    onClick={() => setPeriod(opt.value)}
                                    className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${period === opt.value
                                        ? 'bg-background text-foreground shadow-sm'
                                        : 'text-muted-foreground hover:text-foreground'
                                        }`}
                                >
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                        <button
                            onClick={handleExportHR}
                            className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                        >
                            <Download className="h-4 w-4" />
                            Xuất Excel
                        </button>
                    </div>
                </PageHeader>
                </div>
                
                <div className="flex-1 overflow-y-auto min-h-0 space-y-4 custom-scrollbar pr-1 pb-2">

                <Tabs defaultValue="hr" className="space-y-4">
                    <TabsList className="flex w-full overflow-x-auto">
                        <TabsTrigger value="hr" className="flex items-center gap-1.5 text-xs">
                            <Users className="h-3.5 w-3.5" /> Nhân sự
                        </TabsTrigger>
                        <TabsTrigger value="attendance" className="flex items-center gap-1.5 text-xs">
                            <Calendar className="h-3.5 w-3.5" /> Chấm công
                        </TabsTrigger>
                        <TabsTrigger value="leave" className="flex items-center gap-1.5 text-xs">
                            <FileText className="h-3.5 w-3.5" /> Nghỉ phép
                        </TabsTrigger>
                        <TabsTrigger value="booking" className="flex items-center gap-1.5 text-xs">
                            <DoorOpen className="h-3.5 w-3.5" /> Đặt phòng
                        </TabsTrigger>
                        <TabsTrigger value="projects" className="flex items-center gap-1.5 text-xs">
                            <FolderKanban className="h-3.5 w-3.5" /> Dự án
                        </TabsTrigger>
                        <TabsTrigger value="car-booking" className="flex items-center gap-1.5 text-xs">
                            <Car className="h-3.5 w-3.5" /> Xe công
                        </TabsTrigger>
                        <TabsTrigger value="requests" className="flex items-center gap-1.5 text-xs">
                            <Send className="h-3.5 w-3.5" /> Yêu cầu
                        </TabsTrigger>
                        <TabsTrigger value="meal" className="flex items-center gap-1.5 text-xs">
                            <UtensilsCrossed className="h-3.5 w-3.5" /> Suất ăn
                        </TabsTrigger>
                        <TabsTrigger value="ticket" className="flex items-center gap-1.5 text-xs">
                            <Headphones className="h-3.5 w-3.5" /> IT Ticket
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="hr"><HRReportTab period={period} /></TabsContent>
                    <TabsContent value="attendance"><AttendanceReportTab period={period} /></TabsContent>
                    <TabsContent value="leave"><LeaveReportTab period={period} /></TabsContent>
                    <TabsContent value="booking"><BookingReportTab period={period} /></TabsContent>
                    <TabsContent value="projects"><ProjectsReportTab period={period} /></TabsContent>
                    <TabsContent value="car-booking"><CarBookingReportTab period={period} /></TabsContent>
                    <TabsContent value="requests"><RequestsReportTab period={period} /></TabsContent>
                    <TabsContent value="meal"><MealReportTab period={period} /></TabsContent>
                    <TabsContent value="ticket"><TicketReportTab period={period} /></TabsContent>
                </Tabs>
                </div>
            </div>
        </PermissionGate>
    );
}
