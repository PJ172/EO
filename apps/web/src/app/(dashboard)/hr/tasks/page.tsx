"use client";

import { useQueryClient, useMutation, useQuery } from "@tanstack/react-query";
import { tasksApi } from "@/lib/api-client";
import { useMyTasks, useDeleteTask } from "@/services/tasks.service";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, CheckSquare, Loader2, Clock, AlertTriangle, CheckCircle, ListTodo, PlayCircle, Search, FileDown, Upload, ArrowUpDown, ChevronUp, ChevronDown, MoreHorizontal, Trash2, RotateCcw } from "lucide-react";
import { format } from "date-fns";
import { vi } from "date-fns/locale/vi";
import { toast } from "sonner";
import { useState } from "react";
import { SearchBar } from "@/components/ui/search-bar";
import { PermissionGate } from "@/components/auth/permission-gate";
import { DatePicker } from "@/components/ui/date-picker";
import { ColumnConfigDialog } from "@/components/ui/column-config-dialog";
import { useTableColumns, ColumnDef } from "@/hooks/use-table-columns";
import { Columns3 } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";

const TASK_DEFAULT_COLUMNS: ColumnDef[] = [
    { key: "title", label: "Tiêu đề" },
    { key: "priority", label: "Ưu tiên" },
    { key: "deadline", label: "Deadline" },
    { key: "status", label: "Trạng thái" },
];

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
    TODO: { label: "Chờ làm", color: "bg-gray-100 text-gray-700", icon: ListTodo },
    IN_PROGRESS: { label: "Đang làm", color: "bg-blue-100 text-blue-700", icon: PlayCircle },
    REVIEW: { label: "Review", color: "bg-yellow-100 text-yellow-700", icon: Clock },
    DONE: { label: "Hoàn thành", color: "bg-green-100 text-green-700", icon: CheckCircle },
    CANCELLED: { label: "Đã hủy", color: "bg-red-100 text-red-700", icon: AlertTriangle },
};

const PRIORITY_CONFIG: Record<string, { label: string; color: string }> = {
    LOW: { label: "Thấp", color: "bg-slate-100 text-slate-600" },
    MEDIUM: { label: "Trung bình", color: "bg-blue-100 text-blue-600" },
    HIGH: { label: "Cao", color: "bg-orange-100 text-orange-600" },
    URGENT: { label: "Khẩn cấp", color: "bg-red-100 text-red-600" },
};

