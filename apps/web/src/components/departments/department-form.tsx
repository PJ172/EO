"use client";

import { getAvatarVariant } from "../../lib/utils";
import { MODULE_IDENTITIES } from "@/config/module-identities";
import { useForm } from "react-hook-form";
import { useEffect, useState, Suspense } from "react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Check, ChevronsUpDown, Loader2, Building2, RefreshCw } from "lucide-react";
import { cn, capitalizeWords } from "@/lib/utils";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { useCreateDepartment, useUpdateDepartment, useDepartments, useDepartment, Department, useNextCode } from "@/services/department.service";
import { useCompanies, Company } from "@/services/company.service";
import { useDivisions, Division } from "@/services/division.service";
import { useSections, Section } from "@/services/section.service";
import { useEmployees } from "@/services/employee.service";
import { toast } from "@/components/ui/toaster";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { FormDrawerContainer } from "@/components/ui/form-drawer-container";

const formSchema = z.object({
    code: z.string().min(2, "Mã phòng ban phải có ít nhất 2 ký tự").max(7, "Mã phòng ban có tối đa 7 ký tự"),
    name: z.string().min(2, "Tên phòng ban phải có ít nhất 2 ký tự"),
    parentId: z.string().optional().nullable(),
    managerEmployeeId: z.string().optional().nullable(),
    status: z.enum(["ACTIVE", "INACTIVE"]),
    showOnOrgChart: z.boolean(),
});

type DepartmentFormData = z.infer<typeof formSchema>;

interface DepartmentFormProps {
    departmentId?: string | null;
    initialData?: Department | null;
    defaultParentId?: string | null;
    returnUrl?: string;
    variant?: "page" | "drawer";
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    onSuccess?: () => void;
}

const TYPE_LABELS: Record<string, string> = {
    COMPANY: "Công ty",
    DIVISION: "Khối",
    DEPARTMENT: "Phòng ban",
    SECTION: "Bộ phận",
    team: "Nhóm",
};

const TYPE_PREFIXES: Record<string, string> = {
    COMPANY: "CT",
    DIVISION: "KH",
    DEPARTMENT: "PB",
    SECTION: "BP",
    team: "TN",
};

const PARENT_LABELS: Record<string, string> = {
    DEPARTMENT: "Trực thuộc Khối",
    SECTION: "Trực thuộc Phòng ban",
    team: "Trực thuộc Bộ phận",
    DIVISION: "Trực thuộc Công ty",
};

