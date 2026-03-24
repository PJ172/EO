import {
    Building2,
    Factory,
    Layers,
    Users,
    Network,
    Briefcase,
    UserCircle,
    LucideIcon
} from "lucide-react";

export interface ModuleIdentity {
    id: string;
    label: string;
    icon: LucideIcon;
    color: string;           
    bgColor: string;         
    borderClass: string;
    solidBg: string;         // Vibrant gradient for icon containers (forms)
}

export const MODULE_IDENTITIES: Record<string, ModuleIdentity> = {
    COMPANY: {
        id: "COMPANY",
        label: "Công ty",
        icon: Building2,
        color: "text-blue-600 dark:text-blue-400",
        bgColor: "bg-blue-500/10",
        borderClass: "border-l-blue-500",
        solidBg: "bg-gradient-to-br from-blue-500 to-blue-700",
    },
    FACTORY: {
        id: "FACTORY",
        label: "Nhà máy",
        icon: Factory,
        color: "text-indigo-600 dark:text-indigo-400",
        bgColor: "bg-indigo-500/10",
        borderClass: "border-l-indigo-500",
        solidBg: "bg-gradient-to-br from-indigo-500 to-indigo-700",
    },
    DIVISION: {
        id: "DIVISION",
        label: "Khối",
        icon: Layers,
        color: "text-purple-600 dark:text-purple-400",
        bgColor: "bg-purple-500/10",
        borderClass: "border-l-purple-500",
        solidBg: "bg-gradient-to-br from-violet-500 to-purple-700",
    },
    DEPARTMENT: {
        id: "DEPARTMENT",
        label: "Phòng ban",
        icon: Users,
        color: "text-teal-600 dark:text-teal-400",
        bgColor: "bg-teal-500/10",
        borderClass: "border-l-teal-500",
        solidBg: "bg-gradient-to-br from-teal-500 to-teal-700",
    },
    SECTION: {
        id: "SECTION",
        label: "Bộ phận",
        icon: Network,
        color: "text-emerald-600 dark:text-emerald-400",
        bgColor: "bg-emerald-500/10",
        borderClass: "border-l-emerald-500",
        solidBg: "bg-gradient-to-br from-emerald-500 to-emerald-700",
    },
    JOB_TITLE: {
        id: "JOB_TITLE",
        label: "Chức vụ",
        icon: Briefcase,
        color: "text-amber-600 dark:text-amber-400",
        bgColor: "bg-amber-500/10",
        borderClass: "border-l-amber-500",
        solidBg: "bg-gradient-to-br from-amber-500 to-orange-600",
    },
    EMPLOYEE: {
        id: "EMPLOYEE",
        label: "Nhân viên",
        icon: UserCircle,
        color: "text-sky-600 dark:text-sky-400",
        bgColor: "bg-sky-500/10",
        borderClass: "border-l-sky-500",
        solidBg: "bg-gradient-to-br from-sky-500 to-sky-700",
    }
};
