"use client";

import React from "react";
import { useAuth } from "@/contexts/auth-context";
import { useEmployee } from "@/services/employee.service";
import { EmployeeAvatar } from "@/components/ui/employee-avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
    User, Mail, Phone, Building2, Briefcase, Calendar,
    Shield, Key, MapPin, CreditCard, Hash, Heart,
    GraduationCap, FileText, Clock, ArrowRight, Pencil,
} from "lucide-react";

const STATUS_MAP: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
    PROBATION: { label: "Thử việc", variant: "secondary" },
    OFFICIAL: { label: "Chính thức", variant: "default" },
    SEASONAL: { label: "Thời vụ", variant: "outline" },
    RESIGNED: { label: "Đã nghỉ", variant: "destructive" },
    MATERNITY_LEAVE: { label: "Nghỉ thai sản", variant: "secondary" },
};

const GENDER_MAP: Record<string, string> = {
    MALE: "Nam",
    FEMALE: "Nữ",
    OTHER: "Khác",
};

const EDUCATION_MAP: Record<string, string> = {
    PRIMARY: "Tiểu học",
    SECONDARY: "THCS",
    HIGH_SCHOOL: "THPT",
    VOCATIONAL: "Trung cấp",
    COLLEGE: "Cao đẳng",
    UNIVERSITY: "Đại học",
    MASTER: "Thạc sĩ",
    DOCTOR: "Tiến sĩ",
};

function InfoRow({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value?: string | null }) {
    return (
        <div className="flex items-start gap-3 py-3">
            <div className="p-2 rounded-lg bg-muted/60 text-muted-foreground shrink-0">
                <Icon className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{label}</p>
                <p className="text-sm font-medium text-foreground mt-0.5 truncate">{value || "—"}</p>
            </div>
        </div>
    );
}

function StatCard({ icon: Icon, label, value, color }: {
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    value: string;
    color: string;
}) {
    return (
        <div className="flex items-center gap-3 bg-card/60 backdrop-blur-md border border-border/50 rounded-xl px-4 py-3 shadow-sm">
            <div className={"p-2 rounded-lg " + color}>
                <Icon className="h-4 w-4" />
            </div>
            <div>
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="text-sm font-semibold">{value}</p>
            </div>
        </div>
    );
}

