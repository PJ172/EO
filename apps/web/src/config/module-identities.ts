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
    titleGradient: string;   // Gradient for title text via titleClassName
}

export const MODULE_IDENTITIES: Record<string, ModuleIdentity> = {
    COMPANY: {
        id: "COMPANY",
        label: "CÔNG TY",
        icon: Building2,
        color: "text-blue-600 dark:text-blue-400",
        bgColor: "bg-blue-500/10",
        borderClass: "border-l-blue-500",
        solidBg: "bg-gradient-to-br from-blue-500 to-blue-700",
        titleGradient: "from-blue-500 to-blue-700 dark:from-blue-400 dark:to-blue-300",
    },
    FACTORY: {
        id: "FACTORY",
        label: "NHÀ MÁY",
        icon: Factory,
        // Fix Purple Ban: indigo → cyan/sky
        color: "text-cyan-600 dark:text-cyan-400",
        bgColor: "bg-cyan-500/10",
        borderClass: "border-l-cyan-500",
        solidBg: "bg-gradient-to-br from-cyan-500 to-sky-700",
        titleGradient: "from-cyan-500 to-sky-700 dark:from-cyan-400 dark:to-sky-300",
    },
    DIVISION: {
        id: "DIVISION",
        label: "KHỐI",
        icon: Layers,
        // Fix Purple Ban: purple/violet → fuchsia→rose (không phải purple chính)
        color: "text-fuchsia-600 dark:text-fuchsia-400",
        bgColor: "bg-fuchsia-500/10",
        borderClass: "border-l-fuchsia-500",
        solidBg: "bg-gradient-to-br from-fuchsia-500 to-rose-600",
        titleGradient: "from-fuchsia-500 to-rose-600 dark:from-fuchsia-400 dark:to-rose-400",
    },
    DEPARTMENT: {
        id: "DEPARTMENT",
        label: "PHÒNG BAN",
        icon: Users,
        color: "text-teal-600 dark:text-teal-400",
        bgColor: "bg-teal-500/10",
        borderClass: "border-l-teal-500",
        solidBg: "bg-gradient-to-br from-teal-500 to-teal-700",
        titleGradient: "from-teal-500 to-teal-700 dark:from-teal-400 dark:to-teal-300",
    },
    SECTION: {
        id: "SECTION",
        label: "BỘ PHẬN",
        icon: Network,
        color: "text-emerald-600 dark:text-emerald-400",
        bgColor: "bg-emerald-500/10",
        borderClass: "border-l-emerald-500",
        solidBg: "bg-gradient-to-br from-emerald-500 to-emerald-700",
        titleGradient: "from-emerald-500 to-emerald-700 dark:from-emerald-400 dark:to-emerald-300",
    },
    JOB_TITLE: {
        id: "JOB_TITLE",
        label: "CHỨC DANH",
        icon: Briefcase,
        color: "text-amber-600 dark:text-amber-400",
        bgColor: "bg-amber-500/10",
        borderClass: "border-l-amber-500",
        solidBg: "bg-gradient-to-br from-amber-500 to-orange-600",
        titleGradient: "from-amber-500 to-orange-600 dark:from-amber-400 dark:to-orange-400",
    },
    EMPLOYEE: {
        id: "EMPLOYEE",
        label: "NHÂN VIÊN",
        icon: UserCircle,
        color: "text-sky-600 dark:text-sky-400",
        bgColor: "bg-sky-500/10",
        borderClass: "border-l-sky-500",
        solidBg: "bg-gradient-to-br from-sky-500 to-sky-700",
        titleGradient: "from-sky-500 to-sky-700 dark:from-sky-400 dark:to-sky-300",
    }
};
