"use client";

import { getAvatarVariant } from "../../lib/utils";
import { useForm } from "react-hook-form";
import { useEffect, useState, Suspense } from "react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { MODULE_IDENTITIES } from "@/config/module-identities";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Check, ChevronsUpDown, Loader2 } from "lucide-react";
import { cn, capitalizeWords } from "@/lib/utils";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { useCreateSection, useUpdateSection, useSection } from "@/services/section.service";
import { useDepartments, useNextCode } from "@/services/department.service";
import { useEmployees } from "@/services/employee.service";
import { toast } from "@/components/ui/toaster";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User, Layers, RefreshCw } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { FormDrawerContainer } from "@/components/ui/form-drawer-container";

const formSchema = z.object({
    code: z.string().min(2, "Mã bộ phận phải có ít nhất 2 ký tự").max(7, "Mã bộ phận có tối đa 7 ký tự"),
    name: z.string().min(2, "Tên bộ phận phải có ít nhất 2 ký tự"),
    departmentId: z.string().optional().nullable(),
    managerEmployeeId: z.string().optional().nullable(),
    note: z.string().optional(),
    status: z.enum(["ACTIVE", "INACTIVE"]),
    showOnOrgChart: z.boolean(),
});

type SectionFormData = z.infer<typeof formSchema>;

interface SectionFormProps {
    sectionId?: string | null;
    returnUrl?: string;
    variant?: "page" | "drawer";
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    onSuccess?: () => void;
}