export default function ProfilePage() {
    const { user } = useAuth();
    const employeeId = user?.employee?.id || "";
    const { data: employee, isLoading } = useEmployee(employeeId);

    const displayName = employee?.fullName || user?.employee?.fullName || user?.username || "Người dùng";
    const departmentName = employee?.department?.name || user?.employee?.department?.name || "";
    const jobTitleName = employee?.jobTitle?.name || "";
    const status = employee?.employmentStatus || "OFFICIAL";
    const statusInfo = STATUS_MAP[status] || { label: status, variant: "outline" as const };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-[60vh]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
        );
    }

    return (
        <div className="flex flex-col flex-1 h-[calc(100vh-0rem)] bg-background/50 overflow-y-auto">
            {/* === HERO BANNER === */}
            <div className="relative overflow-hidden shrink-0">
                {/* Gradient Mesh Background */}
                <div className="absolute inset-0 bg-gradient-to-br from-violet-600/20 via-blue-500/15 to-cyan-400/10" />
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-bl from-fuchsia-500/10 to-transparent rounded-full blur-3xl" />
                <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-gradient-to-tr from-blue-500/10 to-transparent rounded-full blur-3xl" />
                <div className="absolute inset-0 bg-card/40 backdrop-blur-sm" />

                <div className="relative z-10 px-6 py-8 pt-10">
                    <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center gap-6">
                        {/* Avatar Area */}
                        <div className="relative group">
                            <div className="ring-4 ring-background/80 rounded-full shadow-2xl">
                                <EmployeeAvatar
                                    avatar={employee?.avatar || user?.employee?.avatar}
                                    fullName={displayName}
                                    className="h-24 w-24 text-2xl"
                                    fallbackClassName="bg-primary text-primary-foreground text-2xl"
                                />
                            </div>
                            <button className="absolute bottom-0 right-0 h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:scale-110">
                                <Pencil className="h-3.5 w-3.5" />
                            </button>
                        </div>

                        {/* Name & Role */}
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 flex-wrap">
                                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                                    {displayName}
                                </h1>
                                <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                            </div>
                            <p className="text-muted-foreground mt-1.5 text-base">
                                {jobTitleName && <span>{jobTitleName}</span>}
                                {jobTitleName && departmentName && <span className="mx-2 text-border">•</span>}
                                {departmentName && <span>{departmentName}</span>}
                            </p>
                            {user?.roles && user.roles.length > 0 && (
                                <div className="flex items-center gap-2 mt-3">
                                    <Shield className="h-3.5 w-3.5 text-muted-foreground" />
                                    <div className="flex gap-1.5 flex-wrap">
                                        {user.roles.map((role) => (
                                            <Badge key={role} variant="outline" className="text-xs font-normal">
                                                {role}
                                            </Badge>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* === STATS ROW === */}
            <div className="px-6 -mt-1">
                <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-3">
                    <StatCard
                        icon={Hash}
                        label="Mã nhân viên"
                        value={employee?.employeeCode || "—"}
                        color="bg-blue-500/10 text-blue-600 dark:text-blue-400"
                    />
                    <StatCard
                        icon={Calendar}
                        label="Ngày vào làm"
                        value={employee?.joinedAt ? new Date(employee.joinedAt).toLocaleDateString("vi-VN") : "—"}
                        color="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                    />
                    <StatCard
                        icon={Building2}
                        label="Phòng ban"
                        value={departmentName || "—"}
                        color="bg-violet-500/10 text-violet-600 dark:text-violet-400"
                    />
                    <StatCard
                        icon={Mail}
                        label="Email"
                        value={employee?.emailCompany || user?.email || "—"}
                        color="bg-amber-500/10 text-amber-600 dark:text-amber-400"
                    />
                </div>
            </div>

            {/* === TABS CONTENT === */}
            <div className="px-6 py-6 flex-1">
                <div className="max-w-7xl mx-auto">
                    <Tabs defaultValue="info" className="w-full">
                        <TabsList variant="line">
                            <TabsTrigger value="info">
                                <User className="h-4 w-4 mr-1.5" />
                                Thông tin chung
                            </TabsTrigger>
                            <TabsTrigger value="security">
                                <Key className="h-4 w-4 mr-1.5" />
                                Bảo mật
                            </TabsTrigger>
                        </TabsList>

                        {/* === TAB: Thông tin chung === */}
                        <TabsContent value="info" className="mt-6 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                            <div className="grid md:grid-cols-2 gap-6">
                                {/* Personal Info */}
                                <Card className="border-border/50 shadow-sm">
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-base flex items-center gap-2">
                                            <User className="h-4 w-4 text-primary" />
                                            Thông tin cá nhân
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-0 divide-y divide-border/50">
                                        <InfoRow icon={User} label="Họ và tên" value={displayName} />
                                        <InfoRow icon={User} label="Giới tính" value={employee?.gender ? GENDER_MAP[employee.gender] : undefined} />
                                        <InfoRow icon={Calendar} label="Ngày sinh" value={employee?.dob ? new Date(employee.dob).toLocaleDateString("vi-VN") : undefined} />
                                        <InfoRow icon={MapPin} label="Nơi sinh" value={employee?.birthPlace} />
                                        <InfoRow icon={Heart} label="Tình trạng hôn nhân" value={employee?.maritalStatus === "SINGLE" ? "Độc thân" : employee?.maritalStatus === "MARRIED" ? "Đã kết hôn" : employee?.maritalStatus} />
                                    </CardContent>
                                </Card>

                                {/* Work Info */}
                                <Card className="border-border/50 shadow-sm">
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-base flex items-center gap-2">
                                            <Briefcase className="h-4 w-4 text-primary" />
                                            Thông tin công việc
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-0 divide-y divide-border/50">
                                        <InfoRow icon={Hash} label="Mã nhân viên" value={employee?.employeeCode} />
                                        <InfoRow icon={Briefcase} label="Chức danh" value={jobTitleName} />
                                        <InfoRow icon={Building2} label="Phòng ban" value={departmentName} />
                                        <InfoRow icon={Building2} label="Bộ phận" value={employee?.section?.name} />
                                        <InfoRow icon={Building2} label="Nhà máy" value={employee?.factory?.name} />
                                        <InfoRow icon={User} label="Quản lý" value={employee?.manager?.fullName} />
                                    </CardContent>
                                </Card>

                                {/* Contact */}
                                <Card className="border-border/50 shadow-sm">
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-base flex items-center gap-2">
                                            <Phone className="h-4 w-4 text-primary" />
                                            Liên hệ
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-0 divide-y divide-border/50">
                                        <InfoRow icon={Phone} label="Điện thoại" value={employee?.phone} />
                                        <InfoRow icon={Mail} label="Email công ty" value={employee?.emailCompany} />
                                        <InfoRow icon={Mail} label="Email cá nhân" value={employee?.personalEmail} />
                                        <InfoRow icon={Phone} label="Liên hệ khẩn cấp" value={employee?.emergencyPhone} />
                                        <InfoRow icon={MapPin} label="Địa chỉ thường trú" value={employee?.permanentAddress} />
                                        <InfoRow icon={MapPin} label="Địa chỉ tạm trú" value={employee?.temporaryAddress} />
                                    </CardContent>
                                </Card>

                                {/* ID & Education */}
                                <Card className="border-border/50 shadow-sm">
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-base flex items-center gap-2">
                                            <CreditCard className="h-4 w-4 text-primary" />
                                            Giấy tờ & Học vấn
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-0 divide-y divide-border/50">
                                        <InfoRow icon={CreditCard} label="CCCD/CMND" value={employee?.nationalId} />
                                        <InfoRow icon={Calendar} label="Ngày cấp" value={employee?.dateOfIssue ? new Date(employee.dateOfIssue).toLocaleDateString("vi-VN") : undefined} />
                                        <InfoRow icon={MapPin} label="Nơi cấp" value={employee?.placeOfIssue} />
                                        <InfoRow icon={GraduationCap} label="Trình độ" value={employee?.education ? EDUCATION_MAP[employee.education] : undefined} />
                                        <InfoRow icon={GraduationCap} label="Chuyên ngành" value={employee?.major} />
                                        <InfoRow icon={GraduationCap} label="Trường" value={employee?.school} />
                                    </CardContent>
                                </Card>
                            </div>
                        </TabsContent>

                        {/* === TAB: Bảo mật === */}
                        <TabsContent value="security" className="mt-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                            <div className="max-w-2xl space-y-6">
                                <Card className="border-border/50 shadow-sm">
                                    <CardHeader>
                                        <CardTitle className="text-base flex items-center gap-2">
                                            <Key className="h-4 w-4 text-primary" />
                                            Đổi mật khẩu
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="currentPassword">Mật khẩu hiện tại</Label>
                                            <Input id="currentPassword" type="password" placeholder="••••••••" />
                                        </div>
                                        <Separator />
                                        <div className="space-y-2">
                                            <Label htmlFor="newPassword">Mật khẩu mới</Label>
                                            <Input id="newPassword" type="password" placeholder="••••••••" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="confirmPassword">Xác nhận mật khẩu mới</Label>
                                            <Input id="confirmPassword" type="password" placeholder="••••••••" />
                                        </div>
                                        <Button className="w-full mt-2">
                                            <Key className="h-4 w-4 mr-2" />
                                            Cập nhật mật khẩu
                                        </Button>
                                    </CardContent>
                                </Card>
                            </div>
                        </TabsContent>
                    </Tabs>
                </div>
            </div>
        </div>
    );
}