function DepartmentFormInternal({ departmentId, initialData, defaultParentId, returnUrl = "/departments", variant = "page", open, onOpenChange, onSuccess }: DepartmentFormProps) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const urlParentId = searchParams.get("parentId");
    const effectiveParentId = defaultParentId || urlParentId || undefined;

    const isEditMode = !!departmentId || !!initialData;
    const { data: departmentFetched, isLoading: isLoadingDepartment } = useDepartment(departmentId || "");
    const department = initialData || departmentFetched;

    const { data: departmentData } = useDepartments({ limit: 1000 });
    const departments = departmentData?.data || [];

    const { data: companyData } = useCompanies({ limit: 1000 });
    const companies = companyData?.data || [];

    const { data: divisionData } = useDivisions({ limit: 1000 });
    const divisions = divisionData?.data || [];

    const { data: sectionData } = useSections({ limit: 1000 });
    const sections = sectionData?.data || [];

    const { data: employees } = useEmployees({ limit: 1000 });

    const [openParent, setOpenParent] = useState(false);
    const [openManager, setOpenManager] = useState(false);

    const createDepartment = useCreateDepartment();
    const updateDepartment = useUpdateDepartment();

    const form = useForm<DepartmentFormData>({
        resolver: zodResolver(formSchema),
        mode: "onChange",
        defaultValues: {
            code: "",
            name: "",
            parentId: effectiveParentId,
            managerEmployeeId: undefined,
            status: "ACTIVE",
            showOnOrgChart: false,
        },
    });

    const currentType = "DEPARTMENT";
    const prefix = "PB";

    const { data: nextCodeData, refetch: refetchNextCode, isFetching: isFetchingNextCode } = useNextCode(currentType, prefix, !isEditMode);

    useEffect(() => {
        if (!isEditMode && nextCodeData?.nextCode) {
            form.setValue("code", nextCodeData.nextCode);
        }
    }, [nextCodeData, isEditMode, form]);

    useEffect(() => {
        if (department) {
            form.reset({
                code: department.code,
                name: department.name,
                parentId: department.parentId || department.divisionId || undefined,
                managerEmployeeId: department.managerEmployeeId || undefined,
                status: department.status,
                showOnOrgChart: department.showOnOrgChart ?? false,
            });
        }
    }, [department, effectiveParentId, form]);

    const onSubmit = async (data: DepartmentFormData) => {
        try {
            const payload: any = {
                ...data,
                managerEmployeeId: data.managerEmployeeId === null ? undefined : data.managerEmployeeId,
                divisionId: data.parentId === null ? undefined : data.parentId,
            };

            // Remove parentId and type to avoid strict validation errors from backend
            delete payload.parentId;
            delete payload.type;

            if (isEditMode && (departmentId || department?.id)) {
                await updateDepartment.mutateAsync({ id: (departmentId || department?.id) as string, ...payload });
                toast.success("Cập nhật thành công");
                if (variant === "drawer") onSuccess?.();
            } else {
                await createDepartment.mutateAsync(payload);
                toast.success("Tạo mới thành công");
                if (variant === "drawer") {
                    onSuccess?.();
                    onOpenChange?.(false);
                } else {
                    router.push(returnUrl);
                }
            }
        } catch (error: any) {
            toast.error(error.message || (error?.response?.data?.message) || "Đã có lỗi xảy ra");
        }
    };

    const typeLabel = TYPE_LABELS[currentType] || "Phòng ban";
    const parentLabel = PARENT_LABELS[currentType] || "Trực thuộc";
    const isSubmitting = createDepartment.isPending || updateDepartment.isPending;

    if (isEditMode && isLoadingDepartment && !initialData) {
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
                                            <FormLabel>Mã phòng ban <span className="text-red-500">*</span></FormLabel>
                                            <FormControl>
                                                <div className="flex gap-2">
                                                    <Input
                                                        placeholder="VD: PB001"
                                                        {...field}
                                                        disabled={isEditMode || isFetchingNextCode}
                                                        readOnly={!isEditMode}
                                                        className={!isEditMode ? "bg-slate-50 cursor-not-allowed" : "focus:ring-teal-500"}
                                                    />
                                                    {!isEditMode && (
                                                        <Button
                                                            type="button"
                                                            variant="outline"
                                                            size="icon"
                                                            onClick={() => refetchNextCode()}
                                                            disabled={isFetchingNextCode}
                                                            title="Lấy mã mới"
                                                            className="shrink-0 hover:bg-teal-50 hover:text-teal-600 transition-colors"
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
                                                    <SelectTrigger className="focus:ring-teal-500">
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
                                    name="parentId"
                                    render={({ field }) => (
                                        <FormItem className="flex flex-col md:col-span-2">
                                            <FormLabel>Trực thuộc</FormLabel>
                                            <Popover open={openParent} onOpenChange={setOpenParent}>
                                                <PopoverTrigger asChild>
                                                    <FormControl>
                                                        <Button variant="outline" role="combobox" className={cn("w-full justify-between h-10 focus:ring-2 focus:ring-teal-500", !field.value && "text-muted-foreground")}>
                                                            {field.value ? divisions.find(d => d.id === field.value)?.name || "Chọn khối trực thuộc" : "Chọn khối trực thuộc"}
                                                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                                        </Button>
                                                    </FormControl>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-[400px] p-0" align="start">
                                                    <Command>
                                                        <CommandInput placeholder="Tìm kiếm khối..." />
                                                        <CommandList>
                                                            <CommandEmpty>Không tìm thấy khối.</CommandEmpty>
                                                            <CommandGroup>
                                                                <CommandItem value="__none__" key="__none__" onSelect={() => { form.setValue("parentId", null); setOpenParent(false); }} className="text-muted-foreground italic">
                                                                    <Check className={cn("mr-2 h-4 w-4", !field.value ? "opacity-100" : "opacity-0")} />
                                                                    -- Không trực thuộc khối nào --
                                                                </CommandItem>
                                                                {divisions.map((d) => (
                                                                    <CommandItem value={d.name} key={d.id} onSelect={() => { form.setValue("parentId", d.id); setOpenParent(false); }}>
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
                                            <FormLabel>Quản lý phòng ban</FormLabel>
                                            <Popover open={openManager} onOpenChange={setOpenManager}>
                                                <PopoverTrigger asChild>
                                                    <FormControl>
                                                        <Button variant="outline" role="combobox" className={cn("w-full justify-between h-10 focus:ring-2 focus:ring-teal-500", !field.value && "text-muted-foreground")}>
                                                            {field.value ? (
                                                                <div className="flex items-center gap-2">
                                                                    <Avatar className="h-6 w-6">
                                                                        <AvatarImage src={employees?.data?.find((e: any) => e.id === field.value)?.avatar} />
                                                                        <AvatarFallback><User className="h-4 w-4" /></AvatarFallback>
                                                                    </Avatar>
                                                                    {employees?.data?.find((e: any) => e.id === field.value)?.fullName}
                                                                </div>
                                                            ) : "Chọn quản lý"}
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
                                                                    -- Chưa xác định --
                                                                </CommandItem>
                                                                {employees?.data?.map((e: any) => (
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
                                            <Label required={true}>Tên phòng ban</Label>
                                            <FormControl>
                                                <Input
                                                    placeholder="VD: Phòng Hành chính Nhân sự"
                                                    {...field}
                                                    className="focus:ring-teal-500 h-11 text-base font-medium"
                                                    onChange={(e) => field.onChange(capitalizeWords(e.target.value))}
                                                />
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
                                                    Nếu tắt, phòng ban này và các đơn vị con sẽ không xuất hiện trên Org Chart.
                                                </div>
                                            </div>
                                            <FormControl>
                                                <Switch
                                                    checked={field.value}
                                                    onCheckedChange={field.onChange}
                                                    className="data-[state=checked]:bg-blue-600"
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
                title={isEditMode ? `Cập nhật ${typeLabel}` : `Thêm mới ${typeLabel}`}
                size="2xl"
                footer={
                    <>
                        <Button type="button" variant="outline" onClick={() => onOpenChange?.(false)} className="h-9 px-4 rounded-full shadow-sm">
                            Hủy bỏ
                        </Button>
                        <Button type="submit" form="department-form" disabled={isSubmitting} className="h-9 px-6 rounded-full shadow-sm bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 text-white font-medium">
                            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {isEditMode ? "Cập nhật" : "Tạo mới"}
                        </Button>
                    </>
                }
            >
                <Form {...form}>
                    <form id="department-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                    title={isEditMode ? `Cập nhật ${typeLabel}` : `Thêm mới ${typeLabel}`}
                    backHref={returnUrl}
                    icon={
                        <div className={`h-10 w-10 sm:h-12 sm:w-12 rounded-xl flex items-center justify-center shadow-sm ${MODULE_IDENTITIES.DEPARTMENT.solidBg}`}>
                            <MODULE_IDENTITIES.DEPARTMENT.icon className="h-6 w-6 sm:h-7 sm:w-7 text-white" />
                        </div>
                    }
                    actions={
                        <>
                            <Button type="button" variant="outline" onClick={() => router.push(returnUrl)} className="h-9 px-4 rounded-full shadow-sm">
                                Hủy bỏ
                            </Button>
                            <Button type="submit" disabled={isSubmitting} className="h-9 px-6 rounded-full shadow-sm bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 text-white font-medium">
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

export function DepartmentForm(props: DepartmentFormProps) {
    return (
        <Suspense fallback={<div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
            <DepartmentFormInternal {...props} />
        </Suspense>
    );
}