function SectionFormInternal({ sectionId, returnUrl = "/sections", variant = "page", open, onOpenChange, onSuccess }: SectionFormProps) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [openDept, setOpenDept] = useState(false);
    const [openManager, setOpenManager] = useState(false);
    const isEditMode = !!sectionId;

    const { data: section, isLoading: isLoadingSection } = useSection(sectionId || "");
    const { data: deptData } = useDepartments({ limit: 1000, type: "DEPARTMENT" });
    const departments = deptData?.data || [];
    
    const { data: employeeData } = useEmployees({ limit: 1000 });
    const employees = employeeData?.data || [];

    const createSection = useCreateSection();
    const updateSection = useUpdateSection();

    const form = useForm<SectionFormData>({
        resolver: zodResolver(formSchema),
        mode: "onChange",
        defaultValues: {
            code: "",
            name: "",
            departmentId: searchParams.get("departmentId") || undefined,
            managerEmployeeId: undefined,
            note: "",
            status: "ACTIVE",
            showOnOrgChart: false,
        },
    });

    const prefix = "BP";
    const { data: nextCodeData, refetch: refetchNextCode, isFetching: isFetchingNextCode } = useNextCode("SECTION", prefix, !isEditMode);

    useEffect(() => {
        if (!isEditMode && nextCodeData?.nextCode) {
            form.setValue("code", nextCodeData.nextCode, { shouldValidate: true });
        }
    }, [nextCodeData, isEditMode, form]);

    useEffect(() => {
        if (section) {
            form.reset({
                code: section.code,
                name: section.name,
                departmentId: section.departmentId || undefined,
                managerEmployeeId: section.managerEmployeeId || undefined,
                note: (section as any).note || "",
                status: section.status,
                showOnOrgChart: (section as any).showOnOrgChart ?? false,
            });
        }
    }, [section, form]);

    const onSubmit = async (data: SectionFormData) => {
        try {
            const payload = {
                ...data,
                departmentId: data.departmentId === null ? undefined : data.departmentId,
            };

            if (isEditMode) {
                await updateSection.mutateAsync({ id: sectionId as string, ...payload });
                toast.success("Cập nhật bộ phận thành công");
                if (variant === "drawer") onSuccess?.();
            } else {
                await createSection.mutateAsync(payload);
                toast.success("Tạo bộ phận mới thành công");
                if (variant === "drawer") {
                    onSuccess?.();
                    onOpenChange?.(false);
                } else {
                    router.push(returnUrl);
                }
            }
        } catch (error: any) {
            toast.error(error?.response?.data?.message || error.message || "Đã có lỗi xảy ra");
        }
    };

    const isSubmitting = createSection.isPending || updateSection.isPending;

    if (isEditMode && isLoadingSection) {
        return (
            <div className="flex flex-col items-center justify-center p-12 space-y-4 min-h-[400px]">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                <p className="text-muted-foreground">Đang tải dữ liệu...</p>
            </div>
        );
    }

    const formFields = (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <FormField
                                    control={form.control}
                                    name="code"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Mã bộ phận <span className="text-red-500">*</span></FormLabel>
                                            <FormControl>
                                                <div className="flex gap-2">
                                                    <Input
                                                        placeholder="VD: BP001"
                                                        {...field}
                                                        disabled={isEditMode || isFetchingNextCode}
                                                        onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                                                        readOnly={!isEditMode}
                                                        className={!isEditMode ? "bg-slate-50 cursor-not-allowed" : "focus:ring-emerald-500"}
                                                    />
                                                    {!isEditMode && (
                                                        <Button
                                                            type="button"
                                                            variant="outline"
                                                            size="icon"
                                                            onClick={() => refetchNextCode()}
                                                            disabled={isFetchingNextCode}
                                                            title="Lấy mã mới"
                                                            className="shrink-0 hover:bg-emerald-50 hover:text-emerald-600 transition-colors"
                                                        >
                                                            <RefreshCw className={cn("h-4 w-4", isFetchingNextCode && "animate-spin")} />
                                                        </Button>
                                                    )}
                                                </div>
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
                                            <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                                                <FormControl>
                                                    <SelectTrigger className="focus:ring-emerald-500">
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
                                    )}
                                />
    
                                <FormField
                                    control={form.control}
                                    name="departmentId"
                                    render={({ field }) => (
                                        <FormItem className="flex flex-col md:col-span-2">
                                            <FormLabel>Trực thuộc</FormLabel>
                                            <Popover open={openDept} onOpenChange={setOpenDept}>
                                                <PopoverTrigger asChild>
                                                    <FormControl>
                                                        <Button variant="outline" role="combobox" className={cn("w-full justify-between h-10 focus:ring-2 focus:ring-emerald-500", !field.value && "text-muted-foreground")}>
                                                            {field.value ? departments.find((d) => d.id === field.value)?.name || "Chọn phòng ban" : "Chọn phòng ban"}
                                                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                                        </Button>
                                                    </FormControl>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-[400px] p-0" align="start">
                                                    <Command>
                                                        <CommandInput placeholder="Tìm phòng ban..." />
                                                        <CommandList>
                                                            <CommandEmpty>Không tìm thấy phòng ban.</CommandEmpty>
                                                            <CommandGroup>
                                                                <CommandItem value="__none__" key="__none__" onSelect={() => { form.setValue("departmentId", null); setOpenDept(false); }} className="text-muted-foreground italic">
                                                                    <Check className={cn("mr-2 h-4 w-4", !field.value ? "opacity-100" : "opacity-0")} />
                                                                    -- Không trực thuộc --
                                                                </CommandItem>
                                                                {departments.map((d) => (
                                                                    <CommandItem value={d.name} key={d.id} onSelect={() => { form.setValue("departmentId", d.id); setOpenDept(false); }}>
                                                                        <Check className={cn("mr-2 h-4 w-4", d.id === field.value ? "opacity-100" : "opacity-0")} />
                                                                        {d.name}
                                                                    </CommandItem>
                                                                ))}
                                                            </CommandGroup>
                                                        </CommandList>
                                                    </Command>
                                                </PopoverContent>
                                            </Popover>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
    
                                <FormField
                                    control={form.control}
                                    name="managerEmployeeId"
                                    render={({ field }) => (
                                        <FormItem className="flex flex-col md:col-span-2">
                                            <FormLabel>Quản lý bộ phận</FormLabel>
                                            <Popover open={openManager} onOpenChange={setOpenManager}>
                                                <PopoverTrigger asChild>
                                                    <FormControl>
                                                        <Button variant="outline" role="combobox" className={cn("w-full justify-between h-10 focus:ring-2 focus:ring-emerald-500", !field.value && "text-muted-foreground")}>
                                                            {field.value ? (
                                                                <div className="flex items-center gap-2">
                                                                    <Avatar className="h-6 w-6">
                                                                        <AvatarImage src={employees?.find(e => e.id === field.value)?.avatar} />
                                                                        <AvatarFallback><User className="h-4 w-4 text-muted-foreground" /></AvatarFallback>
                                                                    </Avatar>
                                                                    {employees?.find((e: any) => e.id === field.value)?.fullName}
                                                                </div>
                                                            ) : "Chọn lãnh đạo"}
                                                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                                        </Button>
                                                    </FormControl>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-[400px] p-0" align="start">
                                                    <Command>
                                                        <CommandInput placeholder="Tìm nhân viên..." />
                                                        <CommandList>
                                                            <CommandEmpty>Không tìm thấy nhân viên.</CommandEmpty>
                                                            <CommandGroup>
                                                                <CommandItem value="__none__" key="__none__" onSelect={() => { form.setValue("managerEmployeeId", null); setOpenManager(false); }} className="text-muted-foreground italic">
                                                                    <Check className={cn("mr-2 h-4 w-4", !field.value ? "opacity-100" : "opacity-0")} />
                                                                    -- Không chọn --
                                                                </CommandItem>
                                                                {employees?.map((e: any) => (
                                                                    <CommandItem value={`${e.fullName} ${e.employeeCode}`} key={e.id} onSelect={() => { form.setValue("managerEmployeeId", e.id); setOpenManager(false); }}>
                                                                        <div className="flex items-center gap-2">
                                                                            <Check className={cn("h-4 w-4", e.id === field.value ? "opacity-100" : "opacity-0")} />
                                                                            <Avatar className="h-6 w-6">
                                                                                <AvatarImage src={getAvatarVariant(e.avatar, "thumb")} />
                                                                                <AvatarFallback><User className="h-3 w-3" /></AvatarFallback>
                                                                            </Avatar>
                                                                            <div className="flex flex-col">
                                                                                <span>{e.fullName}</span>
                                                                                <span className="text-[10px] text-muted-foreground">{e.employeeCode}</span>
                                                                            </div>
                                                                        </div>
                                                                    </CommandItem>
                                                                ))}
                                                            </CommandGroup>
                                                        </CommandList>
                                                    </Command>
                                                </PopoverContent>
                                            </Popover>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
    
                                <FormField
                                    control={form.control}
                                    name="name"
                                    render={({ field }) => (
                                        <FormItem className="md:col-span-2">
                                            <FormLabel>Tên bộ phận <span className="text-red-500">*</span></FormLabel>
                                            <FormControl>
                                                <Input
                                                    placeholder="VD: Tổ Hàn cơ khí"
                                                    {...field}
                                                    className="focus:ring-emerald-500 h-11 text-base font-medium"
                                                    onChange={(e) => field.onChange(capitalizeWords(e.target.value))}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
    
                                <FormField
                                    control={form.control}
                                    name="note"
                                    render={({ field }) => (
                                        <FormItem className="md:col-span-2">
                                            <FormLabel>Ghi chú</FormLabel>
                                            <FormControl>
                                                <Input placeholder="Ghi chú thêm..." {...field} className="focus:ring-emerald-500" />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
    
                                <FormField
                                    control={form.control}
                                    name="showOnOrgChart"
                                    render={({ field }) => (
                                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 shadow-sm bg-white dark:bg-slate-950">
                                            <div className="space-y-0.5">
                                                <FormLabel className="text-base font-semibold text-slate-800 dark:text-slate-200">Hiển thị trên sơ đồ tổ chức</FormLabel>
                                                <div className="text-[0.8rem] text-muted-foreground font-medium">
                                                    Nếu tắt, bộ phận này và các đơn vị con sẽ không xuất hiện trên Org Chart.
                                                </div>
                                            </div>
                                            <FormControl>
                                                <Switch
                                                    checked={field.value}
                                                    onCheckedChange={field.onChange}
                                                    className="data-[state=checked]:bg-teal-600"
                                                />
                                            </FormControl>
                                        </FormItem>
                                    )}
                                />
                            </div>
    );

    if (variant === "drawer") {
        return (
            <FormDrawerContainer
                open={open ?? false}
                onOpenChange={onOpenChange ?? (() => {})}
                title={isEditMode ? "Cập nhật Bộ Phận" : "Thêm mới Bộ Phận"}
                size="2xl"
                footer={
                    <>
                        <Button type="button" variant="outline" onClick={() => onOpenChange?.(false)} className="h-9 px-4 rounded-full shadow-sm">
                            Hủy bỏ
                        </Button>
                        <Button type="submit" form="section-form" disabled={isSubmitting} className="h-9 px-6 rounded-full shadow-sm bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white font-medium">
                            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {isEditMode ? "Cập nhật" : "Tạo mới"}
                        </Button>
                    </>
                }
            >
                <Form {...form}>
                    <form id="section-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        {formFields}
                    </form>
                </Form>
            </FormDrawerContainer>
        );
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 max-w-5xl mx-auto w-full">
                <PageHeader
                    title={isEditMode ? "Cập nhật Bộ Phận" : "Thêm mới Bộ Phận"}
                    backHref={returnUrl}
                    icon={
                        <div className={`h-10 w-10 sm:h-12 sm:w-12 rounded-xl flex items-center justify-center shadow-sm ${MODULE_IDENTITIES.SECTION.solidBg}`}>
                            <MODULE_IDENTITIES.SECTION.icon className="h-6 w-6 sm:h-7 sm:w-7 text-white" />
                        </div>
                    }
                    actions={
                        <>
                            <Button type="button" variant="outline" onClick={() => router.push(returnUrl)} className="h-9 px-4 rounded-full shadow-sm">Hủy bỏ</Button>
                            <Button type="submit" disabled={isSubmitting} className="h-9 px-6 rounded-full shadow-sm bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white font-medium">
                                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {isEditMode ? "Cập nhật" : "Tạo mới"}
                            </Button>
                        </>
                    }
                />

                <Card className="border-slate-200/60 dark:border-slate-800/60 shadow-sm bg-card/50">
                    <CardContent className="p-6">
                        {formFields}
                    </CardContent>
                </Card>
            </form>
        </Form>
    );
}

export function SectionForm(props: SectionFormProps) {
    return (
        <Suspense fallback={<div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
            <SectionFormInternal {...props} />
        </Suspense>
    );
}
