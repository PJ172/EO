"use client";

import { useImportUsers, useDownloadUserTemplate, usePreviewUsers } from "@/services/users.service";
import { ImportDialogShell } from "@/components/ui/import-dialog-shell";

interface ImportUserDialogProps {
    onSuccess?: () => void;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
}

export function ImportUserDialog({ onSuccess, open = false, onOpenChange }: ImportUserDialogProps) {
    const importMutation = useImportUsers();
    const templateMutation = useDownloadUserTemplate();
    const previewMutation = usePreviewUsers();

    return (
        <ImportDialogShell
            open={open}
            onOpenChange={onOpenChange ?? (() => { })}
            title="Nhập Excel – Người dùng"
            description="Tải file mẫu, điền thông tin và upload để thêm/cập nhật nhiều tài khoản cùng lúc."
            entityLabel="người dùng"
            moduleKey="users"
            onDownloadTemplate={async () => {
                await templateMutation.mutateAsync();
            }}
            isTemplateLoading={templateMutation.isPending}
            onPreview={async (file) => {
                return previewMutation.mutateAsync(file);
            }}
            onImport={async (file) => {
                return importMutation.mutateAsync({ file });
            }}
            onSuccess={onSuccess}
            showAutoCreateUserCheckbox={false} // Users module itself creates users, no need for generic autoCreate checkbox.
        />
    );
}
