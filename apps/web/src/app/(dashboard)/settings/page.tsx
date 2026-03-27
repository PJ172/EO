"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import {
    UserCog, Shield, Activity, Settings,
    Building2, Factory, Briefcase, GitMerge,
    Search, ArrowRight, Layers, Monitor, Trash2,
    FolderOpen, MapPin,
} from "lucide-react";
import { MODULE_IDENTITIES } from "@/config/module-identities";
import { PageHeader } from "@/components/ui/page-header";
import { SearchBar } from "@/components/ui/search-bar";

interface SettingItem {
    title: string;
    description: string;
    href: string;
    icon: React.ComponentType<{ className?: string }>;
    color: string;
    bgColor: string;
}

interface SettingGroup {
    title: string;
    items: SettingItem[];
}

const settingGroups: SettingGroup[] = [
    {
        title: "TỔ CHỨC & NHÂN SỰ",
        items: [
            { title: "CÔNG TY", description: "Công ty thành viên", href: "/settings/companies", icon: MODULE_IDENTITIES.COMPANY.icon, color: MODULE_IDENTITIES.COMPANY.color, bgColor: MODULE_IDENTITIES.COMPANY.bgColor },
            { title: "NHÀ MÁY", description: "Nhà máy, chi nhánh", href: "/settings/factories", icon: MODULE_IDENTITIES.FACTORY.icon, color: MODULE_IDENTITIES.FACTORY.color, bgColor: MODULE_IDENTITIES.FACTORY.bgColor },
            { title: "KHỐI", description: "Khối chức năng", href: "/settings/divisions", icon: MODULE_IDENTITIES.DIVISION.icon, color: MODULE_IDENTITIES.DIVISION.color, bgColor: MODULE_IDENTITIES.DIVISION.bgColor },
            { title: "PHÒNG BAN", description: "Phòng ban nội bộ", href: "/settings/departments", icon: MODULE_IDENTITIES.DEPARTMENT.icon, color: MODULE_IDENTITIES.DEPARTMENT.color, bgColor: MODULE_IDENTITIES.DEPARTMENT.bgColor },
            { title: "BỘ PHẬN", description: "Bộ phận trong cấu trúc", href: "/settings/sections", icon: MODULE_IDENTITIES.SECTION.icon, color: MODULE_IDENTITIES.SECTION.color, bgColor: MODULE_IDENTITIES.SECTION.bgColor },
            { title: "CHỨC DANH", description: "Chức danh, vị trí", href: "/settings/job-titles", icon: MODULE_IDENTITIES.JOB_TITLE.icon, color: MODULE_IDENTITIES.JOB_TITLE.color, bgColor: MODULE_IDENTITIES.JOB_TITLE.bgColor },
            { title: "VỊ TRÍ CÔNG VIỆC", description: "Vị trí tổ chức, phân công ca", href: "/settings/job-positions", icon: Layers, color: "text-cyan-600 dark:text-cyan-400", bgColor: "bg-cyan-500/10" },
        ]
    },
    {
        title: "CNTT",
        items: [
            { title: "DANH MỤC CNTT", description: "Quản lý danh mục thiết bị CNTT", href: "/settings/categories", icon: FolderOpen, color: "text-teal-600 dark:text-teal-400", bgColor: "bg-teal-500/10" },
            { title: "VỊ TRÍ CNTT", description: "Quản lý vị trí lắp đặt thiết bị", href: "/settings/locations", icon: MapPin, color: "text-violet-600 dark:text-violet-400", bgColor: "bg-violet-500/10" },
        ]
    },
    {
        title: "QUY TRÌNH",
        items: [
            { title: "QUY TRÌNH IT TICKET", description: "Luồng duyệt tự động cho IT Ticket", href: "/workflows/workflow-itticket", icon: GitMerge, color: "text-rose-600 dark:text-rose-400", bgColor: "bg-rose-500/10" },
        ]
    },
    {
        title: "QUẢN TRỊ HỆ THỐNG",
        items: [
            { title: "NGƯỜI DÙNG", description: "Tài khoản, mật khẩu", href: "/settings/users", icon: UserCog, color: "text-violet-600 dark:text-violet-400", bgColor: "bg-violet-500/10" },
            { title: "PHÂN QUYỀN", description: "Nhóm quyền hạn", href: "/settings/roles", icon: Shield, color: "text-fuchsia-600 dark:text-fuchsia-400", bgColor: "bg-fuchsia-500/10" },
            { title: "QUẢN LÝ GIAO DIỆN", description: "Bật/tắt module hiển thị", href: "/settings/appearance", icon: Monitor, color: "text-blue-600 dark:text-blue-400", bgColor: "bg-blue-500/10" },
            { title: "NHẬT KÝ HOẠT ĐỘNG", description: "Lịch sử thao tác", href: "/settings/audit-logs", icon: Activity, color: "text-slate-600 dark:text-slate-400", bgColor: "bg-slate-500/10" },
            { title: "NHẬT KÝ HỆ THỐNG", description: "Log hệ thống, lỗi", href: "/settings/audit-systems", icon: Monitor, color: "text-orange-600 dark:text-orange-400", bgColor: "bg-orange-500/10" },
            { title: "THÙNG RÁC", description: "Dữ liệu đã xóa, khôi phục", href: "/settings/trash", icon: Trash2, color: "text-rose-600 dark:text-rose-400", bgColor: "bg-rose-500/10" },
        ]
    }
];

