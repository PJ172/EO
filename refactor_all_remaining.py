import os

files_config = [
    {
        "filepath": r'd:\00.APPS\EOFFICE\apps\web\src\components\departments\department-form.tsx',
        "name": "phòng ban",
        "title": "Phòng ban",
        "id": "department-form",
        "prefix_import": 'import { Switch } from "@/components/ui/switch";',
        "props_old": """interface DepartmentFormProps {
    departmentId?: string | null;
    initialData?: Department | null;
    defaultParentId?: string | null;
    returnUrl?: string;
}""",
        "props_new": """interface DepartmentFormProps {
    departmentId?: string | null;
    initialData?: Department | null;
    defaultParentId?: string | null;
    returnUrl?: string;
    variant?: "page" | "drawer";
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    onSuccess?: () => void;
}""",
        "sig_old": 'function DepartmentFormInternal({ departmentId, initialData, defaultParentId, returnUrl = "/departments" }: DepartmentFormProps) {',
        "sig_new": 'function DepartmentFormInternal({ departmentId, initialData, defaultParentId, returnUrl = "/departments", variant = "page", open, onOpenChange, onSuccess }: DepartmentFormProps) {',
        "form_old": """    const form = useForm<DepartmentFormData>({
        resolver: zodResolver(formSchema),
        defaultValues: {""",
        "form_new": """    const form = useForm<DepartmentFormData>({
        resolver: zodResolver(formSchema),
        mode: "onChange",
        defaultValues: {""",
        "submit_old": """            if (isEditMode && (departmentId || department?.id)) {
                await updateDepartment.mutateAsync({ id: (departmentId || department?.id) as string, ...payload });
                toast.success("Cập nhật thành công");
            } else {
                await createDepartment.mutateAsync(payload);
                toast.success("Tạo mới thành công");
                router.push(returnUrl);
            }""",
        "submit_new": """            if (isEditMode && (departmentId || department?.id)) {
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
            }""",
        "grid_start": '<div className="grid grid-cols-1 md:grid-cols-2 gap-6">',
        "grid_end_marker": '</div>\n                    </CardContent>\n                </Card>\n            </form>\n        </Form>',
        "render_start_str": '    return (\n        <Form {...form}>',
        "render_end_str": '        </Form>\n    );',
        "drawer_template": """    const formFields = (
        __FORM_FIELDS__
    );

    if (variant === "drawer") {
        return (
            <FormDrawerContainer
                open={open ?? false}
                onOpenChange={onOpenChange ?? (() => {})}
                title={isEditMode ? `Cập nhật ${typeLabel}` : `Thêm mới ${typeLabel}`}
                size="md"
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
    );"""
    },
    {
        "filepath": r'd:\00.APPS\EOFFICE\apps\web\src\components\sections\section-form.tsx',
        "name": "bộ phận",
        "title": "Bộ phận",
        "id": "section-form",
        "prefix_import": 'import { Switch } from "@/components/ui/switch";',
        "props_old": """interface SectionFormProps {
    sectionId?: string | null;
    returnUrl?: string;
}""",
        "props_new": """interface SectionFormProps {
    sectionId?: string | null;
    returnUrl?: string;
    variant?: "page" | "drawer";
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    onSuccess?: () => void;
}""",
        "sig_old": 'function SectionFormInternal({ sectionId, returnUrl = "/sections" }: SectionFormProps) {',
        "sig_new": 'function SectionFormInternal({ sectionId, returnUrl = "/sections", variant = "page", open, onOpenChange, onSuccess }: SectionFormProps) {',
        "form_old": """    const form = useForm<SectionFormData>({
        resolver: zodResolver(formSchema),
        defaultValues: {""",
        "form_new": """    const form = useForm<SectionFormData>({
        resolver: zodResolver(formSchema),
        mode: "onChange",
        defaultValues: {""",
        "submit_old": """            if (isEditMode) {
                await updateSection.mutateAsync({ id: sectionId as string, ...payload });
                toast.success("Cập nhật bộ phận thành công");
            } else {
                await createSection.mutateAsync(payload);
                toast.success("Tạo bộ phận mới thành công");
                router.push(returnUrl);
            }""",
        "submit_new": """            if (isEditMode) {
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
            }""",
        "grid_start": '<div className="grid grid-cols-1 md:grid-cols-2 gap-6">',
        "grid_end_marker": '</div>\n                    </CardContent>\n                </Card>\n            </form>\n        </Form>',
        "render_start_str": '    return (\n        <Form {...form}>',
        "render_end_str": '        </Form>\n    );',
        "drawer_template": """    const formFields = (
        __FORM_FIELDS__
    );

    if (variant === "drawer") {
        return (
            <FormDrawerContainer
                open={open ?? false}
                onOpenChange={onOpenChange ?? (() => {})}
                title={isEditMode ? "Cập nhật Bộ Phận" : "Thêm mới Bộ Phận"}
                size="md"
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
    );"""
    },
    {
        "filepath": r'd:\00.APPS\EOFFICE\apps\web\src\components\job-titles\job-title-form.tsx',
        "name": "chức vụ",
        "title": "Chức vụ",
        "id": "job-title-form",
        "prefix_import": 'import { capitalizeWords } from "@/lib/utils";',
        "props_old": """interface JobTitleFormProps {
    jobTitleId?: string | null;
    initialData?: JobTitle | null;
    returnUrl?: string;
}""",
        "props_new": """interface JobTitleFormProps {
    jobTitleId?: string | null;
    initialData?: JobTitle | null;
    returnUrl?: string;
    variant?: "page" | "drawer";
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    onSuccess?: () => void;
}""",
        "sig_old": 'export function JobTitleForm({ jobTitleId, initialData, returnUrl = "/job-titles" }: JobTitleFormProps) {',
        "sig_new": 'export function JobTitleForm({ jobTitleId, initialData, returnUrl = "/job-titles", variant = "page", open, onOpenChange, onSuccess }: JobTitleFormProps) {',
        "form_old": """    const form = useForm<JobTitleFormData>({
        resolver: zodResolver(formSchema),
        defaultValues: {""",
        "form_new": """    const form = useForm<JobTitleFormData>({
        resolver: zodResolver(formSchema),
        mode: "onChange",
        defaultValues: {""",
        "submit_old": """            if (isEditMode) {
                const { code, ...updateValues } = values;
                await updateMutation.mutateAsync({ id: jobTitleId as string, ...updateValues });
                toast.success("Cập nhật chức vụ thành công");
            } else {
                await createMutation.mutateAsync(values);
                toast.success("Tạo chức vụ thành công");
                router.push(returnUrl);
            }""",
        "submit_new": """            if (isEditMode) {
                const { code, ...updateValues } = values;
                await updateMutation.mutateAsync({ id: jobTitleId as string, ...updateValues });
                toast.success("Cập nhật chức vụ thành công");
                if (variant === "drawer") onSuccess?.();
            } else {
                await createMutation.mutateAsync(values);
                toast.success("Tạo chức vụ thành công");
                if (variant === "drawer") {
                    onSuccess?.();
                    onOpenChange?.(false);
                } else {
                    router.push(returnUrl);
                }
            }""",
        "grid_start": '<div className="grid grid-cols-1 md:grid-cols-2 gap-6">',
        "grid_end_marker": '</div>\n                        </Form>',
        "render_start_str": '    return (\n        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 max-w-5xl mx-auto w-full">',
        "render_end_str": '        </form>\n    );',
        "drawer_template": """    const formFields = (
        __FORM_FIELDS__
    );

    if (variant === "drawer") {
        return (
            <FormDrawerContainer
                open={open ?? false}
                onOpenChange={onOpenChange ?? (() => {})}
                title={isEditMode ? "Chỉnh sửa Chức vụ" : "Thêm mới Chức vụ"}
                size="md"
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
                title={isEditMode ? "Chỉnh sửa Chức vụ" : "Thêm mới Chức vụ"}
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
    );"""
    }
]

