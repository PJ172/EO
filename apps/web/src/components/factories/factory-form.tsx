"use client";

import { getAvatarVariant } from "../../lib/utils";
import { MODULE_IDENTITIES } from "@/config/module-identities";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useEffect, useState } from "react";
import { toast } from "@/components/ui/toaster";
import { Factory, useCreateFactory, useUpdateFactory, useFactory } from "@/services/factory.service";
import { useEmployees } from "@/services/employee.service";
import { useCompanies } from "@/services/company.service";
import { useNextCode } from "@/services/department.service";
import { Loader2, Building2, RefreshCw, Check, ChevronsUpDown, User } from "lucide-react";
import { cn, capitalizeWords } from "@/lib/utils";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { FormDrawerContainer } from "@/components/ui/form-drawer-container";


const factorySchema = z.object({
    code: z.string().min(1, "Mã nhà máy là bắt buộc").max(7, "Mã nhà máy có tối đa 7 ký tự"),
    name: z.string().min(1, "Tên nhà máy là bắt buộc"),
    address: z.string().optional(),
    managerEmployeeId: z.string().optional().nullable(),
    companyId: z.string().optional().nullable(),
    status: z.enum(["ACTIVE", "INACTIVE"]),
    showOnOrgChart: z.boolean(),
    excludeFromFilters: z.boolean(),
});

type FactoryFormData = z.infer<typeof factorySchema>;

interface FactoryFormProps {
    factoryId?: string | null;
    initialData?: Factory | null;
    returnUrl?: string;
    variant?: "page" | "drawer";
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    onSuccess?: () => void;
}


