'use client';

import { useState, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
    Ticket, Search, Plus, Filter, LayoutGrid, List, Clock, AlertTriangle,
    CheckCircle2, XCircle, ArrowRight, MessageSquare, Star, User, RefreshCw,
    Timer, TrendingUp, Zap, ChevronRight, Send, Lock, BarChart3, Loader2,
} from 'lucide-react';
import {
    useTickets, useTicket, useTicketStatistics, useTicketCategories,
    useCreateTicket, useAssignTicket, useStartProgress, useResolveTicket,
    useCloseTicket, useReopenTicket, useAddComment, useDeleteTicket,
    type Ticket as TicketType, type TicketParams
} from '@/services/ticket.service';
import { useEmployees } from '@/services/employee.service';
import { formatDistanceToNow, format, differenceInHours, isPast } from 'date-fns';
import { vi } from 'date-fns/locale';
import { toast } from 'sonner';

// === Constants ===
const STATUS_CONFIG: Record<string, { label: string; color: string; bgColor: string; icon: any }> = {
    DRAFT:        { label: 'Nháp',        color: 'text-slate-600',  bgColor: 'bg-slate-100 border-slate-200',      icon: Clock },
    DEPT_PENDING: { label: 'Chờ duyệt',   color: 'text-amber-600',  bgColor: 'bg-amber-50 border-amber-200',       icon: Clock },
    IT_PENDING:   { label: 'Chờ IT xử lý', color: 'text-blue-600',   bgColor: 'bg-blue-50 border-blue-200',         icon: Clock },
    IN_PROGRESS:  { label: 'Đang xử lý',  color: 'text-indigo-600', bgColor: 'bg-indigo-50 border-indigo-200',     icon: Zap },
    RESOLVED:     { label: 'Đã giải quyết', color: 'text-emerald-600', bgColor: 'bg-emerald-50 border-emerald-200', icon: CheckCircle2 },
    CLOSED:       { label: 'Đã đóng',     color: 'text-slate-500',  bgColor: 'bg-slate-50 border-slate-200',       icon: CheckCircle2 },
    REJECTED:     { label: 'Từ chối',     color: 'text-red-600',    bgColor: 'bg-red-50 border-red-200',           icon: XCircle },
};

const PRIORITY_CONFIG: Record<string, { label: string; color: string; dotColor: string }> = {
    URGENT: { label: 'Khẩn cấp', color: 'text-red-700 bg-red-50 border-red-200',      dotColor: 'bg-red-500' },
    HIGH:   { label: 'Cao',      color: 'text-orange-700 bg-orange-50 border-orange-200', dotColor: 'bg-orange-500' },
    MEDIUM: { label: 'Trung bình', color: 'text-blue-700 bg-blue-50 border-blue-200',    dotColor: 'bg-blue-500' },
    LOW:    { label: 'Thấp',     color: 'text-slate-600 bg-slate-50 border-slate-200',   dotColor: 'bg-slate-400' },
};

const KANBAN_COLUMNS = ['IT_PENDING', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'] as const;

// === Sub Components ===
function StatCard({ icon: Icon, label, value, trend, color }: { icon: any; label: string; value: string | number; trend?: string; color: string }) {
    return (
        <Card className="relative overflow-hidden border-0 shadow-sm hover:shadow-md transition-all">
            <CardContent className="p-4">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</p>
                        <p className="text-2xl font-bold mt-1">{value}</p>
                        {trend && <p className="text-xs text-muted-foreground mt-0.5">{trend}</p>}
                    </div>
                    <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${color}`}>
                        <Icon className="h-5 w-5 text-white" />
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

function PriorityBadge({ priority }: { priority: string }) {
    const cfg = PRIORITY_CONFIG[priority] || PRIORITY_CONFIG.MEDIUM;
    return (
        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${cfg.color}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${cfg.dotColor}`} />
            {cfg.label}
        </span>
    );
}

