"use client";

import { getAvatarVariant } from "../../lib/utils";
import { MODULE_IDENTITIES } from "@/config/module-identities";
import { useForm } from "react-hook-form";
import { useEffect, useState } from "react";
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
import { useNextCode } from "@/services/department.service";
import { Company, useCompany, useCreateCompany, useUpdateCompany } from "@/services/company.service";
import { toast } from "sonner";
import { Loader2, Building2, RefreshCw, Check, ChevronsUpDown, User } from "lucide-react";
import { cn, capitalizeWords } from "@/lib/utils";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { useEmployees } from "@/services/employee.service";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { FormDrawerContainer } from "@/components/ui/form-drawer-container";


const formSchema = z.object({
    code: z.string().min(2, "Mã công ty phải có ít nhất 2 ký tự").max(7, "Mã công ty có tối đa 7 ký tự"),
    name: z.string().min(2, "Tên công ty phải có ít nhất 2 ký tự"),
    note: z.string().optional(),
    managerEmployeeId: z.string().optional().nullable(),
    status: z.enum(["ACTIVE", "INACTIVE"]),
    showOnOrgChart: z.boolean(),
    excludeFromFilters: z.boolean(),
});

type CompanyFormData = z.infer<typeof formSchema>;

interface CompanyFormProps {
    companyId?: string | null;
    initialData?: Company | null;
    returnUrl?: string;
    variant?: "page" | "drawer";
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    onSuccess?: () => void;
}