export function FactoryForm({ 
    factoryId, 
    initialData, 
    returnUrl = "/factories", 
    variant = "page", 
    open, 
    onOpenChange, 
    onSuccess 
}: FactoryFormProps) {
    const router = useRouter();
    const [openManager, setOpenManager] = useState(false);
    const [openCompany, setOpenCompany] = useState(false);
    const isEditMode = !!factoryId || !!initialData;
    const { data: factoryFetched, isLoading: isLoadingFactory } = useFactory(factoryId || "");
    const factory = initialData || factoryFetched;

    const { data: employeesData } = useEmployees({ limit: 1000 });
    const employees = employeesData?.data || [];

    const { data: companiesData } = useCompanies({ limit: 1000, excludeFromFilters: "false" } as any);
    const companies = companiesData?.data || [];

    const createFactory = useCreateFactory();
    const updateFactory = useUpdateFactory();

    const form = useForm<FactoryFormData>({
        resolver: zodResolver(factorySchema),
        mode: "onChange",
        defaultValues: {
            code: "",
            name: "",
            address: "",
            managerEmployeeId: null,
            companyId: null,
            status: "ACTIVE",
            showOnOrgChart: false,
            excludeFromFilters: false,
        },
    });

    useEffect(() => {
        if (factory) {
            form.reset({
                code: factory.code,
                name: factory.name,
                address: factory.address || "",
                managerEmployeeId: factory.managerEmployeeId || null,
                companyId: (factory as any).companyId || null,
                status: factory.status,
                showOnOrgChart: (factory as any).showOnOrgChart ?? false,
                excludeFromFilters: (factory as any).excludeFromFilters ?? false,
            });
        }
    }, [factory, form]);

    const prefix = "NM";
    const { data: nextCodeData, refetch: refetchNextCode, isFetching: isFetchingNextCode } = useNextCode("FACTORY", prefix, !isEditMode);

    useEffect(() => {
        if (!isEditMode && nextCodeData?.nextCode) {
            form.setValue("code", nextCodeData.nextCode, { shouldValidate: true });
        }
    }, [nextCodeData, isEditMode, form]);

    const onSubmit = async (data: FactoryFormData) => {
        try {
            const submitData = {
                ...data,
                companyId: data.companyId === null ? undefined : data.companyId,
                managerEmployeeId: data.managerEmployeeId === null ? undefined : data.managerEmployeeId,
            };

            if (isEditMode && (factoryId || factory?.id)) {
                await updateFactory.mutateAsync({ id: (factoryId || factory?.id) as string, ...submitData });
                toast.success("Cập nhật nhà máy thành công");
                if (variant === "drawer") onSuccess?.();
            } else {
                await createFactory.mutateAsync(submitData);
                toast.success("Tạo nhà máy thành công");
                if (variant === "drawer") {
                    onSuccess?.();
                    onOpenChange?.(false);
                } else {
                    router.push(returnUrl);
                }
            }
        } catch (error: any) {
            const message = error?.response?.data?.message || "Lỗi lưu nhà máy";
            toast.error(message);
        }
    };

    const isSubmitting = createFactory.isPending || updateFactory.isPending;

    if (isEditMode && isLoadingFactory && !initialData) {
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
                                    <Label required={true}>Mã nhà máy</Label>
                                    <FormControl>
                                        <div className="flex gap-2">
                                            <Input
                                                placeholder="VD: NM001"
                                                {...field}
                                                disabled={isEditMode || isFetchingNextCode}
                                                readOnly={!isEditMode}
                                                className={!isEditMode ? "bg-slate-50 cursor-not-allowed" : "focus:ring-orange-500"}
                                                onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                                            />
                                            {!isEditMode && (
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="icon"
                                                    onClick={() => refetchNextCode()}
                                                    disabled={isFetchingNextCode}
                                                    title="Lấy mã mới"
                                                    className="shrink-0 hover:bg-orange-50 hover:text-orange-600 transition-colors"
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
                                            <SelectTrigger className="focus:ring-orange-500">
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
                                                    className={cn("w-full justify-between h-10 focus:ring-2 focus:ring-orange-500 min-w-0", !field.value && "text-muted-foreground")}
                                                >
                                                    {field.value ? (
                                                        <div className="flex items-center gap-2 truncate flex-1 text-left">
                                                            <Avatar className="h-6 w-6 shrink-0">
                                                                <AvatarImage src={employees.find(e => e.id === field.value)?.avatar} />
                                                                <AvatarFallback><User className="h-3 w-3" /></AvatarFallback>
                                                            </Avatar>
                                                            <span className="truncate">{employees.find((e) => e.id === field.value)?.fullName}</span>
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
                            name="companyId"
                            render={({ field }) => (
                                <FormItem className="flex flex-col">
                                    <FormLabel>Trực thuộc</FormLabel>
                                    <Popover open={openCompany} onOpenChange={setOpenCompany}>
                                        <PopoverTrigger asChild>
                                            <FormControl>
                                                <Button
                                                    variant="outline"
                                                    role="combobox"
                                                    className={cn("w-full justify-between h-10 focus:ring-2 focus:ring-orange-500 min-w-0", !field.value && "text-muted-foreground")}
                                                >
                                                    {field.value ? (
                                                        <div className="flex items-center gap-2 truncate flex-1 text-left">
                                                            <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                                                            <span className="truncate">{companies.find((c) => c.id === field.value)?.name}</span>
                                                        </div>
                                                    ) : "Chọn trực thuộc"}
                                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                                </Button>
                                            </FormControl>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-[400px] p-0" align="start">
                                            <Command>
                                                <CommandInput placeholder="Tìm công ty..." />
                                                <CommandList>
                                                    <CommandEmpty>Không tìm thấy công ty.</CommandEmpty>
                                                    <CommandGroup>
                                                        <CommandItem
                                                            value="__none__"
                                                            onSelect={() => {
                                                                form.setValue("companyId", null);
                                                                setOpenCompany(false);
                                                            }}
                                                        >
                                                            <Check className={cn("mr-2 h-4 w-4", !field.value ? "opacity-100" : "opacity-0")} />
                                                            -- Bỏ rỗng --
                                                        </CommandItem>
                                                        {companies.map((c) => (
                                                            <CommandItem
                                                                value={c.name}
                                                                key={c.id}
                                                                onSelect={() => {
                                                                    form.setValue("companyId", c.id);
                                                                    setOpenCompany(false);
                                                                }}
                                                            >
                                                                <div className="flex items-center gap-2">
                                                                    <Check className={cn("h-4 w-4", c.id === field.value ? "opacity-100" : "opacity-0")} />
                                                                    <span>{c.name}</span>
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
                                    <Label required={true}>Tên nhà máy</Label>
                                    <FormControl>
                                        <Input
                                            placeholder="VD: Nhà máy Sunplast Hà Nội"
                                            {...field}
                                            className="focus:ring-orange-500 h-11 text-base font-medium"
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
                            name="address"
                            render={({ field }) => (
                                <FormItem className="md:col-span-2">
                                    <Label>Địa chỉ</Label>
                                    <FormControl>
                                        <Textarea 
                                            placeholder="Địa chỉ chi tiết nhà máy..." 
                                            {...field} 
                                            rows={3}
                                            className="focus:ring-orange-500 resize-none"
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
                                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm bg-slate-50/50 dark:bg-slate-900/50">
                                    <div className="space-y-0.5">
                                        <FormLabel className="text-sm font-semibold text-slate-800 dark:text-slate-200">Hiển thị trên sơ đồ tổ chức</FormLabel>
                                        <div className="text-[0.75rem] text-muted-foreground">
                                            Nếu tắt, sẽ không xuất hiện trên Org Chart.
                                        </div>
                                    </div>
                                    <FormControl>
                                        <Switch
                                            checked={field.value}
                                            onCheckedChange={field.onChange}
                                            className="data-[state=checked]:bg-orange-600 scale-90"
                                        />
                                    </FormControl>
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="excludeFromFilters"
                            render={({ field }) => (
                                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm bg-slate-50/50 dark:bg-slate-900/50">
                                    <div className="space-y-0.5">
                                        <FormLabel className="text-sm font-semibold text-slate-800 dark:text-slate-200">Ẩn khỏi bộ lọc tìm kiếm</FormLabel>
                                        <div className="text-[0.75rem] text-muted-foreground">
                                            Nếu bật, nhà máy này sẽ bị ẩn khỏi các danh sách bộ lọc.
                                        </div>
                                    </div>
                                    <FormControl>
                                        <Switch
                                            checked={field.value}
                                            onCheckedChange={field.onChange}
                                            className="data-[state=checked]:bg-rose-500 scale-90"
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
                title={isEditMode ? "Chỉnh sửa Nhà máy" : "Thêm mới Nhà máy"}
                size="2xl"
                footer={
                    <>
                        <Button type="button" variant="outline" onClick={() => onOpenChange?.(false)} className="h-9 px-4 rounded-full shadow-sm">
                            Hủy bỏ
                        </Button>
                        <Button type="submit" form="factory-form" disabled={isSubmitting} className="h-9 px-6 rounded-full shadow-sm bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white font-medium">
                            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {isEditMode ? "Cập nhật" : "Tạo mới"}
                        </Button>
                    </>
                }
            >
                <Form {...form}>
                    <form id="factory-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                title={isEditMode ? "Chỉnh sửa Nhà máy" : "Thêm mới Nhà máy"}
                backHref={returnUrl}
                icon={
                    <div className={`h-10 w-10 sm:h-12 sm:w-12 rounded-xl flex items-center justify-center shadow-sm ${MODULE_IDENTITIES.FACTORY.solidBg}`}>
                        <MODULE_IDENTITIES.FACTORY.icon className="h-6 w-6 sm:h-7 sm:w-7 text-white" />
                    </div>
                }
                actions={
                    <>
                        <Button type="button" variant="outline" onClick={() => router.push(returnUrl)} className="h-9 px-4 rounded-full shadow-sm">
                            Hủy bỏ
                        </Button>
                        <Button type="submit" disabled={isSubmitting} className="h-9 px-6 rounded-full shadow-sm bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white font-medium">
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

