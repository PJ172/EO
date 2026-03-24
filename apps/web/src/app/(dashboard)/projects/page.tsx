"use client";

import { useState } from "react";
import { useProjects, useDeleteProject, Project, ProjectStatus } from "@/services/projects.service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Search, Filter, FileDown, ArrowUpDown, ChevronUp, ChevronDown, Trash2, LayoutList, LayoutGrid, Upload, Loader2, UserCircle, Mail, Key, Shield, ShieldCheck, CheckCircle2, XCircle, Pencil, MoreHorizontal, FolderKanban, RotateCw, Calendar, Kanban } from "lucide-react";
import { SearchBar } from "@/components/ui/search-bar";
import Link from "next/link";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useRouter } from "next/navigation";
import { toast } from "sonner";


export default function ProjectsPage() {
    const [search, setSearch] = useState("");
    const [sort, setSort] = useState<{ sortBy: string, order: "asc" | "desc" }>({ sortBy: "createdAt", order: "desc" });
    const router = useRouter();
    const { data: projects, isLoading, refetch } = useProjects(false);
    const deleteMutation = useDeleteProject();

    const toggleSort = (field: string) => {
        setSort(prev => ({
            sortBy: field,
            order: prev.sortBy === field && prev.order === "asc" ? "desc" : "asc"
        }));
    };

    const SortIcon = ({ field }: { field: string }) => {
        if (sort.sortBy !== field) return <ArrowUpDown className="ml-1 h-3.5 w-3.5 text-muted-foreground/50 group-hover:text-muted-foreground group-hover:bg-muted/50 rounded" />;
        return sort.order === "asc"
            ? <ChevronUp className="ml-1 h-3.5 w-3.5 text-foreground bg-muted/50 rounded" />
            : <ChevronDown className="ml-1 h-3.5 w-3.5 text-foreground bg-muted/50 rounded" />;
    };

    const handleExport = () => toast.info("Tính năng Xuất Excel đang được phát triển...");
    const handleImport = () => toast.info("Tính năng Nhập Excel đang được phát triển...");

    const getStatusBadge = (status: ProjectStatus) => {
        switch (status) {
            case ProjectStatus.PLANNING: return <Badge variant="outline" className="bg-yellow-100 text-yellow-800">Lập kế hoạch</Badge>;
            case ProjectStatus.IN_PROGRESS: return <Badge className="bg-blue-500">Đang thực hiện</Badge>;
            case ProjectStatus.ON_HOLD: return <Badge variant="secondary">Tạm hoãn</Badge>;
            case ProjectStatus.COMPLETED: return <Badge className="bg-green-500">Hoàn thành</Badge>;
            case ProjectStatus.CANCELLED: return <Badge variant="destructive">Hủy bỏ</Badge>;
            default: return <Badge variant="outline">{status}</Badge>;
        }
    };

    const filteredProjects = projects?.filter((p: Project) =>
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.code.toLowerCase().includes(search.toLowerCase())
    ).sort((a: any, b: any) => {
        const aVal = sort.sortBy.split('.').reduce((obj, key) => obj?.[key], a) || '';
        const bVal = sort.sortBy.split('.').reduce((obj, key) => obj?.[key], b) || '';
        if (aVal < bVal) return sort.order === "asc" ? -1 : 1;
        if (aVal > bVal) return sort.order === "asc" ? 1 : -1;
        return 0;
    });

    return (
        <div className="flex flex-col h-[calc(100vh-0rem)] space-y-4 p-2 bg-background">
            <div className="bg-card/60 backdrop-blur-xl border border-border/50 shadow-sm rounded-xl p-2 animate-in fade-in slide-in-from-top-4 duration-500">
            <PageHeader
                title="Quản lý Dự án"
                icon={
                    <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-xl flex items-center justify-center shadow-sm bg-gradient-to-br from-pink-500 to-pink-700">
                        <Kanban className="h-4 w-4 sm:h-5 sm:w-5 text-white" style={{ margin: '2px' }} />
                    </div>
                }
                className="mb-0 border-none bg-transparent p-0 shadow-none"
                onRefresh={refetch}
                isRefreshing={isLoading}
                search={
                    <SearchBar
                        placeholder="Tìm kiếm dự án..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                }
            >
                <Button variant="outline" onClick={handleExport} className="h-10">
                    <FileDown className="mr-2 h-4 w-4" /> Xuất Excel
                </Button>
                <Button onClick={() => router.push('/projects/new')} className="h-10">
                    <Plus className="mr-2 h-4 w-4" /> Tạo dự án
                </Button>
            </PageHeader>
            </div>

            <div className="flex-1 overflow-y-auto min-h-0 space-y-4 custom-scrollbar pr-1 pb-2">
            <div className="rounded-md border bg-card">
                <div className="p-4 border-b flex items-center gap-2">
                    <FolderKanban className="h-5 w-5" />
                    <h3 className="font-semibold leading-none tracking-tight">Danh sách dự án</h3>
                </div>
                <div className="p-0">
                    {isLoading ? (
                        <div className="flex justify-center py-8">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                    ) : (
                        <Table>
                            <TableHeader className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 shadow-[0_1px_2px_rgba(0,0,0,0.04)] ring-1 ring-border/50">
                                <TableRow className="hover:bg-transparent border-none">
                                    <TableHead className="w-[120px] h-10 font-medium cursor-pointer hover:bg-muted/80 transition-colors group" onClick={() => toggleSort("code")}>
                                        <div className="flex items-center">
                                            Mã dự án <SortIcon field="code" />
                                        </div>
                                    </TableHead>
                                    <TableHead className="h-10 font-medium cursor-pointer hover:bg-muted/80 transition-colors group" onClick={() => toggleSort("name")}>
                                        <div className="flex items-center">
                                            Tên dự án <SortIcon field="name" />
                                        </div>
                                    </TableHead>
                                    <TableHead className="h-10 font-medium cursor-pointer hover:bg-muted/80 transition-colors group" onClick={() => toggleSort("manager.fullName")}>
                                        <div className="flex items-center">
                                            Người quản lý <SortIcon field="manager.fullName" />
                                        </div>
                                    </TableHead>
                                    <TableHead className="h-10 font-medium cursor-pointer hover:bg-muted/80 transition-colors group" onClick={() => toggleSort("startDate")}>
                                        <div className="flex items-center">
                                            Ngày bắt đầu <SortIcon field="startDate" />
                                        </div>
                                    </TableHead>
                                    <TableHead className="h-10 font-medium cursor-pointer hover:bg-muted/80 transition-colors group" onClick={() => toggleSort("status")}>
                                        <div className="flex items-center">
                                            Trạng thái <SortIcon field="status" />
                                        </div>
                                    </TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center py-8">Đang tải...</TableCell>
                                    </TableRow>
                                ) : filteredProjects?.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Không tìm thấy dự án nào</TableCell>
                                    </TableRow>
                                ) : (
                                    filteredProjects?.map((project: Project) => (
                                        <TableRow key={project.id}>
                                            <TableCell className="font-mono text-xs">{project.code}</TableCell>
                                            <TableCell className="font-medium">
                                                <Link href={`/projects/${project.id}`} className="hover:underline text-primary">
                                                    {project.name}
                                                </Link>
                                                <div className="text-xs text-muted-foreground truncate max-w-[300px]">
                                                    {project.description}
                                                </div>
                                            </TableCell>
                                            <TableCell>{project.manager?.fullName || "N/A"}</TableCell>
                                            <TableCell>
                                                <div className="flex items-center text-sm">
                                                    <Calendar className="mr-2 h-3 w-3 text-muted-foreground" />
                                                    {format(new Date(project.startDate), "dd/MM/yyyy", { locale: vi })}
                                                </div>
                                            </TableCell>
                                            <TableCell>{getStatusBadge(project.status)}</TableCell>
                                            <TableCell className="text-right">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon">
                                                            <MoreHorizontal className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuItem asChild>
                                                            <Link href={`/projects/${project.id}`}>Chi tiết</Link>
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem asChild>
                                                            <Link href={`/projects/${project.id}/gantt`}>Biểu đồ Gantt</Link>
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem
                                                            className="text-rose-600"
                                                            onClick={async () => {
                                                                if (confirm('Xóa dự án này?')) {
                                                                    await deleteMutation.mutateAsync(project.id);
                                                                }
                                                            }}
                                                        >
                                                            <Trash2 className="h-4 w-4 mr-2" /> Xóa
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    )}
                </div>
            </div>
            </div>
        </div>
    );
}
