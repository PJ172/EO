'use client';
import { useState, useCallback } from 'react';
import { toBlob } from 'html-to-image';
import { jsPDF } from 'jspdf';
import { Download, FileImage, FileText, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';

interface OrgChartExportProps {
    chartTitle?: string;
}

// ─── Utilities ───────────────────────────────────────────

/** Parse viewport CSS transform: translate(Xpx, Ypx) scale(Z) */
function parseViewportTransform(el: HTMLElement) {
    const t = el.style.transform || window.getComputedStyle(el).transform;
    // matrix(a, b, c, d, e, f) where e=tx, f=ty, a=scale
    const matrix = t.match(/matrix\(([^)]+)\)/);
    if (matrix) {
        const vals = matrix[1].split(',').map(Number);
        return { tx: vals[4], ty: vals[5], scale: vals[0] };
    }
    // translate(Xpx, Ypx) scale(Z)
    const translate = t.match(/translate\(([^,]+),\s*([^)]+)\)/);
    const scale = t.match(/scale\(([^)]+)\)/);
    return {
        tx: translate ? parseFloat(translate[1]) : 0,
        ty: translate ? parseFloat(translate[2]) : 0,
        scale: scale ? parseFloat(scale[1]) : 1,
    };
}

/** Filter function to exclude UI-only elements from export */
function exportFilter(node: Node): boolean {
    if (!(node instanceof HTMLElement)) return true;

    const cl = node.className || '';
    if (typeof cl !== 'string') return true;

    // Exclude ReactFlow chrome
    if (cl.includes('react-flow__controls')) return false;
    if (cl.includes('react-flow__minimap')) return false;
    if (cl.includes('react-flow__panel')) return false;
    if (cl.includes('react-flow__background')) return false;

    // Exclude connection handles
    if (cl.includes('react-flow__handle')) return false;

    // Exclude design-mode action buttons (delete/hide circles)
    if (node.tagName === 'BUTTON' && cl.includes('absolute') && cl.includes('rounded-full')) {
        if (cl.includes('bg-rose-') || cl.includes('bg-slate-')) return false;
    }

    // Exclude edge labels like "AUTO" badge
    if (cl.includes('react-flow__edge-text')) return false;

    return true;
}

/** Convert all images inside an element to inline data URLs (fix CORS) */
async function inlineImages(container: HTMLElement): Promise<Map<HTMLImageElement, string>> {
    const originals = new Map<HTMLImageElement, string>();
    const images = container.querySelectorAll('img');

    await Promise.all(
        Array.from(images).map(async (img) => {
            if (!img.src || img.src.startsWith('data:')) return;
            originals.set(img, img.src);
            try {
                const res = await fetch(img.src, { mode: 'cors', cache: 'no-cache' });
                const blob = await res.blob();
                const dataUrl = await new Promise<string>((resolve) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result as string);
                    reader.readAsDataURL(blob);
                });
                img.src = dataUrl;
            } catch {
                // If CORS fails, replace with a transparent pixel
                img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
            }
        })
    );
    return originals;
}

/** Restore original image sources */
function restoreImages(originals: Map<HTMLImageElement, string>) {
    originals.forEach((src, img) => { img.src = src; });
}

// ─── Main Component ──────────────────────────────────────