export default function SettingsPage() {
    const [searchQuery, setSearchQuery] = useState("");

    const filteredGroups = useMemo(() => {
        if (!searchQuery.trim()) return settingGroups;
        const q = searchQuery.toLowerCase();
        return settingGroups
            .map((group) => ({
                ...group,
                items: group.items.filter(
                    (item) =>
                        item.title.toLowerCase().includes(q) ||
                        item.description.toLowerCase().includes(q)
                ),
            }))
            .filter((group) => group.items.length > 0);
    }, [searchQuery]);

    return (
        <div className="flex flex-col h-[calc(100vh-0rem)] space-y-4 p-2 bg-background">
            <div className="bg-card/60 backdrop-blur-xl border border-border/50 shadow-sm rounded-xl p-2 animate-in fade-in slide-in-from-top-4 duration-500">
            <PageHeader
                title="CÀI ĐẶT"
                icon={
                    <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-xl flex items-center justify-center shadow-sm bg-gradient-to-br from-slate-500 to-slate-700">
                        <Settings className="h-4 w-4 sm:h-5 sm:w-5 text-white" style={{ margin: '2px' }} />
                    </div>
                }
                className="mb-0 border-none bg-transparent p-0 shadow-none"
                search={
                    <SearchBar
                        placeholder="Tìm kiếm cài đặt..."
                        value={searchQuery}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
                    />
                }
            />
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto min-h-0 space-y-4 custom-scrollbar pr-1 pb-2">
                <div className="max-w-5xl mx-auto space-y-6">
                    {filteredGroups.length === 0 && (
                        <div className="text-center py-12">
                            <Search className="h-10 w-10 text-muted-foreground/20 mx-auto mb-3" />
                            <p className="text-sm text-muted-foreground">Không tìm thấy mục nào.</p>
                        </div>
                    )}
                    {filteredGroups.map((group, gIdx) => (
                        <div key={gIdx} className="animate-in fade-in slide-in-from-bottom-4 duration-400" style={{ animationDelay: (gIdx * 60) + "ms", animationFillMode: "both" }}>
                            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-2.5 pl-1">
                                {group.title}
                            </h2>
                            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                                {group.items.map((item) => {
                                    const Icon = item.icon;
                                    return (
                                        <Link key={item.href} href={item.href} className="group outline-none">
                                            <div className="flex items-center gap-3 px-3.5 py-3 rounded-xl border border-transparent bg-card/50 hover:bg-accent/50 hover:border-border/60 transition-all duration-200 group-hover:shadow-sm">
                                                <div className={[
                                                    "h-9 w-9 rounded-lg flex items-center justify-center shrink-0",
                                                    "transition-transform duration-200 group-hover:scale-110",
                                                    item.bgColor, item.color,
                                                ].join(" ")}>
                                                    <Icon className="h-4.5 w-4.5" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">
                                                        {item.title}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground truncate">
                                                        {item.description}
                                                    </p>
                                                </div>
                                                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/30 shrink-0 transition-all duration-200 group-hover:text-primary/60 group-hover:translate-x-0.5" />
                                            </div>
                                        </Link>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
