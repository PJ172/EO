import os

filepath = r'd:\00.APPS\EOFFICE\apps\web\src\components\divisions\division-form.tsx'

with open(filepath, 'r', encoding='utf-8') as f:
    code = f.read()

# 1. Imports
if "FormDrawerContainer" not in code:
    code = code.replace(
        'import { Switch } from "@/components/ui/switch";',
        'import { Switch } from "@/components/ui/switch";\nimport { FormDrawerContainer } from "@/components/ui/form-drawer-container";'
    )

# 2. Props
p_old = """interface DivisionFormProps {
    divisionId?: string | null;
    returnUrl?: string;
}"""
p_new = """interface DivisionFormProps {
    divisionId?: string | null;
    returnUrl?: string;
    variant?: "page" | "drawer";
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    onSuccess?: () => void;
}"""
code = code.replace(p_old, p_new)

# 3. Signature
s_old = 'function DivisionFormInternal({ divisionId, returnUrl = "/divisions" }: DivisionFormProps) {'
s_new = 'function DivisionFormInternal({ divisionId, returnUrl = "/divisions", variant = "page", open, onOpenChange, onSuccess }: DivisionFormProps) {'
code = code.replace(s_old, s_new)

# 4. useForm Mode
m_old = """    const form = useForm<DivisionFormData>({
        resolver: zodResolver(formSchema),
        defaultValues: {"""
m_new = """    const form = useForm<DivisionFormData>({
        resolver: zodResolver(formSchema),
        mode: "onChange",
        defaultValues: {"""
code = code.replace(m_old, m_new)

# 5. onSubmit Success
o_old = """            if (isEditMode) {
                await updateDivision.mutateAsync({ id: divisionId as string, ...payload });
                toast.success("Cập nhật khối thành công");
            } else {
                await createDivision.mutateAsync(payload);
                toast.success("Tạo khối mới thành công");
                router.push(returnUrl);
            }"""
o_new = """            if (isEditMode) {
                await updateDivision.mutateAsync({ id: divisionId as string, ...payload });
                toast.success("Cập nhật khối thành công");
                if (variant === "drawer") onSuccess?.();
            } else {
                await createDivision.mutateAsync(payload);
                toast.success("Tạo khối mới thành công");
                if (variant === "drawer") {
                    onSuccess?.();
                    onOpenChange?.(false);
                } else {
                    router.push(returnUrl);
                }
            }"""
code = code.replace(o_old, o_new)

# 6. Render splitting
search_grid = '<div className="grid grid-cols-1 md:grid-cols-2 gap-6">'
search_grid_end = '</div>\n                    </CardContent>\n                </Card>'

idx_start = code.find(search_grid)
idx_end = code.find(search_grid_end, idx_start)

if idx_start != -1 and idx_end != -1:
    form_fields = code[idx_start:idx_end + len('</div>')]
    form_fields_indented = form_fields.replace('\n', '\n    ')
    
    # Now replace the return statement block
    r_start_str = '    return (\n        <Form {...form}>'
    r_end_str = '        </Form>\n    );'
    r_start = code.find(r_start_str)
    r_end = code.find(r_end_str, r_start) + len(r_end_str)
    
    if r_start != -1 and r_end != -1:
        template = """    const formFields = (
        __FORM_FIELDS__
    );

    if (variant === "drawer") {
        return (
            <FormDrawerContainer
                open={open ?? false}
                onOpenChange={onOpenChange ?? (() => {})}
                title={isEditMode ? "Cập nhật Khối" : "Thêm mới Khối"}
                size="md"
                footer={
                    <>
                        <Button type="button" variant="outline" onClick={() => onOpenChange?.(false)} className="h-9 px-4 rounded-full shadow-sm">
                            Hủy bỏ
                        </Button>
                        <Button type="submit" form="division-form" disabled={isSubmitting} className="h-9 px-6 rounded-full shadow-sm bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white font-medium">
                            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {isEditMode ? "Cập nhật" : "Tạo mới"}
                        </Button>
                    </>
                }
            >
                <Form {...form}>
                    <form id="division-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                    title={isEditMode ? "Cập nhật Khối" : "Thêm mới Khối"}
                    backHref={returnUrl}
                    icon={
                        <div className={`h-10 w-10 sm:h-12 sm:w-12 rounded-xl flex items-center justify-center shadow-sm ${MODULE_IDENTITIES.DIVISION.solidBg}`}>
                            <MODULE_IDENTITIES.DIVISION.icon className="h-6 w-6 sm:h-7 sm:w-7 text-white" />
                        </div>
                    }
                    actions={
                        <>
                            <Button type="button" variant="outline" onClick={() => router.push(returnUrl)} className="h-9 px-4 rounded-full shadow-sm">Hủy bỏ</Button>
                            <Button type="submit" disabled={isSubmitting} className="h-9 px-6 rounded-full shadow-sm bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white font-medium">
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
        new_render = template.replace('__FORM_FIELDS__', form_fields_indented)
        code = code[:r_start] + new_render + code[r_end:]

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(code)

print("SUCCESS")