function StatusBadge({ status }: { status: string }) {
    const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.DRAFT;
    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${cfg.bgColor} ${cfg.color}`}>
            <cfg.icon className="h-3 w-3" />
            {cfg.label}
        </span>
    );
}

function SlaIndicator({ deadline }: { deadline?: string | null }) {
    if (!deadline) return null;
    const deadlineDate = new Date(deadline);
    const overdue = isPast(deadlineDate);
    const hoursLeft = differenceInHours(deadlineDate, new Date());
    const nearBreach = hoursLeft >= 0 && hoursLeft <= 4;

    return (
        <span className={`inline-flex items-center gap-1 text-[11px] font-medium ${overdue ? 'text-red-600' : nearBreach ? 'text-amber-600' : 'text-emerald-600'}`}>
            <Timer className="h-3 w-3" />
            {overdue ? `Quá hạn ${Math.abs(hoursLeft)}h` : `Còn ${hoursLeft}h`}
        </span>
    );
}

// === Kanban Card ===
function KanbanCard({ ticket, onClick }: { ticket: TicketType; onClick: () => void }) {
    return (
        <div
            onClick={onClick}
            className="p-3 rounded-lg border bg-card hover:shadow-md hover:border-blue-200 transition-all cursor-pointer group"
        >
            <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-medium line-clamp-2 group-hover:text-blue-600 transition-colors">{ticket.title}</p>
                <PriorityBadge priority={ticket.priority} />
            </div>
            <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                <span className="font-mono">{ticket.code}</span>
                <span>•</span>
                <span>{ticket.category?.name}</span>
            </div>
            <div className="mt-2 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                    <Avatar className="h-5 w-5">
                        <AvatarFallback className="text-[9px] bg-blue-100 text-blue-700">
                            {ticket.requester?.fullName?.charAt(0)}
                        </AvatarFallback>
                    </Avatar>
                    <span className="text-[11px] text-muted-foreground truncate max-w-[100px]">
                        {ticket.requester?.fullName}
                    </span>
                </div>
                <SlaIndicator deadline={ticket.slaDeadline} />
            </div>
            {ticket._count?.comments ? (
                <div className="mt-1.5 flex items-center gap-1 text-[11px] text-muted-foreground">
                    <MessageSquare className="h-3 w-3" /> {ticket._count.comments}
                </div>
            ) : null}
        </div>
    );
}

// === Ticket Detail Drawer ===
function TicketDetailDrawer({ ticketId, open, onOpenChange }: { ticketId: string | null; open: boolean; onOpenChange: (o: boolean) => void }) {
    const { data: ticket, isLoading } = useTicket(ticketId || '');
    const { data: employees } = useEmployees({ limit: 500 });
    const [comment, setComment] = useState('');
    const [resolution, setResolution] = useState('');
    const [assigneeId, setAssigneeId] = useState('');

    const assignTicket = useAssignTicket();
    const startProgress = useStartProgress();
    const resolveTicket = useResolveTicket();
    const closeTicket = useCloseTicket();
    const reopenTicket = useReopenTicket();
    const addComment = useAddComment();

    const handleAction = useCallback(async (action: string) => {
        if (!ticket) return;
        try {
            switch (action) {
                case 'assign':
                    if (!assigneeId) { toast.error('Chọn người xử lý'); return; }
                    await assignTicket.mutateAsync({ id: ticket.id, assigneeId });
                    toast.success('Đã gán ticket');
                    break;
                case 'start':
                    await startProgress.mutateAsync(ticket.id);
                    toast.success('Đã bắt đầu xử lý');
                    break;
                case 'resolve':
                    if (!resolution) { toast.error('Nhập giải pháp'); return; }
                    await resolveTicket.mutateAsync({ id: ticket.id, resolution });
                    toast.success('Đã giải quyết'); setResolution('');
                    break;
                case 'close':
                    await closeTicket.mutateAsync(ticket.id);
                    toast.success('Đã đóng ticket');
                    break;
                case 'reopen':
                    await reopenTicket.mutateAsync(ticket.id);
                    toast.success('Đã mở lại');
                    break;
            }
        } catch (e: any) { toast.error(e?.response?.data?.message || 'Lỗi'); }
    }, [ticket, assigneeId, resolution, assignTicket, startProgress, resolveTicket, closeTicket, reopenTicket]);

    const handleComment = useCallback(async () => {
        if (!ticket || !comment.trim()) return;
        try {
            await addComment.mutateAsync({ id: ticket.id, content: comment });
            setComment('');
            toast.success('Đã thêm bình luận');
        } catch { toast.error('Lỗi'); }
    }, [ticket, comment, addComment]);

    const itStaff = useMemo(() =>
        employees?.data?.filter((e: any) => e.department?.name?.toLowerCase().includes('cntt') || e.department?.name?.toLowerCase().includes('it')) || [],
    [employees]);

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="w-full sm:max-w-2xl p-0 flex flex-col" side="right">
                {isLoading || !ticket ? (
                    <div className="flex-1 flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
                ) : (
                    <>
                        <SheetHeader className="p-6 pb-4 border-b bg-gradient-to-r from-slate-50 to-blue-50/50">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="font-mono text-xs text-muted-foreground">{ticket.code}</span>
                                <StatusBadge status={ticket.status} />
                                <PriorityBadge priority={ticket.priority} />
                            </div>
                            <SheetTitle className="text-lg leading-tight">{ticket.title}</SheetTitle>
                        </SheetHeader>

                        <ScrollArea className="flex-1">
                            <div className="p-6 space-y-6">
                                {/* Info grid */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <Label className="text-xs text-muted-foreground">Người yêu cầu</Label>
                                        <div className="flex items-center gap-2 mt-1">
                                            <Avatar className="h-6 w-6"><AvatarFallback className="text-[10px] bg-blue-100 text-blue-700">{ticket.requester?.fullName?.charAt(0)}</AvatarFallback></Avatar>
                                            <div>
                                                <p className="text-sm font-medium">{ticket.requester?.fullName}</p>
                                                <p className="text-[11px] text-muted-foreground">{ticket.requester?.department?.name}</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div>
                                        <Label className="text-xs text-muted-foreground">Người xử lý</Label>
                                        <div className="flex items-center gap-2 mt-1">
                                            {ticket.assignee ? (
                                                <>
                                                    <Avatar className="h-6 w-6"><AvatarFallback className="text-[10px] bg-emerald-100 text-emerald-700">{ticket.assignee.fullName?.charAt(0)}</AvatarFallback></Avatar>
                                                    <p className="text-sm font-medium">{ticket.assignee.fullName}</p>
                                                </>
                                            ) : <p className="text-sm text-muted-foreground italic">Chưa gán</p>}
                                        </div>
                                    </div>
                                    <div>
                                        <Label className="text-xs text-muted-foreground">Danh mục</Label>
                                        <p className="text-sm font-medium mt-1">{ticket.category?.name}</p>
                                    </div>
                                    <div>
                                        <Label className="text-xs text-muted-foreground">SLA</Label>
                                        <div className="mt-1"><SlaIndicator deadline={ticket.slaDeadline} /></div>
                                    </div>
                                    <div>
                                        <Label className="text-xs text-muted-foreground">Ngày tạo</Label>
                                        <p className="text-sm mt-1">{format(new Date(ticket.createdAt), 'dd/MM/yyyy HH:mm')}</p>
                                    </div>
                                    <div>
                                        <Label className="text-xs text-muted-foreground">Cập nhật</Label>
                                        <p className="text-sm mt-1">{formatDistanceToNow(new Date(ticket.updatedAt), { addSuffix: true, locale: vi })}</p>
                                    </div>
                                </div>

                                <Separator />

                                {/* Description */}
                                <div>
                                    <Label className="text-xs text-muted-foreground">Mô tả</Label>
                                    <div className="mt-2 p-3 rounded-lg bg-muted/50 text-sm whitespace-pre-wrap">{ticket.description}</div>
                                </div>

                                {/* Resolution */}
                                {ticket.resolution && (
                                    <div>
                                        <Label className="text-xs text-muted-foreground">Giải pháp</Label>
                                        <div className="mt-2 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-sm whitespace-pre-wrap">{ticket.resolution}</div>
                                    </div>
                                )}

                                {/* Rating */}
                                {ticket.rating && (
                                    <div className="flex items-center gap-1">
                                        <Label className="text-xs text-muted-foreground mr-2">Đánh giá:</Label>
                                        {[1, 2, 3, 4, 5].map(s => (
                                            <Star key={s} className={`h-4 w-4 ${s <= ticket.rating! ? 'text-amber-400 fill-amber-400' : 'text-slate-200'}`} />
                                        ))}
                                    </div>
                                )}

                                <Separator />

                                {/* Actions */}
                                <div className="space-y-3">
                                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Thao tác</Label>

                                    {['IT_PENDING', 'DEPT_PENDING'].includes(ticket.status) && (
                                        <div className="flex items-end gap-2">
                                            <div className="flex-1">
                                                <Label className="text-xs">Gán cho IT Staff</Label>
                                                <Select value={assigneeId} onValueChange={setAssigneeId}>
                                                    <SelectTrigger className="h-9 mt-1"><SelectValue placeholder="Chọn IT Staff" /></SelectTrigger>
                                                    <SelectContent>
                                                        {(itStaff.length > 0 ? itStaff : employees?.data || []).map((e: any) => (
                                                            <SelectItem key={e.id} value={e.id}>{e.fullName} ({e.employeeCode})</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <Button size="sm" onClick={() => handleAction('assign')} disabled={assignTicket.isPending}>
                                                <ArrowRight className="h-4 w-4 mr-1" /> Gán
                                            </Button>
                                        </div>
                                    )}

                                    <div className="flex flex-wrap gap-2">
                                        {ticket.status === 'IT_PENDING' && (
                                            <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700" onClick={() => handleAction('start')} disabled={startProgress.isPending}>
                                                <Zap className="h-3.5 w-3.5 mr-1" /> Bắt đầu xử lý
                                            </Button>
                                        )}
                                        {ticket.status === 'IN_PROGRESS' && (
                                            <div className="w-full space-y-2">
                                                <Textarea placeholder="Mô tả giải pháp..." value={resolution} onChange={e => setResolution(e.target.value)} rows={2} />
                                                <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => handleAction('resolve')} disabled={resolveTicket.isPending}>
                                                    <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Đánh dấu đã giải quyết
                                                </Button>
                                            </div>
                                        )}
                                        {ticket.status === 'RESOLVED' && (
                                            <Button size="sm" variant="outline" onClick={() => handleAction('close')}>
                                                <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Đóng ticket
                                            </Button>
                                        )}
                                        {['RESOLVED', 'CLOSED'].includes(ticket.status) && (
                                            <Button size="sm" variant="outline" onClick={() => handleAction('reopen')}>
                                                <RefreshCw className="h-3.5 w-3.5 mr-1" /> Mở lại
                                            </Button>
                                        )}
                                    </div>
                                </div>

                                <Separator />

                                {/* Comments */}
                                <div className="space-y-3">
                                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                        Bình luận ({ticket.comments?.length || 0})
                                    </Label>
                                    {ticket.comments?.map(c => (
                                        <div key={c.id} className={`p-3 rounded-lg text-sm ${c.isInternal ? 'bg-amber-50 border border-amber-200' : 'bg-muted/50'}`}>
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="font-medium text-xs">{c.author?.fullName}</span>
                                                {c.isInternal && <Lock className="h-3 w-3 text-amber-600" />}
                                                <span className="text-[10px] text-muted-foreground">{formatDistanceToNow(new Date(c.createdAt), { addSuffix: true, locale: vi })}</span>
                                            </div>
                                            <p className="whitespace-pre-wrap">{c.content}</p>
                                        </div>
                                    ))}
                                    <div className="flex gap-2">
                                        <Input placeholder="Thêm bình luận..." value={comment} onChange={e => setComment(e.target.value)} onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleComment()} className="flex-1" />
                                        <Button size="icon" onClick={handleComment} disabled={addComment.isPending || !comment.trim()}>
                                            <Send className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </ScrollArea>
                    </>
                )}
            </SheetContent>
        </Sheet>
    );
}

// === Create Ticket Dialog (inline form) ===
function CreateTicketDrawer({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
    const { data: categories } = useTicketCategories();
    const createTicket = useCreateTicket();
    const [form, setForm] = useState({ title: '', description: '', categoryId: '', priority: 'MEDIUM' });

    const handleSubmit = async () => {
        if (!form.title || !form.description || !form.categoryId) { toast.error('Vui lòng điền đầy đủ'); return; }
        try {
            await createTicket.mutateAsync(form);
            toast.success('Tạo ticket thành công');
            setForm({ title: '', description: '', categoryId: '', priority: 'MEDIUM' });
            onOpenChange(false);
        } catch (e: any) { toast.error(e?.response?.data?.message || 'Lỗi'); }
    };

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="w-full sm:max-w-lg" side="right">
                <SheetHeader><SheetTitle>Tạo Ticket mới</SheetTitle></SheetHeader>
                <div className="space-y-4 mt-6">
                    <div>
                        <Label>Tiêu đề <span className="text-red-500">*</span></Label>
                        <Input className="mt-1" placeholder="VD: Máy tính không kết nối mạng" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
                    </div>
                    <div>
                        <Label>Danh mục <span className="text-red-500">*</span></Label>
                        <Select value={form.categoryId} onValueChange={v => setForm(f => ({ ...f, categoryId: v }))}>
                            <SelectTrigger className="mt-1"><SelectValue placeholder="Chọn danh mục" /></SelectTrigger>
                            <SelectContent>
                                {categories?.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    <div>
                        <Label>Mức ưu tiên</Label>
                        <Select value={form.priority} onValueChange={v => setForm(f => ({ ...f, priority: v }))}>
                            <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="LOW">Thấp</SelectItem>
                                <SelectItem value="MEDIUM">Trung bình</SelectItem>
                                <SelectItem value="HIGH">Cao</SelectItem>
                                <SelectItem value="URGENT">Khẩn cấp</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div>
                        <Label>Mô tả chi tiết <span className="text-red-500">*</span></Label>
                        <Textarea className="mt-1" rows={4} placeholder="Mô tả vấn đề..." value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
                    </div>
                    <div className="flex gap-2 pt-4">
                        <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>Hủy</Button>
                        <Button className="flex-1 bg-gradient-to-r from-blue-600 to-cyan-600" onClick={handleSubmit} disabled={createTicket.isPending}>
                            {createTicket.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                            Tạo Ticket
                        </Button>
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    );
}

// === Main Page ===
export default function HelpdeskPage() {
    const [view, setView] = useState<'kanban' | 'list'>('kanban');
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [priorityFilter, setPriorityFilter] = useState<string>('all');
    const [page, setPage] = useState(1);
    const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
    const [detailOpen, setDetailOpen] = useState(false);
    const [createOpen, setCreateOpen] = useState(false);

    const params: TicketParams = {
        search: search || undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        priority: priorityFilter !== 'all' ? priorityFilter : undefined,
        page,
        limit: 100,
    };

    const { data: ticketsData, isLoading, refetch } = useTickets(params);
    const { data: stats } = useTicketStatistics();
    const tickets = ticketsData?.data || [];

    const openTickets = useMemo(() => stats?.byStatus?.reduce((sum, s) =>
        ['DRAFT', 'DEPT_PENDING', 'IT_PENDING', 'IN_PROGRESS'].includes(s.status) ? sum + s.count : sum, 0) || 0, [stats]);
    const slaBreached = useMemo(() =>
        tickets.filter(t => t.slaDeadline && isPast(new Date(t.slaDeadline)) && !['RESOLVED', 'CLOSED'].includes(t.status)).length, [tickets]);

    const kanbanData = useMemo(() => {
        const cols: Record<string, TicketType[]> = {};
        KANBAN_COLUMNS.forEach(s => cols[s] = []);
        tickets.forEach(t => { if (cols[t.status]) cols[t.status].push(t); });
        return cols;
    }, [tickets]);

    const openDetail = useCallback((id: string) => { setSelectedTicketId(id); setDetailOpen(true); }, []);

    return (
        <div className="flex flex-col h-[calc(100vh-0rem)] space-y-4 p-2 bg-background">
            {/* Header */}
            <div className="bg-card/60 backdrop-blur-xl border border-border/50 shadow-sm rounded-xl p-3 animate-in fade-in slide-in-from-top-4 duration-500">
                <div className="flex items-center justify-between flex-wrap gap-3">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl flex items-center justify-center shadow-sm bg-gradient-to-br from-orange-500 to-red-600">
                            <Ticket className="h-5 w-5 text-white" />
                        </div>
                        <div>
                            <h1 className="text-lg font-bold bg-gradient-to-r from-orange-500 to-red-600 bg-clip-text text-transparent">IT HELPDESK</h1>
                            <p className="text-xs text-muted-foreground">Quản lý yêu cầu hỗ trợ CNTT</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => refetch()}>
                            <RefreshCw className="h-3.5 w-3.5 mr-1" /> Làm mới
                        </Button>
                        <Button size="sm" className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-sm" onClick={() => setCreateOpen(true)}>
                            <Plus className="h-4 w-4 mr-1" /> Ticket mới
                        </Button>
                    </div>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 animate-in fade-in slide-in-from-top-4 duration-500 delay-100">
                <StatCard icon={Ticket} label="Tổng ticket" value={stats?.total || 0} color="bg-gradient-to-br from-blue-500 to-blue-600" />
                <StatCard icon={AlertTriangle} label="Đang mở" value={openTickets} trend={slaBreached > 0 ? `${slaBreached} quá SLA` : undefined} color="bg-gradient-to-br from-amber-500 to-orange-600" />
                <StatCard icon={TrendingUp} label="Đã xử lý" value={stats?.totalResolved || 0} trend={`TB ${stats?.avgResolutionHours || 0}h`} color="bg-gradient-to-br from-emerald-500 to-teal-600" />
                <StatCard icon={BarChart3} label="SLA đạt" value={`${stats?.slaCompliancePercent || 100}%`} color="bg-gradient-to-br from-indigo-500 to-blue-600" />
            </div>

            {/* Toolbar */}
            <div className="flex items-center gap-3 flex-wrap animate-in fade-in duration-300 delay-200">
                <div className="relative flex-1 min-w-[200px] max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Tìm ticket..." className="pl-9 h-9" value={search} onChange={e => setSearch(e.target.value)} />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[160px] h-9"><Filter className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" /><SelectValue /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Tất cả trạng thái</SelectItem>
                        {Object.entries(STATUS_CONFIG).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                    </SelectContent>
                </Select>
                <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                    <SelectTrigger className="w-[150px] h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Tất cả ưu tiên</SelectItem>
                        {Object.entries(PRIORITY_CONFIG).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                    </SelectContent>
                </Select>
                <div className="flex items-center border rounded-lg p-0.5 bg-muted/50">
                    <Button variant={view === 'kanban' ? 'default' : 'ghost'} size="sm" className="h-7 px-2.5" onClick={() => setView('kanban')}>
                        <LayoutGrid className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant={view === 'list' ? 'default' : 'ghost'} size="sm" className="h-7 px-2.5" onClick={() => setView('list')}>
                        <List className="h-3.5 w-3.5" />
                    </Button>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 min-h-0 animate-in fade-in duration-300 delay-300">
                {isLoading ? (
                    <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
                ) : view === 'kanban' ? (
                    /* Kanban View */
                    <div className="grid grid-cols-4 gap-4 h-full">
                        {KANBAN_COLUMNS.map(status => {
                            const cfg = STATUS_CONFIG[status];
                            const col = kanbanData[status] || [];
                            return (
                                <div key={status} className="flex flex-col min-h-0">
                                    <div className={`flex items-center gap-2 p-2.5 rounded-t-lg border-b-2 ${cfg.bgColor}`}>
                                        <cfg.icon className={`h-4 w-4 ${cfg.color}`} />
                                        <span className={`text-sm font-semibold ${cfg.color}`}>{cfg.label}</span>
                                        <Badge variant="secondary" className="ml-auto text-[10px] h-5">{col.length}</Badge>
                                    </div>
                                    <ScrollArea className="flex-1 p-2 bg-muted/30 rounded-b-lg border border-t-0">
                                        <div className="space-y-2">
                                            {col.length === 0 ? (
                                                <p className="text-xs text-muted-foreground text-center py-8 italic">Không có ticket</p>
                                            ) : col.map(t => (
                                                <KanbanCard key={t.id} ticket={t} onClick={() => openDetail(t.id)} />
                                            ))}
                                        </div>
                                    </ScrollArea>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    /* List View */
                    <Card className="h-full overflow-hidden">
                        <div className="overflow-auto h-full">
                            <table className="w-full text-sm">
                                <thead className="sticky top-0 bg-muted/80 backdrop-blur-sm border-b">
                                    <tr>
                                        <th className="text-left p-3 font-medium text-muted-foreground">Mã</th>
                                        <th className="text-left p-3 font-medium text-muted-foreground">Tiêu đề</th>
                                        <th className="text-left p-3 font-medium text-muted-foreground">Danh mục</th>
                                        <th className="text-left p-3 font-medium text-muted-foreground">Ưu tiên</th>
                                        <th className="text-left p-3 font-medium text-muted-foreground">Trạng thái</th>
                                        <th className="text-left p-3 font-medium text-muted-foreground">Người yêu cầu</th>
                                        <th className="text-left p-3 font-medium text-muted-foreground">Người xử lý</th>
                                        <th className="text-left p-3 font-medium text-muted-foreground">SLA</th>
                                        <th className="text-left p-3 font-medium text-muted-foreground">Ngày tạo</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {tickets.map(t => (
                                        <tr key={t.id} onClick={() => openDetail(t.id)} className="border-b hover:bg-muted/50 cursor-pointer transition-colors">
                                            <td className="p-3 font-mono text-xs text-muted-foreground">{t.code}</td>
                                            <td className="p-3 font-medium max-w-[300px]">
                                                <span className="line-clamp-1 hover:text-blue-600 transition-colors">{t.title}</span>
                                            </td>
                                            <td className="p-3 text-muted-foreground">{t.category?.name}</td>
                                            <td className="p-3"><PriorityBadge priority={t.priority} /></td>
                                            <td className="p-3"><StatusBadge status={t.status} /></td>
                                            <td className="p-3">
                                                <div className="flex items-center gap-1.5">
                                                    <Avatar className="h-5 w-5"><AvatarFallback className="text-[9px] bg-blue-100 text-blue-700">{t.requester?.fullName?.charAt(0)}</AvatarFallback></Avatar>
                                                    <span className="text-xs truncate max-w-[120px]">{t.requester?.fullName}</span>
                                                </div>
                                            </td>
                                            <td className="p-3 text-xs">{t.assignee?.fullName || <span className="text-muted-foreground italic">—</span>}</td>
                                            <td className="p-3"><SlaIndicator deadline={t.slaDeadline} /></td>
                                            <td className="p-3 text-xs text-muted-foreground whitespace-nowrap">{format(new Date(t.createdAt), 'dd/MM HH:mm')}</td>
                                        </tr>
                                    ))}
                                    {tickets.length === 0 && (
                                        <tr><td colSpan={9} className="p-12 text-center text-muted-foreground">Không có ticket nào</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                )}
            </div>

            {/* Drawers */}
            <TicketDetailDrawer ticketId={selectedTicketId} open={detailOpen} onOpenChange={setDetailOpen} />
            <CreateTicketDrawer open={createOpen} onOpenChange={setCreateOpen} />
        </div>
    );
}
