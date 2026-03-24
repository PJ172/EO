'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    FileDown, Upload, AlertCircle, CheckCircle2, Loader2, Info,
    History, ArrowRight, Table as TableIcon, X, FileUp, SearchIcon, Download,
} from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { ImportHistoryDialog } from '@/components/ui/import-history-dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { useSocket } from '@/components/providers/socket-provider';

export interface ImportResult {
    success: number;
    errors: string[];
    failed?: number;
}

export interface PreviewResult {
    rows: any[];
    // Array of objects describing exact errors: { rowIdx: number, rowNum: number, colKey: string, message: string }
    detailedErrors?: { rowIdx: number; rowNum: number; colKey: string; headerName?: string; message: string }[];
    errors: string[];
    /** cellErrors[rowIndex][colKey] = errorMessage */
    cellErrors?: Record<number, Record<string, string>>;
    totalRows: number;
    headers?: { key: string; header: string; width?: number }[];
}

interface ImportDialogShellProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    description?: string;
    entityLabel: string;
    maxRows?: number;
    moduleKey?: string;
    onDownloadTemplate?: () => Promise<void>;
    onPreview?: (file: File) => Promise<PreviewResult>;
    onImport: (file: File, autoCreateUser?: boolean) => Promise<ImportResult>;
    onSuccess?: () => void;
    isTemplateLoading?: boolean;
    showAutoCreateUserCheckbox?: boolean;
}

type Step = 'select' | 'preview' | 'importing' | 'result';

const STEP_LABELS: Record<'select' | 'preview' | 'result', string> = {
    select: 'Chọn file',
    preview: 'Xem trước',
    result: 'Kết quả',
};

