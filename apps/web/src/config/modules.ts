/**
 * Module Definitions
 * 
 * This file defines all available modules in the application.
 * Each module can be enabled/disabled via feature flags.
 */

import {
    LayoutDashboard,
    Users,
    Building2,
    FileText,
    CalendarDays,
    DoorOpen,
    Wallet,
    Clock,
    UserPlus,
    GraduationCap,
    Settings,
    ScrollText,
} from "lucide-react";
import { ModuleDefinition } from "@/lib/module-registry";

// Core Dashboard Module
export const dashboardModule: ModuleDefinition = {
    id: "dashboard",
    name: "Dashboard",
    description: "Main dashboard with overview and KPIs",
    version: "1.0.0",
    icon: LayoutDashboard,
    status: "active",
    routes: [
        { path: "/dashboard", label: "Dashboard", exact: true },
    ],
    menuItems: [
        {
            id: "dashboard",
            label: "Dashboard",
            href: "/dashboard",
            icon: LayoutDashboard,
        },
    ],
};

// HR Module
export const hrModule: ModuleDefinition = {
    id: "hr",
    name: "Nhân sự",
    description: "Employee and department management",
    version: "1.0.0",
    icon: Users,
    featureFlag: "ENABLE_HR_MODULE",
    status: "active",
    requiredPermissions: ["EMPLOYEE_READ"],
    routes: [
        { path: "/employees", label: "Nhân viên" },
        { path: "/departments", label: "Phòng ban" },
    ],
    menuItems: [
        {
            id: "employees",
            label: "Nhân viên",
            href: "/employees",
            icon: Users,
        },
        {
            id: "departments",
            label: "Phòng ban",
            href: "/departments",
            icon: Building2,
        },
    ],
};

// Documents Module
export const documentsModule: ModuleDefinition = {
    id: "documents",
    name: "Tài liệu",
    description: "Documents, policies and processes management",
    version: "1.0.0",
    icon: FileText,
    featureFlag: "ENABLE_DOCUMENTS_MODULE",
    status: "active",
    requiredPermissions: ["DOCUMENT_READ"],
    routes: [
        { path: "/documents", label: "Tài liệu" },
    ],
    menuItems: [
        {
            id: "documents",
            label: "Tài liệu",
            href: "/documents",
            icon: FileText,
        },
    ],
};

// Leave Module
export const leaveModule: ModuleDefinition = {
    id: "leave",
    name: "Nghỉ phép",
    description: "Leave request and approval management",
    version: "1.0.0",
    icon: CalendarDays,
    featureFlag: "ENABLE_LEAVE_MODULE",
    status: "active",
    requiredPermissions: ["LEAVE_VIEW"],
    routes: [
        { path: "/leaves", label: "Nghỉ phép" },
    ],
    menuItems: [
        {
            id: "leaves",
            label: "Nghỉ phép",
            href: "/leaves",
            icon: CalendarDays,
        },
    ],
};

// Booking Module
export const bookingModule: ModuleDefinition = {
    id: "booking",
    name: "Đặt phòng",
    description: "Meeting room booking management",
    version: "1.0.0",
    icon: DoorOpen,
    featureFlag: "ENABLE_BOOKING_MODULE",
    status: "active",
    requiredPermissions: ["ROOM_VIEW"],
    routes: [
        { path: "/bookings", label: "Đặt phòng" },
    ],
    menuItems: [
        {
            id: "bookings",
            label: "Đặt phòng",
            href: "/bookings",
            icon: DoorOpen,
        },
    ],
};

// ============================================
// FUTURE MODULES (Coming Soon)
// ============================================

// Payroll Module
export const payrollModule: ModuleDefinition = {
    id: "payroll",
    name: "Bảng lương",
    description: "Payroll and compensation management",
    version: "0.1.0",
    icon: Wallet,
    featureFlag: "ENABLE_PAYROLL_MODULE",
    status: "coming_soon",
    dependencies: ["hr"],
    requiredRoles: ["ADMIN", "HR"],
    routes: [
        { path: "/payroll", label: "Bảng lương" },
    ],
    menuItems: [
        {
            id: "payroll",
            label: "Bảng lương",
            href: "/payroll",
            icon: Wallet,
        },
    ],
};

// Timesheet Module
export const timesheetModule: ModuleDefinition = {
    id: "timesheet",
    name: "Chấm công",
    description: "Time tracking and attendance management",
    version: "0.1.0",
    icon: Clock,
    featureFlag: "ENABLE_TIMESHEET_MODULE",
    status: "coming_soon",
    dependencies: ["hr"],
    routes: [
        { path: "/timesheet", label: "Chấm công" },
    ],
    menuItems: [
        {
            id: "timesheet",
            label: "Chấm công",
            href: "/timesheet",
            icon: Clock,
        },
    ],
};

// Recruitment Module
export const recruitmentModule: ModuleDefinition = {
    id: "recruitment",
    name: "Tuyển dụng",
    description: "Recruitment and hiring management",
    version: "0.1.0",
    icon: UserPlus,
    featureFlag: "ENABLE_RECRUITMENT_MODULE",
    status: "coming_soon",
    dependencies: ["hr"],
    requiredRoles: ["ADMIN", "HR"],
    routes: [
        { path: "/recruitment", label: "Tuyển dụng" },
    ],
    menuItems: [
        {
            id: "recruitment",
            label: "Tuyển dụng",
            href: "/recruitment",
            icon: UserPlus,
        },
    ],
};

// Training Module
export const trainingModule: ModuleDefinition = {
    id: "training",
    name: "Đào tạo",
    description: "Training and development management",
    version: "0.1.0",
    icon: GraduationCap,
    featureFlag: "ENABLE_TRAINING_MODULE",
    status: "coming_soon",
    dependencies: ["hr"],
    routes: [
        { path: "/training", label: "Đào tạo" },
    ],
    menuItems: [
        {
            id: "training",
            label: "Đào tạo",
            href: "/training",
            icon: GraduationCap,
        },
    ],
};

// Admin Module
export const adminModule: ModuleDefinition = {
    id: "admin",
    name: "Quản trị",
    description: "System administration and settings",
    version: "1.0.0",
    icon: Settings,
    status: "active",
    requiredRoles: ["ADMIN"],
    routes: [
        { path: "/admin/settings", label: "Cài đặt" },
        { path: "/admin/audit-logs", label: "Lịch sử hoạt động" },
        { path: "/admin/feature-flags", label: "Tính năng" },
    ],
    menuItems: [
        {
            id: "admin-settings",
            label: "Cài đặt",
            href: "/admin/settings",
            icon: Settings,
        },
        {
            id: "admin-audit",
            label: "Audit Logs",
            href: "/admin/audit-logs",
            icon: ScrollText,
        },
    ],
};

// All modules array
export const allModules: ModuleDefinition[] = [
    dashboardModule,
    hrModule,
    documentsModule,
    leaveModule,
    bookingModule,
    payrollModule,
    timesheetModule,
    recruitmentModule,
    trainingModule,
    adminModule,
];

// Group modules by category
export const moduleGroups = {
    core: [dashboardModule],
    hr: [hrModule, documentsModule],
    operations: [leaveModule, bookingModule],
    future: [payrollModule, timesheetModule, recruitmentModule, trainingModule],
    admin: [adminModule],
};
