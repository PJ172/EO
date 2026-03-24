"use client";

import { useImportDepartments, useDownloadTemplate, usePreviewDepartments } from "@/services/department.service";
import { ImportDialogShell } from "@/components/ui/import-dialog-shell";

interface ImportDepartmentDialogProps {
    onSuccess?: () => void;
    title?: string;
    description?: string;
    type?: string;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
}

const TYPE_LABELS: Record<string, { label: string; maxRows: number }> = {
    COMPANY: { label: "công ty", maxRows: 1000 },
    FACTORY: { label: "nhà máy", maxRows: 1000 },
    DIVISION: { label: "khối", maxRows: 1000 },
    DEPARTMENT: { label: "phòng ban", maxRows: 1000 },
    SECTION: { label: "bộ phận", maxRows: 1000 },
    GROUP: { label: "nhóm", maxRows: 1000 },
};

export function ImportDepartmentDialog({
    onSuccess,
    title,
    description,
    type,
    open = false,
    onOpenChange,
}: ImportDepartmentDialogProps) {
    const importDepartments = useImportDepartments();
    const downloadTemplate = useDownloadTemplate();
    const previewDepartments = usePreviewDepartments();

    const typeInfo = type ? TYPE_LABELS[type] : null;
    const entityLabel = typeInfo?.label ?? "phòng ban";
    const dialogTitle = title ?? `Nhập Excel – ${entityLabel.charAt(0).toUpperCase() + entityLabel.slice(1)}`;
    const dialogDescription = description ?? `Tải file mẫu, điền thông tin và upload để thêm/cập nhật nhiều ${entityLabel} cùng lúc.`;

    return (
        <ImportDialogShell
            open={open}
            onOpenChange={onOpenChange ?? (() => { })}
            title={dialogTitle}
            description={dialogDescription}
            entityLabel={entityLabel}
            maxRows={typeInfo?.maxRows ?? 1000}
            onDownloadTemplate={async () => {
                await downloadTemplate.mutateAsync(type);
            }}
            isTemplateLoading={downloadTemplate.isPending}
            onPreview={async (file) => {
                return previewDepartments.mutateAsync({ file, type });
            }}
            onImport={async (file) => {
                return importDepartments.mutateAsync({ file, type });
            }}
            onSuccess={onSuccess}
        />
    );
}
