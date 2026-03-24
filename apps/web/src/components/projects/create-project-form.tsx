"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { projectsApi } from "@/lib/api-client";
import { useEmployees } from "@/services/employee.service";
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
import { Loader2, Save, FolderKanban } from "lucide-react";
import { toast } from "sonner";
import { DatePicker } from "@/components/ui/date-picker";
import { format } from "date-fns";
import { ProjectStatus } from "@/types/project";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const formSchema = z.object({
    code: z.string().min(1, "Mã dự án là bắt buộc"),
    name: z.string().min(1, "Tên dự án là bắt buộc"),
    description: z.string().optional(),
    startDate: z.string().min(1, "Ngày bắt đầu là bắt buộc"),
    endDate: z.string().optional(),
    status: z.nativeEnum(ProjectStatus),
    managerId: z.string().min(1, "Người quản lý là bắt buộc"),
});

type ProjectFormValues = z.infer<typeof formSchema>;

export function CreateProjectForm() {
    const router = useRouter();
    const queryClient = useQueryClient();
    const { data: employeesData } = useEmployees({ limit: 100 });

    const form = useForm<ProjectFormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            code: "",
            name: "",
            description: "",
            startDate: new Date().toISOString().split("T")[0],
            status: ProjectStatus.PLANNING,
            managerId: "",
            endDate: "",
        },
    });

    const createMutation = useMutation({
        mutationFn: (values: ProjectFormValues) =>
            projectsApi.create(values),
        onSuccess: () => {
            toast.success("Tạo dự án thành công");
            queryClient.invalidateQueries({ queryKey: ["projects"] });
            router.push("/projects");
        },
        onError: (error: any) => {
            toast.error(error.error?.message || "Lỗi tạo dự án");
        },
    });

    function onSubmit(values: ProjectFormValues) {
        const payload = {
            ...values,
            startDate: new Date(values.startDate).toISOString(),
            endDate: values.endDate ? new Date(values.endDate).toISOString() : undefined,
        };

        createMutation.mutate(payload);
    }

    return (
        <div className="space-y-6 max-w-4xl mx-auto w-full pb-10">
            <PageHeader
                title="Tạo dự án mới"
                description="Điền thông tin chi tiết để khởi tạo dự án"
                backHref="/projects"
                icon={
                    <div className="h-10 w-10 md:h-12 md:w-12 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center shadow-sm text-white">
                        <FolderKanban className="h-5 w-5 md:h-6 md:w-6" />
                    </div>
                }
                actions={
                    <div className="flex items-center gap-3">
                        <Button type="button" variant="outline" onClick={() => router.push("/projects")} className="h-10 px-4">
                            Hủy bỏ
                        </Button>
                        <Button
                            onClick={form.handleSubmit(onSubmit)}
                            disabled={createMutation.isPending}
                            className="h-10 px-6 bg-blue-600 hover:bg-blue-700 text-white"
                        >
                            {createMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                            Lưu dự án
                        </Button>
                    </div>
                }
            />

            <Card className="rounded-xl border shadow-sm">
                <CardHeader className="bg-muted/10 pb-4 border-b">
                    <CardTitle className="text-lg font-semibold text-foreground">Thông tin chung</CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <FormField
                                    control={form.control}
                                    name="code"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Mã dự án</FormLabel>
                                            <FormControl>
                                                <Input placeholder="VD: PRJ-001" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="status"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Trạng thái</FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Chọn trạng thái" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    <SelectItem value={ProjectStatus.PLANNING}>Lập kế hoạch</SelectItem>
                                                    <SelectItem value={ProjectStatus.IN_PROGRESS}>Đang thực hiện</SelectItem>
                                                    <SelectItem value={ProjectStatus.ON_HOLD}>Tạm hoãn</SelectItem>
                                                    <SelectItem value={ProjectStatus.COMPLETED}>Hoàn thành</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <FormField
                                control={form.control}
                                name="name"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Tên dự án</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Triển khai phần mềm ERP..." {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="managerId"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Quản lý dự án</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Chọn người quản lý" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {employeesData?.data?.map((emp: any) => (
                                                    <SelectItem key={emp.id} value={emp.id}>
                                                        {emp.fullName} ({emp.employeeCode})
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

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
                                    name="endDate"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Ngày kết thúc (dự kiến)</FormLabel>
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
                                name="description"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Mô tả chi tiết</FormLabel>
                                        <FormControl>
                                            <Textarea
                                                className="min-h-[120px]"
                                                placeholder="Mô tả phạm vi và mục tiêu dự án..."
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
