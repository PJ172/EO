"use client";

import { useImportRoles, useDownloadRoleTemplate, usePreviewRoles } from "@/services/roles.service";
import { ImportDialogShell } from "@/components/ui/import-dialog-shell";

interface ImportRoleDialogProps {
    onSuccess?: () => void;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
}

export function ImportRoleDialog({ onSuccess, open = false, onOpenChange }: ImportRoleDialogProps) {
    const importMutation = useImportRoles();
    const templateMutation = useDownloadRoleTemplate();
    const previewMutation = usePreviewRoles();

    return (
        <ImportDialogShell
            open={open}
            onOpenChange={onOpenChange ?? (() => { })}
            title="Nhập Excel – Vai trò phân quyền"
            description="Tải file mẫu, điền thông tin và upload để thêm/cập nhật nhiều vai trò cùng lúc."
            entityLabel="vai trò"
            moduleKey="roles"
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
            showAutoCreateUserCheckbox={false}
        />
    );
}
