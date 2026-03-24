const fs = require('fs');
const file = 'd:/00.APPS/eOffice/apps/web/src/components/ui/import-dialog-shell.tsx';
const content = fs.readFileSync(file, 'utf8');

const prefixIdx = content.indexOf('function PreviewStep');
const suffixIdx = content.indexOf('function ImportingStep');

let prefix = content.slice(0, prefixIdx);
let suffix = content.slice(suffixIdx);

const newPreviewStep = `function PreviewStep({ data }: { data: PreviewResult }) {
    const cellErrors = data.cellErrors || {};
    const errorRowCount = Object.keys(cellErrors).length;
    const validCount = data.totalRows - errorRowCount;
    const [searchTerm, setSearchTerm] = useState('');
    const [showOnlyErrors, setShowOnlyErrors] = useState(false);

    const headers = (data.headers || Array.from(
        new Set(data.rows.flatMap(r => Object.keys(r).filter(k => k !== 'rowNumber')))
    ).map(key => ({ key, header: key }))).map(h => ({
        ...h,
        header: h.header.replace(/\\s*\\(.*?\\)\\s*/g, '').trim()
    }));

    // Formatter helpers
    const formatPhonePreview = (val: string) => {
        if (!val) return val;
        const cleaned = val.toString().replace(/\\D/g, '');
        if (cleaned.length === 10) {
            return \`\${cleaned.slice(0, 4)} \${cleaned.slice(4, 7)} \${cleaned.slice(7)}\`;
        }
        return val;
    };

    const formatDatePreview = (val: string) => {
        if (!val) return val;
        const d = new Date(val);
        if (!isNaN(d.getTime()) && val.toString().includes('GMT')) {
            const day = String(d.getDate()).padStart(2, '0');
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const year = d.getFullYear();
            return \`\${day}/\${month}/\${year}\`;
        }
        return val;
    };

    // Filter rows based on search term and error-only toggle
    const filteredRows = useMemo(() => {
        let rows = data.rows;
        if (showOnlyErrors) {
            const errorIndices = new Set(Object.keys(cellErrors).map(Number));
            rows = rows.filter((_, idx) => errorIndices.has(idx));
        }
        if (!searchTerm) return rows;
        const lowerSearch = searchTerm.toLowerCase();
        return rows.filter(row =>
            Object.values(row).some(val => String(val).toLowerCase().includes(lowerSearch))
        );
    }, [data.rows, searchTerm, showOnlyErrors, cellErrors]);

    // Download error report as CSV
    const handleDownloadErrorReport = () => {
        const errorIndices = Object.keys(cellErrors).map(Number);
        if (errorIndices.length === 0) return;
        const errorRows = data.rows.filter((_, idx) => errorIndices.includes(idx));
        const allKeys = headers.map(h => h.key);
        const headerRow = [...headers.map(h => h.header), 'Lý do lỗi'];
        const csvRows = errorRows.map((row, i) => {
            const originalIdx = data.rows.indexOf(row);
            const rowErrors = cellErrors[originalIdx] || {};
            const errMsg = Object.values(rowErrors).join('; ');
            return [...allKeys.map(k => \`"\${String(row[k] ?? '').replace(/"/g, '\\\\"')}"\`), \`"\${errMsg}"\`].join(',');
        });
        const csvContent = [headerRow.join(','), ...csvRows].join('\\n');
        const blob = new Blob(['\\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = \`bao_cao_loi_\${new Date().toISOString().slice(0, 10)}.csv\`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success(\`Đã tải báo cáo \${errorIndices.length} dòng lỗi.\`);
    };

    return (
        <div className="flex flex-col h-full gap-3 min-h-0">
            {/* Summary Banner */}
            <div className={cn("rounded-xl border p-3.5 shrink-0 shadow-sm transition-colors", errorRowCount > 0 ? 'border-amber-300 bg-amber-50 dark:bg-amber-950/30' : 'border-emerald-300 bg-emerald-50 dark:bg-emerald-950/30')}>
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div>
                        <div className="flex items-center gap-2 mb-1.5">
                            <TableIcon className={cn("h-4 w-4 shrink-0", errorRowCount > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400')} />
                            <h5 className={cn("text-sm font-bold mb-0", errorRowCount > 0 ? 'text-amber-800 dark:text-amber-300' : 'text-emerald-800 dark:text-emerald-300')}>Phân tích file hoàn tất</h5>
                        </div>
                        <div className="text-[13px] sm:ml-6 flex flex-wrap gap-x-2 gap-y-1 items-center leading-relaxed">
                            <span className="text-foreground/80">Hệ thống đọc được</span>
                            <strong className="text-foreground font-semibold">{data.totalRows} dòng</strong>
                            <span className="text-muted-foreground/60 hidden sm:inline">—</span>
                            <span className="text-emerald-600 font-semibold">{validCount} dòng hợp lệ ✓</span>
                            {errorRowCount > 0 && (
                                <>
                                    <span className="text-foreground/80">và</span>
                                    <span className="text-red-600 font-bold">{errorRowCount} dòng có lỗi ✗</span>
                                </>
                            )}
                        </div>
                    </div>
                    {errorRowCount > 0 && (
                        <Button
                            size="sm"
                            variant="outline"
                            className="h-8 text-xs font-semibold border-red-300 text-red-600 hover:bg-red-50 hover:text-red-700 shrink-0 shadow-sm"
                            onClick={handleDownloadErrorReport}
                        >
                            <Download className="h-3.5 w-3.5 mr-1.5" />
                            Tải báo cáo lỗi ({errorRowCount})
                        </Button>
                    )}
                </div>
            </div>

            {/* Error list */}
            {((data.detailedErrors && data.detailedErrors.length > 0) || (data.errors && data.errors.length > 0) || (errorRowCount > 0)) ? (
                <div className="rounded-xl border border-destructive/30 bg-red-50/50 dark:bg-destructive/10 p-3.5 shrink-0 shadow-sm">
                    <Label className="text-[13px] font-bold text-red-700 dark:text-red-400 mb-2.5 flex items-center gap-1.5">
                        <AlertCircle className="h-4 w-4" />
                        Chi tiết lỗi ({data.detailedErrors?.length || data.errors?.length || errorRowCount} lỗi):
                    </Label>
                    <ScrollArea className="h-[90px] pr-4">
                        <ul className="list-disc pl-6 space-y-2 text-[13px] text-red-900/90 dark:text-red-200/90">
                            {data.detailedErrors && data.detailedErrors.length > 0 ? (
                                <>
                                    {data.detailedErrors.slice(0, 50).map((err, i) => (
                                        <li key={i}>
                                            Cột <span className="font-semibold underline decoration-red-300 underline-offset-2">{err.headerName || err.colKey}</span> hàng <span className="font-bold">{err.rowNum}</span> đang bị lỗi: {err.message}
                                        </li>
                                    ))}
                                    {data.detailedErrors.length > 50 && <li className="italic text-red-700/70 pt-1">... và {data.detailedErrors.length - 50} lỗi khác. Vui lòng tải báo cáo để xem đầy đủ.</li>}
                                </>
                            ) : data.errors && data.errors.length > 0 ? (
                                <>
                                    {data.errors.slice(0, 50).map((err, i) => <li key={'e'+i}>{err}</li>)}
                                    {data.errors.length > 50 && <li className="italic text-red-700/70 pt-1">... và {data.errors.length - 50} lỗi khác</li>}
                                </>
                            ) : (
                                <li className="text-muted-foreground italic list-none -ml-4">Vui lòng tải báo cáo CSV để xem chi tiết lý do lỗi phát hiện tự động.</li>
                            )}
                        </ul>
                    </ScrollArea>
                </div>
            ) : (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/20 p-3 shrink-0 flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    <span className="text-[13px] font-semibold text-emerald-800 dark:text-emerald-300">Dữ liệu hợp lệ, đã sẵn sàng Import.</span>
                </div>
            )}

            <div className="rounded-xl border flex flex-col flex-1 min-h-0 overflow-hidden bg-background">
                <div className="bg-muted/30 px-4 py-2 border-b flex items-center justify-between shrink-0 gap-2">
                    <div className="flex items-center gap-2">
                        <div className="text-sm font-semibold">Preview dữ liệu ({filteredRows.length} dòng)</div>
                        {errorRowCount > 0 && (
                            <button
                                onClick={() => setShowOnlyErrors(v => !v)}
                                className={cn(
                                    'text-xs px-2 py-0.5 rounded-full border transition-colors',
                                    showOnlyErrors
                                        ? 'bg-red-500 text-white border-red-500'
                                        : 'border-red-300 text-red-600 hover:bg-red-50'
                                )}
                            >
                                {showOnlyErrors ? \`Đang lọc \${errorRowCount} lỗi ✕\` : \`Xem \${errorRowCount} dòng lỗi\`}
                            </button>
                        )}
                    </div>
                    <div className="relative max-w-sm w-full">
                        <SearchIcon className="absolute left-2.5 top-2 h-4 w-4 text-muted-foreground" />
                        <Input
                            type="search"
                            placeholder="Tìm kiếm dữ liệu..."
                            className="h-8 pl-8 text-xs bg-background"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
                <div className="flex-1 overflow-auto bg-background">
                    <table className="w-full text-xs text-left min-w-max">
                        <thead className="bg-muted/90 sticky top-0 z-10 shadow-sm backdrop-blur-sm">
                            <tr>
                                <th className="px-3 py-2 whitespace-nowrap border-b text-muted-foreground font-semibold">STT</th>
                                {headers.map(h => (
                                    <th key={h.key} className="border-b border-l first:border-l-0 border-border group relative p-0">
                                        <div className="flex items-center justify-between px-3 py-2 whitespace-nowrap font-semibold text-foreground overflow-hidden min-w-[100px] max-w-[300px] resize-x">
                                            {h.header}
                                        </div>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border/30">
                            {filteredRows.map((row, i) => {
                                // Find original index to look up cell errors
                                const originalIdx = data.rows.indexOf(row);
                                const rowCellErrors = cellErrors[originalIdx] || {};
                                const hasRowError = Object.keys(rowCellErrors).length > 0;
                                return (
                                    <tr key={i} className={cn("hover:bg-muted/20", hasRowError && "bg-red-50/50 dark:bg-red-950/10")}>
                                        <td className={cn("px-3 py-1.5 whitespace-nowrap font-medium", hasRowError ? 'text-red-500' : 'text-muted-foreground')}>
                                            {row.rowNumber - 1}
                                        </td>
                                        {headers.map(h => {
                                            let val = row[h.key];
                                            if (val === null || val === undefined) val = '';

                                            // Auto-format phone numbers and dates
                                            const lowerKey = h.key.toLowerCase();
                                            if (['phone', 'emergencyphone'].includes(lowerKey)) {
                                                val = formatPhonePreview(val as string);
                                            } else if (['dob', 'dateofissue', 'joinedat', 'resignedat', 'contractstartdate', 'contractenddate'].includes(lowerKey)) {
                                                val = formatDatePreview(val as string);
                                            }

                                            const cellError = rowCellErrors[h.key];
                                            // Legacy: also highlight empty employmentStatus
                                            const isMissingStatus = !cellError && h.key === 'employmentStatus' && val === '';
                                            const hasError = !!cellError;

                                            const cellContent = (
                                                <td
                                                    key={h.key}
                                                    className={cn(
                                                        "px-3 py-1.5 whitespace-nowrap max-w-[200px] truncate",
                                                        hasError && "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300 font-medium ring-1 ring-inset ring-red-400",
                                                        isMissingStatus && "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                                                    )}
                                                    title={hasError ? cellError : val?.toString()}
                                                >
                                                    {hasError ? (
                                                        <CellTooltip message={cellError}>
                                                            <span className="block truncate max-w-[180px]">{val?.toString() || <em className="opacity-50">Trống</em>}</span>
                                                        </CellTooltip>
                                                    ) : val?.toString()}
                                                </td>
                                            );
                                            return cellContent;
                                        })}
                                    </tr>
                                );
                            })}
                            {filteredRows.length === 0 && (
                                <tr>
                                    <td colSpan={headers.length + 1} className="text-center py-8 text-muted-foreground">Không tìm thấy dữ liệu phù hợp</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

`;
fs.writeFileSync(file, prefix + newPreviewStep + suffix);
console.log('Done replacing PreviewStep in import-dialog-shell.tsx');
