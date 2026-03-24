"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { projectsApi } from "@/lib/api-client";
import { ProjectTask, TaskPriority, TaskStatus } from "@/types/project";
import { useRouter } from "next/navigation";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Loader2, Save, LayoutList } from "lucide-react";
import { toast } from "sonner";
import { DatePicker } from "@/components/ui/date-picker";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const formSchema = z.object({
    title: z.string().min(1, "Tiêu đề là bắt buộc"),
    description: z.string().optional(),
    startDate: z.string().optional(),
    dueDate: z.string().optional(),
    status: z.nativeEnum(TaskStatus),
    priority: z.nativeEnum(TaskPriority),
    assigneeId: z.string().optional(),
    predecessorIds: z.array(z.string()).optional(),
});

type TaskFormValues = z.infer<typeof formSchema>;

interface TaskFormProps {
    projectId: string;
    existingTasks?: ProjectTask[];
    members?: any[];
    taskToEdit?: ProjectTask;
}

export function TaskForm({ projectId, existingTasks = [], members = [], taskToEdit }: TaskFormProps) {
    const router = useRouter();
    const queryClient = useQueryClient();

    const form = useForm<TaskFormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            title: "",
            description: "",
            status: TaskStatus.TODO,
            priority: TaskPriority.MEDIUM,
            predecessorIds: [],
            startDate: "",
            dueDate: "",
        },
    });

    useEffect(() => {
        if (taskToEdit) {
            form.reset({
                title: taskToEdit.title,
                description: taskToEdit.description || "",
                startDate: taskToEdit.startDate ? new Date(taskToEdit.startDate).toISOString().split("T")[0] : "",
                dueDate: taskToEdit.dueDate ? new Date(taskToEdit.dueDate).toISOString().split("T")[0] : "",
                status: taskToEdit.status,
                priority: taskToEdit.priority,
                assigneeId: taskToEdit.assigneeId || undefined,
                predecessorIds: taskToEdit.predecessors?.map((p: any) => p.predecessorId) || [],
            });
        }
    }, [taskToEdit, form]);

    const mutation = useMutation({
        mutationFn: (values: TaskFormValues) => {
            const payload = {
                ...values,
                projectId,
                startDate: values.startDate ? new Date(values.startDate).toISOString() : undefined,
                dueDate: values.dueDate ? new Date(values.dueDate).toISOString() : undefined,
            };

            if (taskToEdit) {
                return projectsApi.updateTask(taskToEdit.id, payload);
            } else {
                return projectsApi.createTask(payload);
            }
        },
        onSuccess: () => {
            toast.success(taskToEdit ? "Cập nhật công việc thành công" : "Tạo công việc thành công");
            queryClient.invalidateQueries({ queryKey: ["project", projectId] });
            router.push(`/projects/${projectId}`);
        },
        onError: (error: any) => {
            toast.error(error.error?.message || "Lỗi lưu công việc");
        },
    });

    function onSubmit(values: TaskFormValues) {
        mutation.mutate(values);
    }

    return (
        <div className="space-y-6 max-w-4xl mx-auto w-full pb-10">
            <PageHeader
                title={taskToEdit ? "Cập nhật công việc" : "Thêm công việc mới"}
                description="Thiết lập nội dung, người phụ trách và thời hạn công việc"
                backHref={`/projects/${projectId}`}
                icon={
                    <div className="h-10 w-10 md:h-12 md:w-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-sm text-white">
                        <LayoutList className="h-5 w-5 md:h-6 md:w-6" />
                    </div>
                }
                actions={
                    <div className="flex items-center gap-3">
                        <Button type="button" variant="outline" onClick={() => router.push(`/projects/${projectId}`)} className="h-10 px-4">
                            Hủy bỏ
                        </Button>
                        <Button
                            onClick={form.handleSubmit(onSubmit)}
                            disabled={mutation.isPending}
                            className="h-10 px-6 bg-blue-600 hover:bg-blue-700 text-white"
                        >
                            {mutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                            Lưu công việc
                        </Button>
                    </div>
                }
            />

            <Card className="rounded-xl border shadow-sm">
                <CardHeader className="bg-muted/10 pb-4 border-b">
                    <CardTitle className="text-lg font-semibold text-foreground">Chi tiết công việc</CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                            <FormField
                                control={form.control}
                                name="title"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Tiêu đề công việc</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Ví dụ: Thiết kế giao diện Dashboard..." {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <FormField
                                    control={form.control}
                                    name="status"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Trạng thái</FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Chọn trạng thái" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    <SelectItem value={TaskStatus.TODO}>Cần làm</SelectItem>
                                                    <SelectItem value={TaskStatus.IN_PROGRESS}>Đang thực hiện</SelectItem>
                                                    <SelectItem value={TaskStatus.REVIEW}>Đang review</SelectItem>
                                                    <SelectItem value={TaskStatus.DONE}>Hoàn thành</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="priority"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Độ ưu tiên</FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Chọn độ ưu tiên" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    <SelectItem value={TaskPriority.LOW}>Thấp</SelectItem>
                                                    <SelectItem value={TaskPriority.MEDIUM}>Trung bình</SelectItem>
                                                    <SelectItem value={TaskPriority.HIGH}>Cao</SelectItem>
                                                    <SelectItem value={TaskPriority.URGENT}>Khẩn cấp</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <FormField
                                    control={form.control}
                                    name="startDate"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Ngày bắt đầu</FormLabel>
                                            <FormControl>
                                                <DatePicker
                                                    value={field.value}
                                                    onChange={date => field.onChange(date ? format(date, 'yyyy-MM-dd') : '')}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="dueDate"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Hạn hoàn thành</FormLabel>
                                            <FormControl>
                                                <DatePicker
                                                    value={field.value}
                                                    onChange={date => field.onChange(date ? format(date, 'yyyy-MM-dd') : '')}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <FormField
                                control={form.control}
                                name="assigneeId"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Người thực hiện</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Chọn thành viên thực hiện" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="unassigned" disabled>-- CHỌN THÀNH VIÊN --</SelectItem>
                                                {members.map((m: any) => (
                                                    <SelectItem key={m.id} value={m.employeeId || m.id}>
                                                        {m.employee?.fullName || m.fullName || "Unknown"}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="predecessorIds"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Công việc tiền nhiệm (Phụ thuộc)</FormLabel>
                                        <FormControl>
                                            <Select
                                                onValueChange={(value) => {
                                                    const current = field.value || [];
                                                    if (!current.includes(value)) {
                                                        field.onChange([...current, value]);
                                                    }
                                                }}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Chọn công việc cần hoàn thành trước" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {existingTasks
                                                        .filter((t) => t.id !== taskToEdit?.id)
                                                        .map((t) => (
                                                            <SelectItem key={t.id} value={t.id}>
                                                                {t.title}
                                                            </SelectItem>
                                                        ))}
                                                </SelectContent>
                                            </Select>
                                        </FormControl>
                                        <div className="flex flex-wrap gap-2 mt-2">
                                            {field.value?.map((pid) => {
                                                const task = existingTasks.find((t) => t.id === pid);
                                                return (
                                                    <Badge key={pid} variant="secondary" className="cursor-pointer" onClick={() => {
                                                        field.onChange(field.value?.filter((id) => id !== pid));
                                                    }}>
                                                        {task?.title || "Unknown"} &times;
                                                    </Badge>
                                                );
                                            })}
                                        </div>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="description"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Mô tả chi tiết</FormLabel>
                                        <FormControl>
                                            <Textarea
                                                className="min-h-[120px]"
                                                placeholder="Hướng dẫn, đường dẫn tài liệu liên quan..."
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </form>
                    </Form>
                </CardContent>
            </Card>
        </div>
    );
}
