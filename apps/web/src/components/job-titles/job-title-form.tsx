"use client";

import { MODULE_IDENTITIES } from "@/config/module-identities";
import { useForm } from "react-hook-form";
import { useEffect } from "react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useCreateJobTitle, useUpdateJobTitle, useJobTitle, JobTitle } from "@/services/job-title.service";
import { toast } from "sonner";
import { Loader2, Briefcase } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { capitalizeWords } from "@/lib/utils";
import { FormDrawerContainer } from "@/components/ui/form-drawer-container";

const formSchema = z.object({
    code: z.string().min(2, "Mã chức danh phải có ít nhất 2 ký tự").max(7, "Mã chức danh có tối đa 7 ký tự"),
    name: z.string().min(2, "Tên chức danh phải có ít nhất 2 ký tự"),
    description: z.string().optional(),
    status: z.enum(["ACTIVE", "INACTIVE"]),
});

type JobTitleFormData = z.infer<typeof formSchema>;

interface JobTitleFormProps {
    jobTitleId?: string | null;
    initialData?: JobTitle | null;
    returnUrl?: string;
    variant?: "page" | "drawer";
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    onSuccess?: () => void;
}

export function JobTitleForm({ jobTitleId, initialData, returnUrl = "/job-titles", variant = "page", open, onOpenChange, onSuccess }: JobTitleFormProps) {
    const router = useRouter();
    const isEditMode = !!jobTitleId;
    const { data: jobTitleFetched, isLoading: isLoadingJobTitle } = useJobTitle(jobTitleId || "");
    const jobTitle = initialData || jobTitleFetched;

    const createMutation = useCreateJobTitle();
    const updateMutation = useUpdateJobTitle();

    const form = useForm<JobTitleFormData>({
        resolver: zodResolver(formSchema),
        mode: "onChange",
        defaultValues: {
            code: "",
            name: "",
            description: "",
            status: "ACTIVE",
        },
    });

    useEffect(() => {
        if (jobTitle) {
            form.reset({
                code: jobTitle.code,
                name: jobTitle.name,
                description: jobTitle.description || "",
                status: jobTitle.status,
            });
        } else {
            form.reset({
                code: "",
                name: "",
                description: "",
                status: "ACTIVE",
            });
        }
    }, [jobTitle, form]);

    const onSubmit = async (values: JobTitleFormData) => {
        try {
            if (isEditMode) {
                const { code, ...updateValues } = values;
                await updateMutation.mutateAsync({ id: jobTitleId as string, ...updateValues });
                toast.success("Cập nhật chức danh thành công");
                if (variant === "drawer") onSuccess?.();
            } else {
                await createMutation.mutateAsync(values);
                toast.success("Tạo chức danh thành công");
                if (variant === "drawer") {
                    onSuccess?.();
                    onOpenChange?.(false);
                } else {
                    router.push(returnUrl);
                }
            }
        } catch (error: any) {
            toast.error(error?.response?.data?.message || "Có lỗi xảy ra");
        }
    };

    const isSubmitting = createMutation.isPending || updateMutation.isPending;

    if (isEditMode && isLoadingJobTitle) {
        return (
            <div className="flex flex-col items-center justify-center p-12 space-y-4 min-h-[400px]">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                <p className="text-muted-foreground">Đang tải dữ liệu...</p>
            </div>
        );
    }

    const formFields = (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <FormField control={form.control} name="code" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Mã chức danh <span className="text-red-500">*</span></FormLabel>
                                            <FormControl>
                                                <Input 
                                                    placeholder="VD: GD, PGD, TP..." 
                                                    {...field} 
                                                    disabled={isEditMode} 
                                                    className={isEditMode ? "bg-slate-50 cursor-not-allowed" : "focus:ring-indigo-500"}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
    
                                    <FormField control={form.control} name="status" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Trạng thái</FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                                                <FormControl>
                                                    <SelectTrigger className="focus:ring-indigo-500">
                                                        <SelectValue placeholder="Chọn trạng thái" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    <SelectItem value="ACTIVE">
                                                        <div className="flex items-center gap-2">
                                                            <div className="h-2 w-2 rounded-full bg-emerald-500" />
                                                            <span>Hoạt động</span>
                                                        </div>
                                                    </SelectItem>
                                                    <SelectItem value="INACTIVE">
                                                        <div className="flex items-center gap-2">
                                                            <div className="h-2 w-2 rounded-full bg-slate-400" />
                                                            <span>Ngừng hoạt động</span>
                                                        </div>
                                                    </SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
    
                                    <FormField control={form.control} name="name" render={({ field }) => (
                                        <FormItem className="md:col-span-2">
                                            <FormLabel>Tên chức danh <span className="text-red-500">*</span></FormLabel>
                                            <FormControl>
                                                <Input
                                                    placeholder="VD: Giám đốc kĩ thuật"
                                                    {...field}
                                                    className="focus:ring-indigo-500 h-11 text-base font-medium"
                                                    onChange={(e) => {
                                                        field.onChange(capitalizeWords(e.target.value));
                                                    }}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
    
                                    <FormField control={form.control} name="description" render={({ field }) => (
                                        <FormItem className="md:col-span-2">
                                            <FormLabel>Mô tả công việc</FormLabel>
                                            <FormControl>
                                                <Textarea 
                                                    placeholder="Mô tả tóm tắt chức năng nhiệm vụ..." 
                                                    {...field} 
                                                    rows={3} 
                                                    className="focus:ring-indigo-500 resize-none"
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                </div>
    );

    if (variant === "drawer") {
        return (
            <FormDrawerContainer
                open={open ?? false}
                onOpenChange={onOpenChange ?? (() => {})}
                title={isEditMode ? "Chỉnh sửa Chức danh" : "Thêm mới Chức danh"}
                size="2xl"
                footer={
                    <>
                        <Button type="button" variant="outline" onClick={() => onOpenChange?.(false)} className="h-9 px-4 rounded-full shadow-sm">
                            Hủy bỏ
                        </Button>
                        <Button type="submit" form="job-title-form" disabled={isSubmitting} className="h-9 px-6 rounded-full shadow-sm bg-gradient-to-r from-indigo-600 to-blue-700 hover:from-indigo-700 hover:to-blue-800 text-white font-medium">
                            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {isEditMode ? "Cập nhật" : "Tạo mới"}
                        </Button>
                    </>
                }
            >
                <Form {...form}>
                    <form id="job-title-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        {formFields}
                    </form>
                </Form>
            </FormDrawerContainer>
        );
    }

    return (
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 max-w-5xl mx-auto w-full">
            <PageHeader
                title={isEditMode ? "Chỉnh sửa Chức danh" : "Thêm mới Chức danh"}
                backHref={returnUrl}
                icon={
                    <div className={`h-10 w-10 sm:h-12 sm:w-12 rounded-xl flex items-center justify-center shadow-sm ${MODULE_IDENTITIES.JOB_TITLE.solidBg}`}>
                        <MODULE_IDENTITIES.JOB_TITLE.icon className="h-6 w-6 sm:h-7 sm:w-7 text-white" />
                    </div>
                }
                actions={
                    <>
                        <Button type="button" variant="outline" onClick={() => router.push(returnUrl)} className="h-9 px-4 rounded-full shadow-sm">
                            Hủy bỏ
                        </Button>
                        <Button type="submit" disabled={isSubmitting} className="h-9 px-6 rounded-full shadow-sm bg-gradient-to-r from-indigo-600 to-blue-700 hover:from-indigo-700 hover:to-blue-800 text-white font-medium">
                            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {isEditMode ? "Cập nhật" : "Tạo mới"}
                        </Button>
                    </>
                }
            />

            <Card className="border-slate-200/60 dark:border-slate-800/60 shadow-sm bg-card/50">
                <CardContent className="p-6">
                    <Form {...form}>
                        {formFields}
                    </Form>
                </CardContent>
            </Card>
        </form>
    );
}
