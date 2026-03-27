"use client";

import { useForm } from "react-hook-form";
import { useEffect } from "react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
    Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription,
} from "@/components/ui/form";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useCreateLocation, useUpdateLocation, useLocation } from "@/services/location.service";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { FormDrawerContainer } from "@/components/ui/form-drawer-container";

// Danh sách prefix định sẵn (có thể mở rộng)
const PREFIX_OPTIONS = [
    { value: "NM", label: "NM — Nhà máy Nhật Việt" },
    { value: "TD", label: "TD — Nhà máy Thái Dương" },
    { value: "DL", label: "DL — Kho Daklak" },
    { value: "VP", label: "VP — Văn phòng 6A" },
];

const formSchema = z.object({
    prefix: z.string().length(2, "Prefix phải đúng 2 ký tự").transform(v => v.toUpperCase()),
    name: z.string().min(2, "Tên vị trí phải có ít nhất 2 ký tự"),
    detail: z.string().optional(),
    status: z.enum(["ACTIVE", "INACTIVE"]),
    description: z.string().optional(),
    note: z.string().optional(),
});

type LocationFormData = z.infer<typeof formSchema>;

interface LocationFormProps {
    locationId?: string | null;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    onSuccess?: () => void;
}

export function LocationForm({ locationId, open, onOpenChange, onSuccess }: LocationFormProps) {
    const isEditMode = !!locationId;
    const { data: location, isLoading } = useLocation(locationId || "");
    const createMutation = useCreateLocation();
    const updateMutation = useUpdateLocation();

    const form = useForm<LocationFormData>({
        resolver: zodResolver(formSchema),
        mode: "onChange",
        defaultValues: { prefix: "NM", name: "", detail: "", status: "ACTIVE", description: "", note: "" },
    });

    const watchedPrefix = form.watch("prefix");

    useEffect(() => {
        if (location) {
            form.reset({
                prefix: location.prefix,
                name: location.name,
                detail: location.detail || "",
                status: location.status,
                description: location.description || "",
                note: location.note || "",
            });
        } else if (!locationId) {
            form.reset({ prefix: "NM", name: "", detail: "", status: "ACTIVE", description: "", note: "" });
        }
    }, [location, locationId]);

    const onSubmit = async (values: LocationFormData) => {
        try {
            if (isEditMode) {
                const { prefix, ...updateValues } = values;
                await updateMutation.mutateAsync({ id: locationId as string, ...updateValues });
                toast.success("Cập nhật vị trí thành công");
                onSuccess?.();
            } else {
                await createMutation.mutateAsync(values);
                toast.success(`Tạo vị trí thành công. Mã ${values.prefix.toUpperCase()}XXXXX đã được tạo tự động.`);
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
            title={isEditMode ? "Chỉnh sửa Vị trí" : "Thêm mới Vị trí CNTT"}
            size="2xl"
            footer={
                <>
                    <Button type="button" variant="outline" onClick={() => onOpenChange?.(false)} className="h-9 px-4 rounded-full">
                        Hủy bỏ
                    </Button>
                    <Button
                        type="submit"
                        form="location-form"
                        disabled={isSubmitting}
                        className="h-9 px-6 rounded-full bg-gradient-to-r from-violet-600 to-indigo-700 hover:from-violet-700 hover:to-indigo-800 text-white font-medium"
                    >
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {isEditMode ? "Cập nhật" : "Tạo mới"}
                    </Button>
                </>
            }
        >
            <Form {...form}>
                <form id="location-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                    {/* Code preview & prefix selector */}
                    {!isEditMode && (
                        <div className="rounded-lg bg-violet-50 dark:bg-violet-950/30 border border-violet-200 dark:border-violet-800 px-4 py-2.5">
                            <p className="text-xs text-violet-600 dark:text-violet-400 mb-1">Mã vị trí sẽ được tạo tự động:</p>
                            <p className="font-mono font-bold text-violet-700 dark:text-violet-300 text-sm tracking-wider">
                                {(watchedPrefix || "??").toUpperCase().slice(0, 2).padEnd(2, "?")}00001
                            </p>
                        </div>
                    )}
                    {isEditMode && location && (
                        <div className="flex items-center gap-3 rounded-lg bg-muted/50 px-4 py-2.5">
                            <span className="text-xs text-muted-foreground">Mã vị trí</span>
                            <span className="font-mono font-semibold text-sm tracking-widest">{location.code}</span>
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Prefix — only editable on create */}
                        <FormField control={form.control} name="prefix" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Cơ sở / Tiền tố <span className="text-red-500">*</span></FormLabel>
                                {!isEditMode ? (
                                    <Select onValueChange={field.onChange} value={field.value}>
                                        <FormControl>
                                            <SelectTrigger className="h-10">
                                                <SelectValue placeholder="Chọn cơ sở" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {PREFIX_OPTIONS.map(opt => (
                                                <SelectItem key={opt.value} value={opt.value}>
                                                    <span className="font-mono font-semibold mr-1">{opt.value}</span>
                                                    <span className="text-muted-foreground text-xs">{opt.label.slice(5)}</span>
                                                </SelectItem>
                                            ))}
                                            <SelectItem value="__custom">
                                                <span className="text-muted-foreground italic text-xs">Nhập tay 2 ký tự...</span>
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>
                                ) : (
                                    <FormControl>
                                        <Input {...field} disabled className="h-10 font-mono bg-muted cursor-not-allowed" />
                                    </FormControl>
                                )}
                                <FormDescription className="text-xs">2 ký tự tiền tố xác định cơ sở vật chất</FormDescription>
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

                        <FormField control={form.control} name="name" render={({ field }) => (
                            <FormItem className="md:col-span-2">
                                <FormLabel>Tên vị trí <span className="text-red-500">*</span></FormLabel>
                                <FormControl>
                                    <Input placeholder="VD: Kho nguyên liệu A, Phòng server..." {...field} className="h-10" />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />

                        <FormField control={form.control} name="detail" render={({ field }) => (
                            <FormItem className="md:col-span-2">
                                <FormLabel>Chi tiết vị trí</FormLabel>
                                <FormControl>
                                    <Input placeholder="VD: Tầng 2, dãy B, kệ số 3..." {...field} className="h-10" />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />

                        <FormField control={form.control} name="description" render={({ field }) => (
                            <FormItem className="md:col-span-2">
                                <FormLabel>Diễn giải</FormLabel>
                                <FormControl>
                                    <Textarea placeholder="Mô tả chi tiết về vị trí..." {...field} rows={2} className="resize-none" />
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
