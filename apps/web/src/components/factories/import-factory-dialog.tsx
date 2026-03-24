"use client";

import { useImportFactories, useDownloadFactoryTemplate, usePreviewFactories } from "@/services/factory.service";
import { ImportDialogShell } from "@/components/ui/import-dialog-shell";

interface ImportFactoryDialogProps {
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    onSuccess?: () => void;
}

export function ImportFactoryDialog({ open = false, onOpenChange, onSuccess }: ImportFactoryDialogProps) {
    const importMutation = useImportFactories();
    const templateMutation = useDownloadFactoryTemplate();
    const previewMutation = usePreviewFactories();

    return (
        <ImportDialogShell
            open={open}
            onOpenChange={onOpenChange ?? (() => { })}
            title="Nhập Excel – Nhà máy"
            description="Tải file mẫu, điền thông tin và upload để thêm/cập nhật nhiều nhà máy cùng lúc."
            entityLabel="nhà máy"
            maxRows={500}
            onDownloadTemplate={async () => {
                await templateMutation.mutateAsync();
            }}
            isTemplateLoading={templateMutation.isPending}
            onPreview={async (file) => {
                return previewMutation.mutateAsync(file);
            }}
            onImport={async (file) => {
                return importMutation.mutateAsync(file);
            }}
            onSuccess={onSuccess}
        />
    );
}