export default function TasksPage() {
    const queryClient = useQueryClient();
    const [search, setSearch] = useState("");
    const [sort, setSort] = useState<{ sortBy: string, order: "asc" | "desc" }>({ sortBy: "createdAt", order: "desc" });
    const [activeTab, setActiveTab] = useState("all");
    const [isNewOpen, setIsNewOpen] = useState(false);
    const [newTask, setNewTask] = useState({
        title: "", description: "", deadline: "", priority: "MEDIUM"
    });
    const [isColumnConfigOpen, setIsColumnConfigOpen] = useState(false);

    const { visibleColumns, allColumns } = useTableColumns("tasks", TASK_DEFAULT_COLUMNS);

    const handleExport = () => toast.info("Tính năng Xuất Excel đang được phát triển...");
    const handleImport = () => toast.info("Tính năng Nhập Excel đang được phát triển...");

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

    const { data: tasks, isLoading, refetch } = useMyTasks(false);

    const { data: stats } = useQuery({
        queryKey: ["task-stats"],
        queryFn: tasksApi.getStats,
    });

    const deleteTaskMutation = useDeleteTask();

    const handleDelete = async (id: string) => {
        if (!confirm('Bạn có chắc muốn xóa công việc này?')) return;
        try {
            await deleteTaskMutation.mutateAsync(id);
            toast.success('Đã xóa công việc');
        } catch (e: any) {
            toast.error(e?.response?.data?.message || 'Lỗi khi xóa');
        }
    };

    const createMutation = useMutation({
        mutationFn: tasksApi.create,
        onSuccess: () => {
            toast.success("Tạo công việc thành công!");
            queryClient.invalidateQueries({ queryKey: ["tasks"] });
            queryClient.invalidateQueries({ queryKey: ["task-stats"] });
            setIsNewOpen(false);
            setNewTask({ title: "", description: "", deadline: "", priority: "MEDIUM" });
        },
        onError: (err: any) => toast.error(err.response?.data?.message || "Lỗi"),
    });

    const statusMutation = useMutation({
        mutationFn: ({ id, status }: { id: string; status: string }) => tasksApi.updateStatus(id, status),
        onSuccess: () => {
            toast.success("Cập nhật thành công!");
            queryClient.invalidateQueries({ queryKey: ["tasks"] });
            queryClient.invalidateQueries({ queryKey: ["task-stats"] });
        },
    });

    const handleCreate = () => {
        if (!newTask.title) {
            toast.error("Vui lòng nhập tiêu đề");
            return;
        }
        createMutation.mutate(newTask);
    };

    const filteredAndSortedTasks = tasks?.filter((t: any) =>
        t.title.toLowerCase().includes(search.toLowerCase()) ||
        t.description?.toLowerCase().includes(search.toLowerCase())
    ).sort((a: any, b: any) => {
        const aVal = sort.sortBy.split('.').reduce((obj, key) => obj?.[key], a) || '';
        const bVal = sort.sortBy.split('.').reduce((obj, key) => obj?.[key], b) || '';
        if (aVal < bVal) return sort.order === "asc" ? -1 : 1;
        if (aVal > bVal) return sort.order === "asc" ? 1 : -1;
        return 0;
    });

    const renderTaskCard = (task: any) => (
        <Card key={task.id} className="mb-3">
            <CardContent className="p-4">
                <div className="flex items-start justify-between">
                    <div className="flex-1">
                        <h4 className="font-medium">{task.title}</h4>
                        {task.description && (
                            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{task.description}</p>
                        )}
                        <div className="flex items-center gap-2 mt-2">
                            <Badge className={PRIORITY_CONFIG[task.priority]?.color}>
                                {PRIORITY_CONFIG[task.priority]?.label}
                            </Badge>
                            {task.deadline && (
                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    {format(new Date(task.deadline), "dd/MM/yyyy", { locale: vi })}
                                </span>
                            )}
                        </div>
                    </div>
                    <Select
                        value={task.status}
                        onValueChange={(value) => statusMutation.mutate({ id: task.id, status: value })}
                    >
                        <SelectTrigger className="w-[130px]">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                                <SelectItem key={key} value={key}>{config.label}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 ml-2 hover:bg-muted">
                                <MoreHorizontal className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleDelete(task.id)} className="text-red-500 focus:text-red-500">
                                <Trash2 className="mr-2 h-4 w-4" /> Xóa
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </CardContent>
        </Card>
    );

    return (
        <div className="flex flex-col h-[calc(100vh-0rem)] space-y-4 p-2 bg-background">
            <div className="bg-card/60 backdrop-blur-xl border border-border/50 shadow-sm rounded-xl p-2 animate-in fade-in slide-in-from-top-4 duration-500">
            <PageHeader
                title="CÔNG VIỆC"
                titleClassName="from-amber-500 to-orange-600 dark:from-amber-400 dark:to-orange-400"
                icon={
                    <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-xl flex items-center justify-center shadow-sm bg-gradient-to-br from-amber-500 to-orange-600">
                        <CheckSquare className="h-4 w-4 sm:h-5 sm:w-5 text-white" style={{ margin: '2px' }} />
                    </div>
                }
                className="mb-0 border-none bg-transparent p-0 shadow-none"
                onRefresh={refetch}
                isRefreshing={isLoading}
                search={
                    <SearchBar
                        placeholder="Tìm kiếm công việc..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                }
            >
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" className="h-10">
                            <MoreHorizontal className="mr-2 h-4 w-4" />
                            Tùy chọn
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-[200px]">
                        <PermissionGate permission="EXPORT_DATA">
                            <DropdownMenuItem onClick={handleExport} className="py-2.5 cursor-pointer">
                                <FileDown className="mr-2 h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                                <span>Xuất dữ liệu Excel</span>
                            </DropdownMenuItem>
                        </PermissionGate>
                        <PermissionGate permission="IMPORT_DATA">
                            <DropdownMenuItem onClick={handleImport} className="py-2.5 cursor-pointer">
                                <Upload className="mr-2 h-4 w-4 text-blue-600 dark:text-blue-400" />
                                <span>Nhập dữ liệu Excel</span>
                            </DropdownMenuItem>
                        </PermissionGate>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => setIsColumnConfigOpen(true)} className="py-2.5 cursor-pointer">
                            <Columns3 className="mr-2 h-4 w-4 text-blue-600 dark:text-blue-400" />
                            <span>Sắp xếp cột</span>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
                <Dialog open={isNewOpen} onOpenChange={setIsNewOpen}>
                    <DialogTrigger asChild>
                        <Button className="h-10"><Plus className="mr-2 h-4 w-4" />Thêm mới</Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Tạo task mới</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label>Tiêu đề</Label>
                                <Input
                                    placeholder="Nhập tiêu đề..."
                                    value={newTask.title}
                                    onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Mô tả</Label>
                                <Textarea
                                    placeholder="Mô tả chi tiết..."
                                    value={newTask.description}
                                    onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Deadline</Label>
                                    <DatePicker
                                        value={newTask.deadline}
                                        onChange={(date) => setNewTask({ ...newTask, deadline: date ? format(date, "yyyy-MM-dd'T'17:30") : "" })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Độ ưu tiên</Label>
                                    <Select
                                        value={newTask.priority}
                                        onValueChange={(v) => setNewTask({ ...newTask, priority: v })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {Object.entries(PRIORITY_CONFIG).map(([key, config]) => (
                                                <SelectItem key={key} value={key}>{config.label}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsNewOpen(false)}>Hủy</Button>
                            <Button onClick={handleCreate} disabled={createMutation.isPending}>
                                {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Tạo task
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </PageHeader>
            </div>

            <div className="flex-1 overflow-y-auto min-h-0 space-y-4 custom-scrollbar pr-1 pb-2">
            {/* Stats */}
            <div className="grid gap-4 md:grid-cols-5">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Tổng task</CardTitle>
                        <CheckSquare className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats?.total || 0}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Chờ làm</CardTitle>
                        <ListTodo className="h-4 w-4 text-gray-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats?.todo || 0}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Đang làm</CardTitle>
                        <PlayCircle className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-blue-600">{stats?.inProgress || 0}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Hoàn thành</CardTitle>
                        <CheckCircle className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">{stats?.done || 0}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Quá hạn</CardTitle>
                        <AlertTriangle className="h-4 w-4 text-red-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-600">{stats?.overdue || 0}</div>
                    </CardContent>
                </Card>
            </div>

            {/* Task Lists */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full max-w-2xl grid-cols-4">
                    <TabsTrigger value="all">Tất cả</TabsTrigger>
                    <TabsTrigger value="todo">Chờ làm</TabsTrigger>
                    <TabsTrigger value="in_progress">Đang làm</TabsTrigger>
                    <TabsTrigger value="done">Hoàn thành</TabsTrigger>
                </TabsList>

                <TabsContent value="all" className="mt-4">
                    <div className="rounded-md border bg-card">
                        <div className="p-0">
                            {isLoading ? (
                                <div className="flex justify-center py-8">
                                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                </div>
                            ) : filteredAndSortedTasks?.length === 0 ? (
                                <div className="py-8 text-center text-muted-foreground">
                                    Không tìm thấy task nào.
                                </div>
                            ) : (
                                <Table>
                                    <TableHeader className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 shadow-[0_1px_2px_rgba(0,0,0,0.04)] ring-1 ring-border/50">
                                        <TableRow className="hover:bg-transparent border-none">
                                            {visibleColumns.map(col => {
                                                const sortable = ["title", "priority", "deadline", "status"];
                                                return (
                                                    <TableHead key={col.key}
                                                        className={`h-10 font-medium ${sortable.includes(col.key) ? "cursor-pointer hover:bg-muted/80 transition-colors group" : ""}`}
                                                        onClick={sortable.includes(col.key) ? () => toggleSort(col.key) : undefined}>
                                                        <div className="flex items-center">{col.label}{sortable.includes(col.key) && <SortIcon field={col.key} />}</div>
                                                    </TableHead>
                                                );
                                            })}
                                            <TableHead className="h-10 font-medium text-right">Thao tác</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredAndSortedTasks?.map((task: any) => (
                                            <TableRow key={task.id}>
                                                {visibleColumns.map(col => {
                                                    const renderers: Record<string, () => React.ReactNode> = {
                                                        title: () => <><div className="font-medium text-foreground">{task.title}</div><div className="text-xs text-muted-foreground truncate max-w-[200px]">{task.description}</div></>,
                                                        priority: () => <Badge className={PRIORITY_CONFIG[task.priority]?.color}>{PRIORITY_CONFIG[task.priority]?.label}</Badge>,
                                                        deadline: () => task.deadline ? <div className="flex items-center text-xs"><Clock className="mr-1.5 h-3 w-3 text-muted-foreground" />{format(new Date(task.deadline), "dd/MM/yyyy HH:mm")}</div> : <span>-</span>,
                                                        status: () => <Select value={task.status} disabled onValueChange={(value) => statusMutation.mutate({ id: task.id, status: value })}><SelectTrigger className="h-8 max-w-[130px] text-xs"><SelectValue /></SelectTrigger><SelectContent>{Object.entries(STATUS_CONFIG).map(([key, config]) => <SelectItem key={key} value={key} className="text-xs">{config.label}</SelectItem>)}</SelectContent></Select>,
                                                    };
                                                    const render = renderers[col.key];
                                                    return <TableCell key={col.key}>{render ? render() : '—'}</TableCell>;
                                                })}
                                                <TableCell className="text-right">
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-muted">
                                                                <MoreHorizontal className="h-4 w-4" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end">
                                                        <DropdownMenuItem onClick={() => handleDelete(task.id)} className="text-red-500 focus:text-red-500">
                                                                <Trash2 className="mr-2 h-4 w-4" /> Xóa
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            )}
                        </div>
                    </div>
                </TabsContent>

                <TabsContent value="todo" className="mt-4">
                    {filteredAndSortedTasks?.filter((t: any) => t.status === 'TODO').map(renderTaskCard)}
                </TabsContent>

                <TabsContent value="in_progress" className="mt-4">
                    {filteredAndSortedTasks?.filter((t: any) => t.status === 'IN_PROGRESS').map(renderTaskCard)}
                </TabsContent>

                <TabsContent value="done" className="mt-4">
                    {filteredAndSortedTasks?.filter((t: any) => t.status === 'DONE').map(renderTaskCard)}
                </TabsContent>

            </Tabs>

            <ColumnConfigDialog
                open={isColumnConfigOpen}
                onOpenChange={setIsColumnConfigOpen}
                moduleKey="tasks"
                allColumns={allColumns}
                defaultColumns={TASK_DEFAULT_COLUMNS}
            />
            </div>
        </div >
    );
}