for cfg in files_config:
    filepath = cfg["filepath"]
    if not os.path.exists(filepath):
        print(f"File not found: {filepath}")
        continue

    with open(filepath, 'r', encoding='utf-8') as f:
        code = f.read()

    # 1. Imports
    if "FormDrawerContainer" not in code:
        code = code.replace(
            cfg["prefix_import"],
            cfg["prefix_import"] + '\nimport { FormDrawerContainer } from "@/components/ui/form-drawer-container";'
        )

    # 2. Replaces
    code = code.replace(cfg["props_old"], cfg["props_new"])
    code = code.replace(cfg["sig_old"], cfg["sig_new"])
    code = code.replace(cfg["form_old"], cfg["form_new"])
    code = code.replace(cfg["submit_old"], cfg["submit_new"])

    # 3. Render split
    idx_start = code.find(cfg["grid_start"])
    idx_end = code.find(cfg["grid_end_marker"], idx_start)

    if idx_start != -1 and idx_end != -1:
        form_fields = code[idx_start:idx_end + len('</div>')]
        form_fields_indented = form_fields.replace('\n', '\n    ')
        
        r_start = code.find(cfg["render_start_str"])
        r_end = code.find(cfg["render_end_str"], r_start) + len(cfg["render_end_str"])
        
        if r_start != -1 and r_end != -1:
            # Special case for JobTitle which uses <form> instead of <Form>
            new_render = cfg["drawer_template"].replace('__FORM_FIELDS__', form_fields_indented)
            code = code[:r_start] + new_render + code[r_end:]
        else:
            print(f"Could not find return start/end in {filepath}")
    else:
        print(f"Could not find grid triggers in {filepath}")

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(code)

    print(f"SUCCESS: {filepath}")

