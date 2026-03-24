"use client";

import { useImportEmployees, useDownloadTemplate, usePreviewEmployees } from "@/services/employee.service";
import { ImportDialogShell } from "@/components/ui/import-dialog-shell";

interface ImportEmployeeDialogProps {
    onSuccess?: () => void;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
}

export function ImportEmployeeDialog({ onSuccess, open = false, onOpenChange }: ImportEmployeeDialogProps) {
    const importMutation = useImportEmployees();
    const templateMutation = useDownloadTemplate();
    const previewMutation = usePreviewEmployees();

    return (
        <ImportDialogShell
            open={open}
            onOpenChange={onOpenChange ?? (() => { })}
            title="Nhập Excel – Nhân viên"
            description="Tải file mẫu, điền thông tin và upload để thêm/cập nhật nhiều nhân viên cùng lúc."
            entityLabel="nhân viên"
            maxRows={500}
            onDownloadTemplate={async () => {
                await templateMutation.mutateAsync();
            }}
            isTemplateLoading={templateMutation.isPending}
            onPreview={async (file) => {
                return previewMutation.mutateAsync(file);
            }}
            onImport={async (file, autoCreateUser) => {
                return importMutation.mutateAsync({ file, autoCreateUser: autoCreateUser ?? false });
            }}
            onSuccess={onSuccess}
            showAutoCreateUserCheckbox={true}
        />
    );
}