export default function OrgChartExport({ chartTitle = 'Sơ đồ tổ chức' }: OrgChartExportProps) {
    const [isExporting, setIsExporting] = useState(false);

    const displayTitle = chartTitle.replace(/_/g, ' ');

    /** Core capture: returns blob of the chart area */
    const captureChart = useCallback(async (): Promise<Blob | null> => {
        const viewport = document.querySelector('.react-flow__viewport') as HTMLElement | null;
        if (!viewport) {
            toast.error('Không tìm thấy sơ đồ để xuất');
            return null;
        }

        const nodeElements = viewport.querySelectorAll('.react-flow__node');
        if (nodeElements.length === 0) {
            toast.error('Sơ đồ trống, không có node để xuất');
            return null;
        }

        // 1. Parse current viewport transform
        const { tx, ty, scale } = parseViewportTransform(viewport);

        // 2. Calculate bounding box in FLOW coordinates (not screen coordinates)
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        nodeElements.forEach(el => {
            const htmlEl = el as HTMLElement;
            const rect = htmlEl.getBoundingClientRect();
            const viewportRect = viewport.getBoundingClientRect();
            // Convert screen position to flow position
            const flowX = (rect.left - viewportRect.left - tx) / scale;
            const flowY = (rect.top - viewportRect.top - ty) / scale;
            const flowW = rect.width / scale;
            const flowH = rect.height / scale;
            minX = Math.min(minX, flowX);
            minY = Math.min(minY, flowY);
            maxX = Math.max(maxX, flowX + flowW);
            maxY = Math.max(maxY, flowY + flowH);
        });

        // 3. Add padding
        const padding = 80;
        const contentW = maxX - minX + padding * 2;
        const contentH = maxY - minY + padding * 2;
        const exportW = Math.ceil(contentW);
        const exportH = Math.ceil(contentH);

        // 4. Save original transform
        const originalTransform = viewport.style.transform;

        // 5. Temporarily set viewport to scale=1 and translate to show all content
        const exportTx = -minX + padding;
        const exportTy = -minY + padding;
        viewport.style.transform = `translate(${exportTx}px, ${exportTy}px) scale(1)`;

        // 6. Wait for browser to repaint
        await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));

        // 7. Inline all images to avoid CORS
        const originalSrcs = await inlineImages(viewport);

        // 8. Capture
        let blob: Blob | null = null;
        try {
            blob = await toBlob(viewport, {
                backgroundColor: '#f8fafc',
                width: exportW,
                height: exportH,
                pixelRatio: 2,
                cacheBust: true,
                filter: exportFilter,
                fontEmbedCSS: '', // Skip font re-fetching — browser already has them loaded
            });
        } catch (err) {
            console.error('[Export] toBlob failed:', err);
            // Fallback: try without font embedding
            try {
                blob = await toBlob(viewport, {
                    backgroundColor: '#f8fafc',
                    width: exportW,
                    height: exportH,
                    pixelRatio: 1,
                    cacheBust: true,
                    skipFonts: true,
                    filter: exportFilter,
                });
            } catch (retryErr) {
                console.error('[Export] Retry also failed:', retryErr);
            }
        } finally {
            // 9. RESTORE original transform and image sources
            viewport.style.transform = originalTransform;
            restoreImages(originalSrcs);
        }

        if (!blob) {
            toast.error('Không thể xuất sơ đồ. Kiểm tra console để biết chi tiết.');
        }
        return blob;
    }, []);

    // ─── Export PNG ───────────────────────────────────────

    const exportPNG = useCallback(async () => {
        setIsExporting(true);
        const toastId = toast.loading('Đang xuất PNG...');
        try {
            const blob = await captureChart();
            if (!blob) { toast.dismiss(toastId); return; }

            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            const filename = `${displayTitle.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.png`;
            link.download = filename;
            link.href = url;
            link.click();
            URL.revokeObjectURL(url);

            toast.success(`Đã xuất ${filename}`, { id: toastId });
        } catch (err) {
            console.error('[Export PNG]', err);
            toast.error('Lỗi khi xuất PNG', { id: toastId });
        } finally {
            setIsExporting(false);
        }
    }, [captureChart, displayTitle]);

    // ─── Export PDF ───────────────────────────────────────

    const exportPDF = useCallback(async (orientation: 'landscape' | 'portrait' = 'landscape') => {
        setIsExporting(true);
        const toastId = toast.loading('Đang xuất PDF...');
        try {
            const blob = await captureChart();
            if (!blob) { toast.dismiss(toastId); return; }

            // Convert blob to data URL
            const dataUrl = await new Promise<string>((resolve) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result as string);
                reader.readAsDataURL(blob);
            });

            // Load as image to get dimensions
            const img = new Image();
            await new Promise<void>((resolve) => {
                img.onload = () => resolve();
                img.src = dataUrl;
            });

            const imgW = img.naturalWidth;
            const imgH = img.naturalHeight;

            // Auto-select page size
            const isLargeChart = imgW > 3000 || imgH > 2000;
            const pageFormat = isLargeChart ? 'a3' : 'a4';

            const pdf = new jsPDF({ orientation, unit: 'mm', format: pageFormat });
            const pageW = pdf.internal.pageSize.getWidth();
            const pageH = pdf.internal.pageSize.getHeight();

            // ── Title header (rendered as canvas to support Vietnamese) ──
            const titleCanvas = document.createElement('canvas');
            const titleCtx = titleCanvas.getContext('2d')!;
            const titleFontSize = 28;
            const subtitleFontSize = 16;
            const titlePadding = 20;
            titleCanvas.width = pageW * 4; // 4x for crisp text
            titleCanvas.height = (titleFontSize + subtitleFontSize + titlePadding) * 4;

            titleCtx.scale(4, 4);
            // Title text
            titleCtx.font = `bold ${titleFontSize}px "Inter", "Segoe UI", sans-serif`;
            titleCtx.fillStyle = '#1e293b';
            titleCtx.fillText(displayTitle, 10, titleFontSize);
            // Subtitle
            const dateStr = new Date().toLocaleDateString('vi-VN', {
                year: 'numeric', month: 'long', day: 'numeric',
                hour: '2-digit', minute: '2-digit'
            });
            titleCtx.font = `${subtitleFontSize}px "Inter", "Segoe UI", sans-serif`;
            titleCtx.fillStyle = '#94a3b8';
            titleCtx.fillText(`Xuất lúc: ${dateStr}`, 10, titleFontSize + subtitleFontSize + 4);

            const titleDataUrl = titleCanvas.toDataURL('image/png');
            const titleH_mm = 18;
            pdf.addImage(titleDataUrl, 'PNG', 8, 5, pageW - 16, titleH_mm);

            // ── Chart image ──
            const margin = 8;
            const contentTop = titleH_mm + 8;
            const availW = pageW - margin * 2;
            const availH = pageH - contentTop - margin - 10; // 10 for footer

            const scaleF = Math.min(availW / imgW, availH / imgH);
            const renderW = imgW * scaleF;
            const renderH = imgH * scaleF;
            const x = (pageW - renderW) / 2;

            pdf.addImage(dataUrl, 'PNG', x, contentTop, renderW, renderH);

            // ── Footer (also as image for Vietnamese support) ──
            const footerCanvas = document.createElement('canvas');
            const footerCtx = footerCanvas.getContext('2d')!;
            footerCanvas.width = pageW * 4;
            footerCanvas.height = 40;
            footerCtx.scale(4, 4);
            footerCtx.font = `10px "Inter", "Segoe UI", sans-serif`;
            footerCtx.fillStyle = '#cbd5e1';
            footerCtx.fillText('Sunplast eOffice — Hệ thống quản lý nhân sự', 8, 8);
            const pageText = 'Trang 1/1';
            const textMetrics = footerCtx.measureText(pageText);
            footerCtx.fillText(pageText, pageW - 8 - textMetrics.width, 8);

            const footerDataUrl = footerCanvas.toDataURL('image/png');
            pdf.addImage(footerDataUrl, 'PNG', 0, pageH - 6, pageW, 4);

            const filename = `${displayTitle.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`;
            pdf.save(filename);

            toast.success(`Đã xuất ${filename}`, { id: toastId });
        } catch (err) {
            console.error('[Export PDF]', err);
            toast.error('Lỗi khi xuất PDF', { id: toastId });
        } finally {
            setIsExporting(false);
        }
    }, [captureChart, displayTitle]);

    // ─── Render ──────────────────────────────────────────

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="outline"
                    size="sm"
                    className="h-8 gap-2 rounded-md text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-all px-3"
                    disabled={isExporting}
                >
                    {isExporting ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                        <Download className="w-3.5 h-3.5" />
                    )}
                    <span className="text-xs">Xuất sơ đồ</span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="text-xs text-slate-500 font-normal">
                    Chọn định dạng xuất
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                    onClick={exportPNG}
                    className="gap-3 cursor-pointer"
                    disabled={isExporting}
                >
                    <FileImage className="w-4 h-4 text-emerald-600" />
                    <div>
                        <div className="text-sm font-medium">Xuất PNG</div>
                        <div className="text-[11px] text-slate-400">Hình ảnh chất lượng cao (2x)</div>
                    </div>
                </DropdownMenuItem>
                <DropdownMenuItem
                    onClick={() => exportPDF('landscape')}
                    className="gap-3 cursor-pointer"
                    disabled={isExporting}
                >
                    <FileText className="w-4 h-4 text-blue-600" />
                    <div>
                        <div className="text-sm font-medium">Xuất PDF (ngang)</div>
                        <div className="text-[11px] text-slate-400">A3/A4 landscape — phù hợp sơ đồ rộng</div>
                    </div>
                </DropdownMenuItem>
                <DropdownMenuItem
                    onClick={() => exportPDF('portrait')}
                    className="gap-3 cursor-pointer"
                    disabled={isExporting}
                >
                    <FileText className="w-4 h-4 text-cyan-600" />
                    <div>
                        <div className="text-sm font-medium">Xuất PDF (dọc)</div>
                        <div className="text-[11px] text-slate-400">A3/A4 portrait — phù hợp sơ đồ dọc</div>
                    </div>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
