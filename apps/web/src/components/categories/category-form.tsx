"use client";

import { useForm } from "react-hook-form";
import { useEffect } from "react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
    Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useCreateCategory, useUpdateCategory, useCategory } from "@/services/category.service";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { FormDrawerContainer } from "@/components/ui/form-drawer-container";

const formSchema = z.object({
    name: z.string().min(2, "Tên danh mục phải có ít nhất 2 ký tự"),
    type: z.string().optional(),
    status: z.enum(["ACTIVE", "INACTIVE"]),
    description: z.string().optional(),
    note: z.string().optional(),
});

type CategoryFormData = z.infer<typeof formSchema>;

interface CategoryFormProps {
    categoryId?: string | null;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    onSuccess?: () => void;
}

export function CategoryForm({ categoryId, open, onOpenChange, onSuccess }: CategoryFormProps) {
    const isEditMode = !!categoryId;
    const { data: category, isLoading } = useCategory(categoryId || "");
    const createMutation = useCreateCategory();
    const updateMutation = useUpdateCategory();

    const form = useForm<CategoryFormData>({
        resolver: zodResolver(formSchema),
        mode: "onChange",
        defaultValues: { name: "", type: "", status: "ACTIVE", description: "", note: "" },
    });

    useEffect(() => {
        if (category) {
            form.reset({
                name: category.name,
                type: category.type || "",
                status: category.status,
                description: category.description || "",
                note: category.note || "",
            });
        } else if (!categoryId) {
            form.reset({ name: "", type: "", status: "ACTIVE", description: "", note: "" });
        }
    }, [category, categoryId]);

    const onSubmit = async (values: CategoryFormData) => {
        try {
            if (isEditMode) {
                await updateMutation.mutateAsync({ id: categoryId as string, ...values });
                toast.success("Cập nhật danh mục thành công");
                onSuccess?.();
            } else {
                await createMutation.mutateAsync(values);
                toast.success("Tạo danh mục thành công. Mã DM đã được tạo tự động.");
                onSuccess?.();
                onOpenChange?.(false);
            }
        } catch (error: any) {
            toast.error(error?.response?.data?.message || "Có lỗi xảy ra");
        }
    };

    const isSubmitting = createMutation.isPending || updateMutation.isPending;

    if (isEditMode && isLoading) {
        return (
            <div className="flex items-center justify-center p-12 min-h-[300px]">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <FormDrawerContainer
            open={open ?? false}
            onOpenChange={onOpenChange ?? (() => {})}
            title={isEditMode ? "Chỉnh sửa Danh mục" : "Thêm mới Danh mục CNTT"}
            size="2xl"
            footer={
                <>
                    <Button type="button" variant="outline" onClick={() => onOpenChange?.(false)} className="h-9 px-4 rounded-full">
                        Hủy bỏ
                    </Button>
                    <Button
                        type="submit"
                        form="category-form"
                        disabled={isSubmitting}
                        className="h-9 px-6 rounded-full bg-gradient-to-r from-teal-600 to-cyan-700 hover:from-teal-700 hover:to-cyan-800 text-white font-medium"
                    >
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {isEditMode ? "Cập nhật" : "Tạo mới"}
                    </Button>
                </>
            }
        >
            <Form {...form}>
                <form id="category-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                    {/* Code preview banner for create mode */}
                    {!isEditMode && (
                        <div className="rounded-lg bg-teal-50 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-800 px-4 py-2.5 text-sm text-teal-700 dark:text-teal-300">
                            Mã danh mục sẽ được tạo tự động theo định dạng <span className="font-mono font-semibold">DM00001</span>
                        </div>
                    )}
                    {/* Code display in edit mode */}
                    {isEditMode && category && (
                        <div className="flex items-center gap-3 rounded-lg bg-muted/50 px-4 py-2.5">
                            <span className="text-xs text-muted-foreground">Mã danh mục</span>
                            <span className="font-mono font-semibold text-sm tracking-widest">{category.code}</span>
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField control={form.control} name="name" render={({ field }) => (
                            <FormItem className="md:col-span-2">
                                <FormLabel>Tên danh mục <span className="text-red-500">*</span></FormLabel>
                                <FormControl>
                                    <Input placeholder="VD: Máy tính xách tay, Máy in..." {...field} className="h-10" />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />

                        <FormField control={form.control} name="type" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Loại danh mục</FormLabel>
                                <FormControl>
                                    <Input placeholder="VD: Phần cứng, Phần mềm..." {...field} className="h-10" />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />

                        <FormField control={form.control} name="status" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Trạng thái</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl>
                                        <SelectTrigger className="h-10">
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

                        <FormField control={form.control} name="description" render={({ field }) => (
                            <FormItem className="md:col-span-2">
                                <FormLabel>Miêu tả</FormLabel>
                                <FormControl>
                                    <Textarea placeholder="Mô tả danh mục..." {...field} rows={2} className="resize-none" />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />

                        <FormField control={form.control} name="note" render={({ field }) => (
                            <FormItem className="md:col-span-2">
                                <FormLabel>Ghi chú</FormLabel>
                                <FormControl>
                                    <Textarea placeholder="Ghi chú thêm..." {...field} rows={2} className="resize-none" />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />
                    </div>
                </form>
            </Form>
        </FormDrawerContainer>
    );
}
