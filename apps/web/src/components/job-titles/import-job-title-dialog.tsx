"use client";

import { useImportJobTitles, useJobTitleTemplate, usePreviewJobTitles } from "@/services/job-title.service";
import { ImportDialogShell } from "@/components/ui/import-dialog-shell";

interface ImportJobTitleDialogProps {
    onSuccess?: () => void;
    title?: string;
    description?: string;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
}

export function ImportJobTitleDialog({
    onSuccess,
    title = "Nhập Excel – Chức danh",
    description = "Tải file mẫu, điền thông tin và upload để thêm/cập nhật nhiều chức danh cùng lúc.",
    open = false,
    onOpenChange,
}: ImportJobTitleDialogProps) {
    const downloadTemplate = useJobTitleTemplate();
    const importJobTitles = useImportJobTitles();
    const previewJobTitles = usePreviewJobTitles();

    return (
        <ImportDialogShell
            open={open}
            onOpenChange={onOpenChange ?? (() => { })}
            title={title}
            description={description}
            entityLabel="chức danh"
            maxRows={500}
            onDownloadTemplate={async () => {
                await downloadTemplate.mutateAsync();
            }}
            isTemplateLoading={downloadTemplate.isPending}
            onPreview={async (file) => {
                return previewJobTitles.mutateAsync(file);
            }}
            onImport={async (file) => {
                const res = await importJobTitles.mutateAsync(file) as any;
                return { success: res.success, errors: res.errors };
            }}
            onSuccess={onSuccess}
        />
    );
}