export function CompanyForm({ 
    companyId, 
    initialData, 
    returnUrl = "/companies", 
    variant = "page", 
    open, 
    onOpenChange, 
    onSuccess 
}: CompanyFormProps) {
    const router = useRouter();
    const [openManager, setOpenManager] = useState(false);
    const isEditMode = !!companyId || !!initialData;
    const { data: departmentFetched, isLoading: isLoadingCompany } = useCompany(companyId || "");
    const company = initialData || departmentFetched;

    const { data: employeesData } = useEmployees({ limit: 1000 });
    const employees = employeesData?.data || [];

    const createCompany = useCreateCompany();
    const updateCompany = useUpdateCompany();

    const form = useForm<CompanyFormData>({
        resolver: zodResolver(formSchema),
        mode: "onChange",
        defaultValues: {
            code: "",
            name: "",
            note: "",
            managerEmployeeId: null,
            status: "ACTIVE",
            showOnOrgChart: false,
            excludeFromFilters: false,
        },
    });

    const prefix = "CT";
    const { data: nextCodeData, refetch: refetchNextCode, isFetching: isFetchingNextCode } = useNextCode("COMPANY", prefix, !isEditMode);

    useEffect(() => {
        if (!isEditMode && nextCodeData?.nextCode) {
            form.setValue("code", nextCodeData.nextCode);
        }
    }, [nextCodeData, isEditMode, form]);

    useEffect(() => {
        if (company) {
            form.reset({
                code: company.code,
                name: company.name,
                note: company.note || "",
                managerEmployeeId: company.managerEmployeeId || null,
                status: company.status,
                showOnOrgChart: company.showOnOrgChart ?? false,
                excludeFromFilters: (company as any).excludeFromFilters ?? false,
            });
        }
    }, [company, form]);

    const onSubmit = async (data: CompanyFormData) => {
        try {
            if (companyId && company) {
                await updateCompany.mutateAsync({
                    id: company.id,
                    ...data,
                });
                toast.success("Cập nhật công ty thành công");
                if (variant === "drawer") {
                    onSuccess?.();
                    onOpenChange?.(false);
                }
            } else {
                await createCompany.mutateAsync({
                    ...data,
                });
                toast.success("Tạo công ty thành công");
                if (variant === "drawer") {
                    onSuccess?.();
                    onOpenChange?.(false);
                } else {
                    router.push(returnUrl);
                }
            }
        } catch (error: any) {
            toast.error(error?.response?.data?.message || "Đã có lỗi xảy ra");
        }
    };

    const isSubmitting = createCompany.isPending || updateCompany.isPending;

    if (isEditMode && isLoadingCompany && !initialData) {
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
                                        <Label required={true}>Mã công ty</Label>
                                        <FormControl>
                                            <div className="flex gap-2">
                                                <Input
                                                    placeholder="VD: CT001"
                                                    {...field}
                                                    disabled={isEditMode || isFetchingNextCode}
                                                    readOnly={!isEditMode}
                                                    className={!isEditMode ? "bg-slate-50 cursor-not-allowed" : "focus:ring-indigo-500"}
                                                />
                                                {!isEditMode && (
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="icon"
                                                        onClick={() => refetchNextCode()}
                                                        disabled={isFetchingNextCode}
                                                        title="Lấy mã mới"
                                                        className="shrink-0 hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
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
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="managerEmployeeId"
                                render={({ field }) => (
                                    <FormItem className="flex flex-col">
                                        <FormLabel>Người điều hành</FormLabel>
                                        <Popover open={openManager} onOpenChange={setOpenManager}>
                                            <PopoverTrigger asChild>
                                                <FormControl>
                                                    <Button
                                                        variant="outline"
                                                        role="combobox"
                                                        className={cn("w-full justify-between h-10 focus:ring-2 focus:ring-indigo-500", !field.value && "text-muted-foreground")}
                                                    >
                                                        {field.value ? (
                                                            <div className="flex items-center gap-2">
                                                                <Avatar className="h-6 w-6">
                                                                    <AvatarImage src={employees.find(e => e.id === field.value)?.avatar} />
                                                                    <AvatarFallback><User className="h-3 w-3" /></AvatarFallback>
                                                                </Avatar>
                                                                {employees.find((e) => e.id === field.value)?.fullName}
                                                            </div>
                                                        ) : "Chọn người điều hành"}
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
                                                            <CommandItem
                                                                value="__none__"
                                                                onSelect={() => {
                                                                    form.setValue("managerEmployeeId", null);
                                                                    setOpenManager(false);
                                                                }}
                                                            >
                                                                <Check className={cn("mr-2 h-4 w-4", !field.value ? "opacity-100" : "opacity-0")} />
                                                                -- Không chọn --
                                                            </CommandItem>
                                                            {employees.map((e) => (
                                                                <CommandItem
                                                                    value={`${e.fullName} ${e.employeeCode}`}
                                                                    key={e.id}
                                                                    onSelect={() => {
                                                                        form.setValue("managerEmployeeId", e.id);
                                                                        setOpenManager(false);
                                                                    }}
                                                                >
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
                                        <Label required={true}>Tên công ty</Label>
                                        <FormControl>
                                            <Input
                                                placeholder="Nhập tên đầy đủ của công ty..."
                                                {...field}
                                                className="focus:ring-indigo-500 h-11 text-base font-medium"
                                                onChange={(e) => {
                                                    field.onChange(capitalizeWords(e.target.value));
                                                }}
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
                                            <Textarea 
                                                placeholder="Nhập thông tin mô tả hoặc ghi chú thêm về công ty..." 
                                                {...field} 
                                                rows={4}
                                                className="focus:ring-indigo-500 resize-none"
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
                                                Nếu tắt, công ty này và các đơn vị con sẽ không xuất hiện trên Org Chart.
                                            </div>
                                        </div>
                                        <FormControl>
                                            <Switch
                                                checked={field.value}
                                                onCheckedChange={field.onChange}
                                                className="data-[state=checked]:bg-indigo-600"
                                            />
                                        </FormControl>
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="excludeFromFilters"
                                render={({ field }) => (
                                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 shadow-sm bg-white dark:bg-slate-950">
                                        <div className="space-y-0.5">
                                            <FormLabel className="text-base font-semibold text-slate-800 dark:text-slate-200">Ẩn khỏi bộ lọc tìm kiếm</FormLabel>
                                            <div className="text-[0.8rem] text-muted-foreground font-medium">
                                                Nếu bật, công ty này sẽ bị ẩn khỏi các danh sách xổ xuống của bộ lọc.
                                            </div>
                                        </div>
                                        <FormControl>
                                            <Switch
                                                checked={field.value}
                                                onCheckedChange={field.onChange}
                                                className="data-[state=checked]:bg-rose-500"
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
                title={isEditMode ? "Cập nhật Công ty" : "Thêm Công ty mới"}
                size="2xl"
                footer={
                    <>
                        <Button type="button" variant="outline" onClick={() => onOpenChange?.(false)} className="h-9 px-4 rounded-full shadow-sm">
                            Hủy bỏ
                        </Button>
                        <Button type="submit" form="company-form" disabled={isSubmitting} className="h-9 px-6 rounded-full shadow-sm bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-medium">
                            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {isEditMode ? "Cập nhật" : "Tạo mới"}
                        </Button>
                    </>
                }
            >
                <Form {...form}>
                    <form id="company-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                    title={isEditMode ? "Cập nhật Công ty" : "Thêm Công ty mới"}
                    backHref={returnUrl}
                    icon={
                        <div className={`h-10 w-10 sm:h-12 sm:w-12 rounded-xl flex items-center justify-center shadow-sm ${MODULE_IDENTITIES.COMPANY.solidBg}`}>
                            <MODULE_IDENTITIES.COMPANY.icon className="h-6 w-6 sm:h-7 sm:w-7 text-white" />
                        </div>
                    }
                    actions={
                        <>
                            <Button type="button" variant="outline" onClick={() => router.push(returnUrl)} className="h-9 px-4 rounded-full shadow-sm">
                                Hủy bỏ
                            </Button>
                            <Button type="submit" disabled={isSubmitting} className="h-9 px-6 rounded-full shadow-sm bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-medium">
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