export function ImportDialogShell({
    open, onOpenChange, title, description, entityLabel, maxRows, moduleKey,
    onDownloadTemplate, onPreview, onImport, onSuccess, isTemplateLoading,
    showAutoCreateUserCheckbox,
}: ImportDialogShellProps) {
    const [step, setStep] = useState<Step>('select');
    const [file, setFile] = useState<File | null>(null);
    const [autoCreateUser, setAutoCreateUser] = useState(false);
    const [previewData, setPreviewData] = useState<PreviewResult | null>(null);
    const [result, setResult] = useState<ImportResult | null>(null);
    const [showHistory, setShowHistory] = useState(false);
    const [progress, setProgress] = useState(0);
    const [wsProgressMsg, setWsProgressMsg] = useState('');
    const [drawerWidth, setDrawerWidth] = useState(1000);
    const { socket } = useSocket();

    useEffect(() => {
        if (!open) {
            setStep('select');
            setFile(null);
            setPreviewData(null);
            setResult(null);
            setAutoCreateUser(false);
            setProgress(0);
            setWsProgressMsg('');
        }
    }, [open]);

    // WebSocket realtime progress during import
    useEffect(() => {
        if (step !== 'importing') return;
        setProgress(5);
        setWsProgressMsg('');

        if (socket) {
            // Listen for realtime progress from backend
            const handler = (data: { processed: number; total: number; percent: number; message: string }) => {
                setProgress(data.percent);
                setWsProgressMsg(data.message);
            };
            socket.on('import:progress', handler);
            return () => { socket.off('import:progress', handler); };
        } else {
            // Fallback: slow fake progression if no WS
            const interval = setInterval(() => {
                setProgress(p => p >= 90 ? p : p + Math.random() * 5);
            }, 800);
            return () => clearInterval(interval);
        }
    }, [step, socket]);

    const handleClose = () => {
        if (step === 'importing') {
            toast.warning('Đang xử lý import, vui lòng không đóng cửa sổ.');
            return;
        }
        onOpenChange(false);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files?.[0]) return;
        setFile(e.target.files[0]);
        setStep('select');
        setPreviewData(null);
        setResult(null);
    };

    const handleNext = async () => {
        if (!file) return;
        if (onPreview) {
            setStep('importing');
            setProgress(10);
            try {
                const pData = await onPreview(file);
                // Compute detailed errors for friendly display
                const detailedErrors: { rowIdx: number; rowNum: number; colKey: string; headerName: string; message: string }[] = [];
                if (pData.cellErrors && pData.headers) {
                    const hMap = new Map(pData.headers.map(h => [h.key, h.header]));
                    Object.entries(pData.cellErrors).forEach(([rIdxStr, colMap]) => {
                        const rIdx = parseInt(rIdxStr);
                        const rowNum = pData.rows[rIdx]?.rowNumber || (rIdx + 2);
                        Object.entries(colMap).forEach(([cKey, msg]) => {
                            detailedErrors.push({ rowIdx: rIdx, rowNum, colKey: cKey, headerName: hMap.get(cKey) || cKey, message: msg });
                        });
                    });
                }
                setPreviewData({ ...pData, detailedErrors });
                setStep('preview');
            } catch (error: any) {
                const msg = error?.response?.data?.message || error?.message || 'Lỗi đọc file';
                toast.error(`Lỗi file: ${msg}`);
                setStep('select');
            }
        } else {
            executeImport();
        }
    };

    const executeImport = async () => {
        if (!file) return;
        setStep('importing');
        try {
            const res = await onImport(file, autoCreateUser);
            setProgress(100);
            setResult(res);
            setStep('result');
            if (res.errors.length === 0) {
                toast.success(`Import thành công ${res.success} ${entityLabel}!`);
                onSuccess?.();
            } else if (res.success > 0) {
                toast.warning(`Import ${res.success} ${entityLabel}, có ${res.errors.length} dòng lỗi`);
                onSuccess?.();
            } else {
                toast.error(`Import thất bại: ${res.errors.length} lỗi`);
            }
        } catch (error: any) {
            setProgress(100);
            const msg = error?.response?.data?.message || error?.message || 'Lỗi không xác định';
            toast.error(`Lỗi import: ${msg}`);
            setResult({ success: 0, errors: Array.isArray(msg) ? msg : [msg] });
            setStep('result');
        }
    };

    const fileSizeKB = file ? (file.size / 1024).toFixed(1) : null;

    // Step indicator maps: select=1, preview=2 (importing counts as preview), result=3
    const stepOrder: Step[] = ['select', 'preview', 'importing', 'result'];
    const visualStep = step === 'importing' ? 'preview' : step;
    const visualIdx = stepOrder.indexOf(visualStep);

    return (
        <>
            <Sheet open={open} onOpenChange={handleClose}>
                <SheetContent
                    side="right"
                    showCloseButton={false}
                    className="!max-w-none p-0 flex flex-col gap-0 border-l border-white/10 glass-card transition-none"
                    style={{ width: `${drawerWidth}px` }}
                >
                    {/* Resizer Handle */}
                    <div
                        className="absolute left-0 top-0 bottom-0 w-1 cursor-ew-resize hover:bg-primary/50 active:bg-primary z-50 transition-colors"
                        onMouseDown={(e) => {
                            e.preventDefault();
                            const startX = e.clientX;
                            const startWidth = drawerWidth;
                            const onMouseMove = (moveEvent: MouseEvent) => {
                                const delta = startX - moveEvent.clientX;
                                setDrawerWidth(Math.max(600, Math.min(window.innerWidth * 0.95, startWidth + delta)));
                            };
                            const onMouseUp = () => {
                                document.removeEventListener('mousemove', onMouseMove);
                                document.removeEventListener('mouseup', onMouseUp);
                            };
                            document.addEventListener('mousemove', onMouseMove);
                            document.addEventListener('mouseup', onMouseUp);
                        }}
                    />

                    {/* Premium Header */}
                    <div className="relative overflow-hidden bg-gradient-to-br from-primary/95 via-primary/80 to-primary/95 px-6 py-6 text-white flex-shrink-0 border-b border-white/10 shadow-lg">
                        {/* Decorative mesh bg */}
                        <div className="absolute inset-0 opacity-20"
                            style={{
                                backgroundImage: `radial-gradient(circle at 2px 2px, white 1px, transparent 0)`,
                                backgroundSize: '24px 24px'
                            }}
                        />

                        <div className="relative flex items-center justify-between mb-5">
                            <div className="flex items-center gap-4">
                                <div className="h-12 w-12 rounded-2xl bg-white/15 backdrop-blur-md border border-white/20 flex items-center justify-center shrink-0 shadow-inner">
                                    <FileUp className="h-6 w-6 text-white" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold tracking-tight leading-tight drop-shadow-sm">{title}</h2>
                                    {description && (
                                        <p className="text-sm text-white/80 mt-1 font-medium">{description}</p>
                                    )}
                                </div>
                            </div>
                            <button
                                onClick={handleClose}
                                disabled={step === 'importing'}
                                className="h-10 w-10 rounded-xl flex items-center justify-center bg-white/10 hover:bg-white/25 border border-white/10 transition-all shrink-0 disabled:opacity-40 disabled:cursor-not-allowed group active:scale-95"
                                title="Đóng"
                            >
                                <X className="h-5 w-5 group-hover:rotate-90 transition-transform duration-300" />
                            </button>
                        </div>

                        {/* Modern Stepper */}
                        <div className="relative flex items-center justify-between bg-black/10 backdrop-blur-sm rounded-2xl p-1.5 border border-white/5">
                            {(['select', 'preview', 'result'] as const).map((s, idx, arr) => {
                                const sIdx = stepOrder.indexOf(s);
                                const isPast = sIdx < visualIdx;
                                const isCurrent = s === visualStep;

                                return (
                                    <div key={s} className="flex items-center gap-1 flex-1 px-1">
                                        <div className={cn(
                                            'flex items-center gap-2 text-xs font-bold px-4 py-2 rounded-xl transition-all duration-300 flex-1 justify-center',
                                            isCurrent ? 'bg-white text-primary shadow-xl scale-[1.02]' :
                                                isPast ? 'text-white/90' : 'text-white/40'
                                        )}>
                                            <span className={cn(
                                                'h-5 w-5 rounded-lg text-[11px] flex items-center justify-center font-black transition-colors',
                                                isCurrent ? 'bg-primary/10 text-primary' :
                                                    isPast ? 'bg-white/20 text-white' : 'bg-white/10 text-white/50'
                                            )}>{idx + 1}</span>
                                            <span className="hidden sm:inline">{STEP_LABELS[s]}</span>
                                        </div>
                                        {idx < arr.length - 1 && (
                                            <div className="flex items-center px-1 opacity-20">
                                                <ArrowRight className="h-3 w-3 text-white" />
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Body */}
                    <div className={cn(
                        "flex-1 px-6 flex flex-col min-h-0",
                        step === 'preview' ? "overflow-hidden py-3" : "overflow-y-auto py-5"
                    )}>
                        {step === 'select' && (
                            <SelectStep
                                maxRows={maxRows}
                                file={file}
                                fileSizeKB={fileSizeKB}
                                isTemplateLoading={isTemplateLoading}
                                onDownloadTemplate={onDownloadTemplate}
                                onFileChange={handleFileChange}
                                showAutoCreateUserCheckbox={showAutoCreateUserCheckbox}
                                autoCreateUser={autoCreateUser}
                                setAutoCreateUser={setAutoCreateUser}
                            />
                        )}
                        {step === 'preview' && previewData && <PreviewStep data={previewData} />}
                        {step === 'importing' && <ImportingStep progress={progress} progressMsg={wsProgressMsg} />}
                        {step === 'result' && result && <ResultStep result={result} entityLabel={entityLabel} />}
                    </div>

                    {/* Footer */}
                        <div className="flex-shrink-0 border-t border-border/40 px-6 py-5 flex items-center justify-between gap-3 bg-muted/5 backdrop-blur-md">
                            <div className="flex items-center gap-4">
                                {step === 'select' && moduleKey && (
                                    <Button variant="ghost" size="sm" onClick={() => setShowHistory(true)} className="text-muted-foreground hover:bg-primary/5 hover:text-primary gap-1.5 font-bold rounded-xl h-10 px-4 transition-all">
                                        <History className="h-4 w-4" /> Lịch sử nhập
                                    </Button>
                                )}
                                {step === 'preview' && previewData && (
                                    <div className="text-sm border pl-3 pr-4 py-1.5 rounded-full bg-background font-medium text-muted-foreground shadow-sm">
                                        Tổng cộng: <strong className="text-foreground">{previewData.headers?.length || Array.from(new Set(previewData.rows.flatMap(r => Object.keys(r).filter(k => k !== 'rowNumber')))).length} cột</strong> dọc x <strong className="text-foreground">{previewData.totalRows} dòng</strong> dữ liệu
                                    </div>
                                )}
                            </div>
                            <div className="flex gap-2">
                                {step === 'result' ? (
                                    <Button onClick={handleClose} className="rounded-xl px-8 font-bold min-w-[120px] shadow-lg shadow-primary/10">Hoàn Thành</Button>
                                ) : step === 'preview' ? (
                                    <>
                                        <Button variant="outline" onClick={() => setStep('select')} className="rounded-xl font-bold">Quay lại</Button>
                                        <Button onClick={executeImport} className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 font-bold rounded-xl px-6 shadow-lg shadow-emerald-500/20 active:scale-95 transition-all">
                                            <CheckCircle2 className="h-4 w-4" /> Xác nhận Import
                                        </Button>
                                    </>
                                ) : (
                                    <>
                                        <Button variant="outline" onClick={handleClose} className="rounded-xl font-bold">Hủy bỏ</Button>
                                        <Button onClick={handleNext} disabled={!file} className="bg-primary hover:bg-primary/90 text-white gap-2 font-bold rounded-xl px-8 shadow-lg shadow-primary/20 active:scale-95 transition-all disabled:opacity-50">
                                            {onPreview
                                                ? <>Tiếp tục <ArrowRight className="h-4 w-4" /></>
                                                : <><Upload className="h-4 w-4" /> Bắt đầu Import</>}
                                        </Button>
                                    </>
                                )}
                            </div>
                        </div>
                </SheetContent>
            </Sheet>

            {moduleKey && (
                <ImportHistoryDialog
                    open={showHistory}
                    onOpenChange={setShowHistory}
                    moduleKey={moduleKey}
                    title={title}
                />
            )}
        </>
    );
}

/* ─────────────────────────────── */
/* Sub-components                  */
/* ─────────────────────────────── */

function SelectStep({ maxRows, file, fileSizeKB, isTemplateLoading, onDownloadTemplate, onFileChange, showAutoCreateUserCheckbox, autoCreateUser, setAutoCreateUser }: {
    maxRows?: number; file: File | null; fileSizeKB: string | null;
    isTemplateLoading?: boolean; onDownloadTemplate?: () => Promise<void>;
    onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    showAutoCreateUserCheckbox?: boolean;
    autoCreateUser?: boolean;
    setAutoCreateUser?: (val: boolean) => void;
}) {
    return (
        <div className="space-y-6 animate-slide-up-fade">
            {maxRows && (
                <div className="group relative overflow-hidden rounded-2xl border border-blue-200 bg-blue-50/40 p-4 transition-all hover:bg-blue-50/60 dark:bg-blue-900/10 dark:border-blue-800">
                    <div className="flex gap-3">
                        <div className="h-8 w-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
                            <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        </div>
                        <p className="text-xs text-blue-800 dark:text-blue-300 leading-normal">
                            <span className="font-bold">Lưu ý hệ thống:</span> Tối đa <strong>{maxRows.toLocaleString()}</strong> dòng mỗi lần import. Nếu file của bạn lớn hơn, vui lòng chia nhỏ để đảm bảo tốc độ xử lý nhanh nhất.
                        </p>
                    </div>
                </div>
            )}

            {onDownloadTemplate && (
                <div className="group relative flex items-center justify-between rounded-2xl border border-border/60 p-5 bg-card/30 backdrop-blur hover:bg-card/50 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5">
                    <div className="flex gap-4">
                        <div className="h-10 w-10 rounded-xl bg-orange-100 dark:bg-orange-950/20 flex items-center justify-center shrink-0">
                            <FileDown className="h-5 w-5 text-orange-600" />
                        </div>
                        <div>
                            <p className="text-[15px] font-bold tracking-tight">Bước 1 — Chuẩn bị dữ liệu</p>
                            <p className="text-xs text-muted-foreground mt-0.5">Sử dụng file mẫu chuẩn để tránh lỗi định dạng</p>
                        </div>
                    </div>
                    <Button
                        variant="secondary" 
                        size="sm"
                        onClick={onDownloadTemplate}
                        disabled={isTemplateLoading}
                        className="shrink-0 bg-orange-50 text-orange-600 hover:bg-orange-100 dark:bg-orange-900/10 dark:text-orange-400 font-bold border-none"
                    >
                        {isTemplateLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                        Tải File mẫu
                    </Button>
                </div>
            )}

            <div className="space-y-4">
                <Label className="text-[15px] font-bold tracking-tight px-1 flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-primary" />
                    {onDownloadTemplate ? 'Bước 2 — ' : ''}Tải lên dữ liệu
                </Label>
                <label className={cn(
                    'group relative flex flex-col items-center justify-center gap-4 rounded-3xl border-2 border-dashed px-8 py-14 cursor-pointer transition-all duration-500',
                    file
                        ? 'border-emerald-400/50 bg-emerald-50/30 dark:bg-emerald-950/20'
                        : 'border-muted-foreground/20 hover:border-primary/50 hover:bg-primary/5 dark:hover:bg-primary/10 shadow-inner'
                )}>
                    {/* Animated background on hover */}
                    {!file && <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity rounded-3xl bg-[radial-gradient(circle_at_50%_120%,rgba(var(--primary-rgb),0.1),transparent_70%)]" />}

                    <div className={cn(
                        'h-20 w-20 rounded-2xl flex items-center justify-center transition-all duration-500 shadow-sm',
                        file ? 'bg-emerald-100/80 scale-110 rotate-3' : 'bg-muted group-hover:scale-110 group-hover:-rotate-3 group-hover:bg-primary/10'
                    )}>
                        {file ? <CheckCircle2 className="h-10 w-10 text-emerald-600" /> : <FileUp className="h-10 w-10 text-muted-foreground group-hover:text-primary transition-colors" />}
                    </div>
                    
                    {file ? (
                        <div className="text-center relative z-10 animate-scale-in">
                            <p className="text-base font-bold text-emerald-800 dark:text-emerald-400">{file.name}</p>
                            <div className="flex items-center justify-center gap-2 mt-2">
                                <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 text-[10px] uppercase tracking-wider border-none">{fileSizeKB} KB</Badge>
                                <span className="text-[10px] text-emerald-600/70 font-medium">Sẵn sàng nhập dữ liệu</span>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center relative z-10">
                            <p className="text-[15px] font-bold text-foreground">Kéo thả file vào đây</p>
                            <p className="text-sm text-muted-foreground mt-1">Hoặc nhấp để duyệt file từ máy tính</p>
                            <div className="mt-4 flex items-center justify-center gap-4">
                                <div className="flex items-center gap-1.5 opacity-60">
                                    <div className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">XLSX</span>
                                </div>
                                <div className="flex items-center gap-1.5 opacity-60">
                                    <div className="h-1.5 w-1.5 rounded-full bg-green-500" />
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">XLS</span>
                                </div>
                            </div>
                        </div>
                    )}
                    <input type="file" accept=".xlsx,.xls" onChange={onFileChange} className="hidden" />
                </label>
            </div>

            {showAutoCreateUserCheckbox && (
                <div className="flex items-center space-x-2 pt-2 pb-1 border-t border-border/50">
                    <input
                        type="checkbox"
                        id="autoCreateUser"
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-600 h-4 w-4 cursor-pointer"
                        checked={autoCreateUser}
                        onChange={(e) => setAutoCreateUser?.(e.target.checked)}
                    />
                    <label
                        htmlFor="autoCreateUser"
                        className="text-sm font-medium leading-none cursor-pointer flex flex-col gap-1"
                    >
                        <span>Tự động tạo tài khoản đăng nhập cho nhân viên mới</span>
                        <span className="text-xs font-normal text-muted-foreground">Nếu bỏ chọn, nhân sự sẽ được tạo mà không có tài khoản phần mềm.</span>
                    </label>
                </div>
            )}
        </div>
    );
}

// Simple tooltip for cell errors
function CellTooltip({ message, children }: { message: string; children: React.ReactNode }) {
    const [visible, setVisible] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    return (
        <div
            ref={ref}
            className="relative inline-block w-full"
            onMouseEnter={() => setVisible(true)}
            onMouseLeave={() => setVisible(false)}
        >
            {children}
            {visible && (
                <div className="absolute z-50 bottom-full left-0 mb-1 px-2 py-1.5 rounded-md text-[11px] font-medium text-white bg-red-600 shadow-lg whitespace-normal max-w-[240px] leading-tight pointer-events-none">
                    ⚠ {message}
                    <div className="absolute top-full left-3 border-4 border-transparent border-t-red-600" />
                </div>
            )}
        </div>
    );
}

function PreviewStep({ data }: { data: PreviewResult }) {
    const cellErrors = data.cellErrors || {};
    const errorRowCount = Object.keys(cellErrors).length;
    const validCount = data.totalRows - errorRowCount;
    const [searchTerm, setSearchTerm] = useState('');
    const [showOnlyErrors, setShowOnlyErrors] = useState(false);

    // --- NEW: Professional Resizing logic ---
    // NO React State for width to avoid massive re-renders
    const resizingRef = useRef<{ key: string, startX: number, startWidth: number } | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        let animationFrameId: number;
        const handleMouseMove = (e: MouseEvent) => {
            if (!resizingRef.current) return;
            if (animationFrameId) cancelAnimationFrame(animationFrameId);

            animationFrameId = requestAnimationFrame(() => {
                if (!resizingRef.current || !containerRef.current) return;
                const { key, startX, startWidth } = resizingRef.current;
                const newW = Math.max(60, startWidth + (e.pageX - startX));
                containerRef.current.style.setProperty(`--col-w-${key}`, `${newW}px`);
            });
        };
        const handleMouseUp = () => {
            if (resizingRef.current) {
                resizingRef.current = null;
                document.body.style.cursor = 'default';
            }
        };
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
            if (animationFrameId) cancelAnimationFrame(animationFrameId);
        };
    }, []);

    const startResize = (e: React.MouseEvent, key: string) => {
        e.preventDefault();
        e.stopPropagation();
        const thElement = (e.target as HTMLElement).closest('th');
        const startWidth = thElement ? thElement.offsetWidth : 120;

        if (containerRef.current) {
            const currentVar = containerRef.current.style.getPropertyValue(`--col-w-${key}`);
            if (!currentVar) {
                containerRef.current.style.setProperty(`--col-w-${key}`, `${startWidth}px`);
            }
        }
        resizingRef.current = { key, startX: e.pageX, startWidth };
        document.body.style.cursor = 'col-resize';
    };
    // ----------------------------------------

    const headers = (data.headers || Array.from(
        new Set(data.rows.flatMap(r => Object.keys(r).filter(k => k !== 'rowNumber')))
    ).map(key => ({ key, header: key }))).map(h => ({
        ...h,
        header: h.header.replace(/\s*\(.*?\)\s*/g, '').trim(),
        safeKey: h.key.replace(/[^a-zA-Z0-9-]/g, '-')
    }));

    // Dynamic detailed error builder to make it fully clear to the user
    const detailedErrors = useMemo(() => {
        const errs: { rowIdx: number; rowNum: number; colKey: string; headerName: string; message: string }[] = [];
        const hMap = new Map(headers.map(h => [h.key, h.header]));
        Object.entries(cellErrors).forEach(([rIdxStr, colMap]) => {
            const rIdx = parseInt(rIdxStr);
            const rowNum = data.rows[rIdx]?.rowNumber || (rIdx + 2);
            Object.entries(colMap as Record<string, string>).forEach(([cKey, msg]) => {
                errs.push({
                    rowIdx: rIdx,
                    rowNum,
                    colKey: cKey,
                    headerName: hMap.get(cKey) || cKey,
                    message: msg
                });
            });
        });
        return errs;
    }, [cellErrors, headers, data.rows]);

    // Formatter helpers
    const formatPhonePreview = (val: string) => {
        if (!val) return val;
        const cleaned = val.toString().replace(/\D/g, '');
        if (cleaned.length === 10) {
            return `${cleaned.slice(0, 4)} ${cleaned.slice(4, 7)} ${cleaned.slice(7)}`;
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
            return `${day}/${month}/${year}`;
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
            return [...allKeys.map(k => `"${String(row[k] ?? '').replace(/"/g, '\\"')}"`), `"${errMsg}"`].join(',');
        });
        const csvContent = [headerRow.join(','), ...csvRows].join('\n');
        const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `bao_cao_loi_${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success(`Đã tải báo cáo ${errorIndices.length} dòng lỗi.`);
    };

    return (
        <div ref={containerRef} className="flex flex-col h-full gap-3 min-h-0">
            {/* Summary Banner */}
            {/* Summary Banner */}
            <div className={cn(
                "relative overflow-hidden rounded-2xl border p-5 shrink-0 shadow-xl transition-all duration-500 glass-card",
                errorRowCount > 0 
                    ? 'border-amber-200/50 bg-amber-50/40 dark:bg-amber-950/20 shadow-amber-500/5' 
                    : 'border-emerald-200/50 bg-emerald-50/40 dark:bg-emerald-950/20 shadow-emerald-500/5'
            )}>
                {/* Decorative background element */}
                <div className={cn(
                    "absolute -right-8 -top-8 h-24 w-24 rounded-full blur-3xl opacity-20",
                    errorRowCount > 0 ? "bg-amber-500" : "bg-emerald-500"
                )} />

                <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className={cn(
                            "h-12 w-12 rounded-2xl flex items-center justify-center shrink-0 shadow-inner backdrop-blur-md border border-white/20",
                            errorRowCount > 0 ? 'bg-amber-100 text-amber-600' : 'bg-emerald-100 text-emerald-600'
                        )}>
                            <TableIcon className="h-6 w-6" />
                        </div>
                        <div>
                            <h5 className={cn("text-lg font-black tracking-tight mb-0.5", errorRowCount > 0 ? 'text-amber-900 dark:text-amber-300' : 'text-emerald-900 dark:text-emerald-300')}>
                                Phân tích dữ liệu hoàn tất
                            </h5>
                            <div className="text-sm flex flex-wrap gap-x-3 gap-y-1 items-center leading-relaxed font-medium">
                                <span className="text-muted-foreground">Tổng cộng <strong className="text-foreground">{data.totalRows}</strong> dòng</span>
                                <div className="h-1 w-1 rounded-full bg-muted-foreground/30" />
                                <span className="text-emerald-600">Hợp lệ: <strong className="font-black">{validCount}</strong></span>
                                {errorRowCount > 0 && (
                                    <>
                                        <div className="h-1 w-1 rounded-full bg-muted-foreground/30" />
                                        <span className="text-red-500">Lỗi: <strong className="font-black">{errorRowCount}</strong></span>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                    {errorRowCount > 0 && (
                        <Button
                            size="sm"
                            variant="secondary"
                            className="h-10 px-5 text-sm font-bold border-none bg-red-100 text-red-600 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 rounded-xl shrink-0 shadow-lg shadow-red-500/10 active:scale-95 transition-all"
                            onClick={handleDownloadErrorReport}
                        >
                            <Download className="h-4 w-4 mr-2" />
                            Tải báo cáo lỗi
                        </Button>
                    )}
                </div>
            </div>

            {/* Error list */}
            {(detailedErrors.length > 0 || (data.errors && data.errors.length > 0 && !data.errors.includes('Kiểm tra lỗi tại các ô tô đỏ')) || errorRowCount > 0) ? (
                <div className="rounded-xl border border-destructive/30 bg-red-50/50 dark:bg-destructive/10 p-3.5 shrink-0 shadow-sm">
                    <Label className="text-[13px] font-bold text-red-700 dark:text-red-400 mb-2.5 flex items-center gap-1.5">
                        <AlertCircle className="h-4 w-4" />
                        Chi tiết lỗi ({detailedErrors.length || data.errors?.filter(e => e !== 'Kiểm tra lỗi tại các ô tô đỏ').length || errorRowCount} lỗi):
                    </Label>
                    <ScrollArea className="h-[90px] pr-4">
                        <ul className="list-disc pl-6 space-y-2 text-[13px] text-red-900/90 dark:text-red-200/90">
                            {detailedErrors.length > 0 ? (
                                <>
                                    {detailedErrors.slice(0, 50).map((err, i) => (
                                        <li key={i}>
                                            Lỗi tại <span className="font-semibold underline decoration-red-300 underline-offset-2">cột {err.headerName || err.colKey}</span>, <span className="font-bold">hàng {err.rowNum}</span>: {err.message}
                                        </li>
                                    ))}
                                    {detailedErrors.length > 50 && <li className="italic text-red-700/70 pt-1">... và {detailedErrors.length - 50} lỗi khác. Vui lòng tải báo cáo để xem đầy đủ.</li>}
                                </>
                            ) : data.errors && data.errors.length > 0 && !data.errors.includes('Kiểm tra lỗi tại các ô tô đỏ') ? (
                                <>
                                    {data.errors.slice(0, 50).map((err, i) => <li key={'e' + i}>{err}</li>)}
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
                    <span className="text-[13px] font-semibold text-emerald-800 dark:text-emerald-300">0 lỗi - Dữ liệu hoàn toàn hợp lệ, đã sẵn sàng Import.</span>
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
                                {showOnlyErrors ? `Đang lọc ${errorRowCount} lỗi ✕` : `Xem ${errorRowCount} dòng lỗi`}
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
                    <table className="w-full text-xs text-left border-separate border-spacing-0" style={{ minWidth: 'max-content' }}>
                        <thead className="bg-muted/90 sticky top-0 z-10 shadow-sm backdrop-blur-sm">
                            <tr>
                                <th className="px-3 py-2 whitespace-nowrap border-b text-muted-foreground font-semibold">STT</th>
                                {headers.map(h => (
                                    <th
                                        key={h.key}
                                        className="border-b border-l first:border-l-0 border-border group relative p-0 bg-muted/90"
                                        style={{ width: `var(--col-w-${h.safeKey}, auto)`, minWidth: '100px' }}
                                    >
                                        <div className="flex items-center justify-between px-3 py-2 whitespace-nowrap font-semibold text-foreground overflow-hidden select-none">
                                            {h.header}
                                        </div>
                                        <div
                                            className="absolute top-0 right-0 bottom-0 w-1.5 cursor-col-resize z-20 hover:bg-emerald-400/50 active:bg-emerald-500 group-hover:bg-emerald-400/30 transition-colors opacity-0 group-hover:opacity-100"
                                            onMouseDown={(e) => startResize(e, h.safeKey)}
                                        />
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
                                        <td className={cn("px-3 py-1.5 whitespace-nowrap font-medium border-b border-transparent", hasRowError ? 'text-red-500' : 'text-muted-foreground')}>
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
                                            const hasError = !!cellError;

                                            const cellContent = (
                                                <td
                                                    key={h.key}
                                                    className={cn(
                                                        "px-3 py-1.5 whitespace-nowrap border-b border-l border-transparent truncate border-border/30",
                                                        hasError && "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300 font-medium ring-1 ring-inset ring-red-400"
                                                    )}
                                                    title={hasError ? cellError : val?.toString()}
                                                    style={{ maxWidth: `var(--col-w-${h.safeKey}, 200px)` }}
                                                >
                                                    {hasError ? (
                                                        <CellTooltip message={cellError}>
                                                            <span className="block truncate">{val?.toString() || <em className="opacity-50">Trống</em>}</span>
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

function ImportingStep({ progress, progressMsg }: { progress: number; progressMsg?: string }) {
    return (
        <div className="flex flex-col items-center justify-center py-16 space-y-6">
            <div className="h-20 w-20 rounded-2xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
            </div>
            <div className="space-y-2 text-center w-full max-w-[85%]">
                <h3 className="font-semibold text-lg">Đang nhập dữ liệu...</h3>
                {progressMsg ? (
                    <p className="text-sm font-medium text-blue-600 dark:text-blue-400">{progressMsg}</p>
                ) : (
                    <p className="text-sm text-muted-foreground">Vui lòng không đóng cửa sổ trong lúc hệ thống đang xử lý.</p>
                )}
                <div className="pt-4 space-y-2">
                    <Progress value={progress} className="h-2" />
                    <p className="text-xs text-muted-foreground text-right">{Math.round(progress)}%</p>
                </div>
            </div>
        </div>
    );
}

function ResultStep({ result, entityLabel }: { result: ImportResult; entityLabel: string }) {
    return (
        <div className="space-y-4">
            {result.success > 0 && (
                <Alert className="border-emerald-500/30 bg-emerald-50/50 dark:bg-emerald-950/20 py-4 flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-emerald-600 mt-0" />
                    <div className="flex-1 flex flex-wrap items-center gap-1.5 text-sm">
                        <span className="text-foreground font-medium">Hệ thống đã nhập/cập nhật</span>
                        <span className="text-emerald-600 font-semibold">thành công:</span>
                        <span className="text-blue-600 font-bold text-base px-1">{result.success}</span>
                        <span className="text-foreground font-medium">{entityLabel}.</span>
                    </div>
                </Alert>
            )}
            {result.errors.length > 0 && (
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4 mt-0.5" />
                    <AlertTitle className="text-sm font-bold">Phát hiện {result.errors.length} lỗi</AlertTitle>
                    <AlertDescription className="text-xs mt-3">
                        <ScrollArea className="max-h-[400px] h-[300px] pr-4">
                            <ul className="list-disc pl-4 space-y-2">
                                {result.errors.map((err, i) => (
                                    <li key={i} className="leading-relaxed">{err}</li>
                                ))}
                            </ul>
                        </ScrollArea>
                    </AlertDescription>
                </Alert>
            )}
        </div>
    );
}
