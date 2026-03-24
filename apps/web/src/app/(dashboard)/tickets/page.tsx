'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Headphones, Search, Plus, Clock, CheckCircle2, AlertTriangle, BarChart3, MessageSquare, Timer, Star, MoreHorizontal, Trash2, RotateCcw, Ticket, History, Laptop, User } from 'lucide-react';
import { apiClient as api } from '@/lib/api-client';
import { PageHeader } from '@/components/ui/page-header';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { PermissionGate, usePermissionCheck } from '@/components/auth/permission-gate';
import { useAuth } from '@/contexts/auth-context';
import { useDeleteTicket, useApproveTicket, useRejectTicket } from '@/services/tickets.service';
import { toast } from 'sonner';

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
    DRAFT: { label: 'Bản nháp', color: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300', icon: '📝' },
    DEPT_PENDING: { label: 'Chờ quản lý duyệt', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300', icon: '⏳' },
    IT_PENDING: { label: 'Chờ IT tiếp nhận', color: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300', icon: '🏢' },
    OPEN: { label: 'Mới', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300', icon: '🆕' },
    ASSIGNED: { label: 'Đã giao', color: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-300', icon: '👤' },
    IN_PROGRESS: { label: 'Đang xử lý', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300', icon: '⚡' },
    RESOLVED: { label: 'Đã giải quyết', color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300', icon: '✅' },
    CLOSED: { label: 'Đã đóng', color: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300', icon: '🔒' },
    REOPENED: { label: 'Mở lại', color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300', icon: '🔄' },
    REJECTED: { label: 'Từ chối', color: 'bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-300', icon: '❌' },
};

const PRIORITY_CONFIG: Record<string, { label: string; color: string }> = {
    LOW: { label: 'Thấp', color: 'text-gray-500' },
    MEDIUM: { label: 'Trung bình', color: 'text-blue-500' },
    HIGH: { label: 'Cao', color: 'text-orange-500' },
    URGENT: { label: 'Khẩn cấp', color: 'text-red-600 font-bold' },
};

export default function TicketsPage() {
    const queryClient = useQueryClient();
    const [search, setSearch] = useState('');
    const [createOpen, setCreateOpen] = useState(false);
    const [activeTab, setActiveTab] = useState('active');
    const [newTicket, setNewTicket] = useState({ title: '', description: '', categoryId: '', priority: 'MEDIUM', assetId: '' });
    const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);

    // Fetch my tickets
    const { data: myTickets = [], isLoading: isLoadingTickets, refetch: refetchTickets } = useQuery({
        queryKey: ['my-tickets'],
        queryFn: () => api.get('/tickets/my-tickets').then(r => r.data),
    });

    const deleteMutation = useDeleteTicket();
    const approveMutation = useApproveTicket();
    const rejectMutation = useRejectTicket();
    const { can } = usePermissionCheck();
    const isITStaff = can('TICKET_MANAGE');

    // Fetch pending approvals
    // Fetch pending approvals
    const { data: pendingApprovals = [], refetch: refetchApprovals } = useQuery({
        queryKey: ['pending-approvals'],
        queryFn: () => api.get('/tickets/pending-approvals').then(r => r.data).catch(() => []),
    });

    // Fetch my assets
    const { data: myAssets = [] } = useQuery({
        queryKey: ['my-assets'],
        queryFn: () => api.get('/it-assets', { params: { isMine: true } }).then(r => r.data?.data || []),
    });

    // Fetch single ticket detail
    const { data: ticketDetail, isLoading: isLoadingDetail } = useQuery({
        queryKey: ['ticket-detail', selectedTicketId],
        queryFn: () => api.get(`/tickets/${selectedTicketId}`).then(r => r.data),
        enabled: !!selectedTicketId,
    });

    // Fetch assigned to me (IT Support view)
    const { data: assignedTickets = [] } = useQuery({
        queryKey: ['assigned-tickets'],
        queryFn: () => api.get('/tickets/assigned-to-me').then(r => r.data),
        enabled: isITStaff,
    });

    // Fetch all tickets (Admin view)
    const { data: allTickets = [] } = useQuery({
        queryKey: ['all-tickets'],
        queryFn: () => api.get('/tickets').then(r => r.data?.data || []),
        enabled: isITStaff,
    });

    const handleDelete = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (!confirm('Bạn có chắc muốn xóa ticket này?')) return;
        try {
            await deleteMutation.mutateAsync(id);
            toast.success('Đã xóa ticket');
            refetchTickets();
        } catch (error: any) {
            toast.error(error?.response?.data?.message || 'Lỗi khi xóa');
        }
    };

    // Fetch statistics
    const { data: stats } = useQuery({
        queryKey: ['ticket-stats'],
        queryFn: () => api.get('/tickets/statistics').then(r => r.data).catch(() => null),
    });

    // Fetch categories
    const { data: categories = [] } = useQuery({
        queryKey: ['ticket-categories'],
        queryFn: () => api.get('/tickets/categories').then((r: any) => r.data),
    });

    // Create ticket
    const createMutation = useMutation({
        mutationFn: (data: any) => api.post('/tickets', data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['my-tickets'] });
            setCreateOpen(false);
            setNewTicket({ title: '', description: '', categoryId: '', priority: 'MEDIUM', assetId: '' });
        },
    });

    const filteredTickets = myTickets.filter((t: any) =>
        !search || t.title.toLowerCase().includes(search.toLowerCase()) || t.code.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="flex flex-col h-[calc(100vh-0rem)] space-y-4 p-2 bg-background">
            <div className="bg-card/60 backdrop-blur-xl border border-border/50 shadow-sm rounded-xl p-2 animate-in fade-in slide-in-from-top-4 duration-500">
            <PageHeader
                title="IT Ticket"
                icon={
                    <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-xl flex items-center justify-center shadow-sm bg-gradient-to-br from-slate-500 to-slate-700">
                        <Ticket className="h-4 w-4 sm:h-5 sm:w-5 text-white" style={{ margin: '2px' }} />
                    </div>
                }
                className="mb-0 border-none bg-transparent p-0 shadow-none"
            >
                <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                    <DialogTrigger asChild>
                        <Button className="h-10 bg-gradient-to-r from-violet-600 to-indigo-600 text-white hover:from-violet-700 hover:to-indigo-700">
                            <Plus className="h-4 w-4 mr-2" /> Tạo Ticket
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-lg">
                        <DialogHeader>
                            <DialogTitle>Tạo Ticket mới</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                            <div>
                                <Label>Tiêu đề *</Label>
                                <Input
                                    value={newTicket.title}
                                    onChange={e => setNewTicket(p => ({ ...p, title: e.target.value }))}
                                    placeholder="VD: Máy tính không vào được mạng"
                                />
                            </div>
                            <div>
                                <Label>Mô tả chi tiết *</Label>
                                <Textarea
                                    value={newTicket.description}
                                    onChange={e => setNewTicket(p => ({ ...p, description: e.target.value }))}
                                    placeholder="Mô tả chi tiết vấn đề bạn đang gặp..."
                                    rows={4}
                                />
                            </div>
                             <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label>Danh mục *</Label>
                                    <select
                                        value={newTicket.categoryId}
                                        onChange={e => setNewTicket(p => ({ ...p, categoryId: e.target.value }))}
                                        className="w-full border rounded-lg px-3 py-2 text-sm bg-background"
                                    >
                                        <option value="">Chọn danh mục</option>
                                        {categories.map((c: any) => (
                                            <option key={c.id} value={c.id}>{c.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <Label>Mức ưu tiên</Label>
                                    <select
                                        value={newTicket.priority}
                                        onChange={e => setNewTicket(p => ({ ...p, priority: e.target.value }))}
                                        className="w-full border rounded-lg px-3 py-2 text-sm bg-background"
                                    >
                                        {Object.entries(PRIORITY_CONFIG).map(([key, cfg]) => (
                                            <option key={key} value={key}>{cfg.label}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <div>
                                <Label>Thiết bị liên quan (nếu có)</Label>
                                <select
                                    value={newTicket.assetId}
                                    onChange={e => setNewTicket(p => ({ ...p, assetId: e.target.value }))}
                                    className="w-full border rounded-lg px-3 py-2 text-sm bg-background"
                                >
                                    <option value="">Chọn thiết bị</option>
                                    {myAssets.map((a: any) => (
                                        <option key={a.id} value={a.id}>{a.code} - {a.name}</option>
                                    ))}
                                </select>
                            </div>
                            <Button
                                className="w-full"
                                onClick={() => createMutation.mutate(newTicket)}
                                disabled={!newTicket.title || !newTicket.description || !newTicket.categoryId || createMutation.isPending}
                            >
                                Gửi Ticket
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </PageHeader>
            </div>

            <div className="flex-1 overflow-y-auto min-h-0 space-y-4 custom-scrollbar pr-1 pb-2">
            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-4">
                <Card className="bg-gradient-to-br from-violet-50 to-indigo-50 dark:from-violet-950/40 dark:to-indigo-950/30 border-violet-200/50">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-violet-500 rounded-lg text-white">
                                <Headphones className="h-5 w-5" />
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Tổng ticket</p>
                                <p className="text-2xl font-bold">{stats?.total || myTickets.length}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-green-100 rounded-lg text-green-700">
                                <CheckCircle2 className="h-5 w-5" />
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Đã giải quyết</p>
                                <p className="text-2xl font-bold">{stats?.totalResolved || 0}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-100 rounded-lg text-blue-700">
                                <Timer className="h-5 w-5" />
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">TB giải quyết</p>
                                <p className="text-2xl font-bold">{stats?.avgResolutionHours || 0}h</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-amber-100 rounded-lg text-amber-700">
                                <Star className="h-5 w-5" />
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">SLA đạt</p>
                                <p className="text-2xl font-bold">{stats?.slaCompliancePercent || 100}%</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Search */}
            <div className="relative max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Tìm ticket..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="pl-9"
                />
            </div>

            {/* Ticket List Area */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
                <div className="flex items-center justify-between">
                    <TabsList>
                        <TabsTrigger value="active">Ticket Gần Đây</TabsTrigger>
                        {isITStaff && (
                            <>
                                <TabsTrigger value="assigned" className="relative">
                                    Hỗ trợ của tôi
                                    {assignedTickets.length > 0 && (
                                        <Badge className="ml-2 h-5 w-5 p-0 flex items-center justify-center rounded-full text-[10px]">
                                            {assignedTickets.length}
                                        </Badge>
                                    )}
                                </TabsTrigger>
                                <TabsTrigger value="all">Tất cả Ticket</TabsTrigger>
                            </>
                        )}
                        {pendingApprovals.length > 0 && (
                            <TabsTrigger value="approvals" className="relative">
                                Phê duyệt của tôi
                                <Badge variant="destructive" className="ml-2 h-5 w-5 p-0 flex items-center justify-center rounded-full text-[10px]">
                                    {pendingApprovals.length}
                                </Badge>
                            </TabsTrigger>
                        )}
                    </TabsList>
                </div>

                <TabsContent value="active" className="space-y-3">
                    {filteredTickets.map((ticket: any) => {
                        const statusCfg = STATUS_CONFIG[ticket.status] || { label: ticket.status, color: '', icon: '📋' };
                        const priorityCfg = PRIORITY_CONFIG[ticket.priority] || { label: ticket.priority, color: '' };

                        return (
                            <Card 
                                key={ticket.id} 
                                className="hover:shadow-md transition-shadow cursor-pointer"
                                onClick={() => setSelectedTicketId(ticket.id)}
                            >
                                <CardContent className="p-4">
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="font-mono text-xs text-muted-foreground">{ticket.code}</span>
                                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusCfg.color}`}>
                                                    {statusCfg.icon} {statusCfg.label}
                                                </span>
                                                <span className={`text-xs ${priorityCfg.color}`}>
                                                    ● {priorityCfg.label}
                                                </span>
                                            </div>
                                            <h3 className="font-semibold text-base truncate">{ticket.title}</h3>
                                            <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground flex-wrap">
                                                <span className="flex items-center gap-1" title="Ngày tạo">
                                                    <Clock className="h-3 w-3" />
                                                    {new Date(ticket.createdAt).toLocaleDateString('vi-VN')}
                                                </span>
                                                {ticket.slaDeadline && !['RESOLVED', 'CLOSED'].includes(ticket.status) && (
                                                    <span className={`flex items-center gap-1 font-medium ${new Date() > new Date(ticket.slaDeadline) ? 'text-rose-600 dark:text-rose-400' :
                                                        new Date(ticket.slaDeadline).getTime() - new Date().getTime() < 2 * 3600 * 1000 ? 'text-amber-500' : 'text-blue-600 dark:text-blue-400'
                                                        }`} title="SLA Deadline">
                                                        <Timer className="h-3 w-3" />
                                                        Hạn: {new Date(ticket.slaDeadline).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })}
                                                    </span>
                                                )}
                                                {ticket.category && (
                                                    <span className="flex items-center gap-1">📁 {ticket.category.name}</span>
                                                )}
                                                {ticket.assignee && (
                                                    <span>👤 {ticket.assignee.fullName}</span>
                                                )}
                                                <span className="flex items-center gap-1">
                                                    <MessageSquare className="h-3 w-3" />
                                                    {ticket._count?.comments || 0}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-end gap-2">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-muted">
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem onClick={(e) => handleDelete(e as unknown as React.MouseEvent, ticket.id)} className="text-red-500 focus:text-red-500 cursor-pointer">
                                                        <Trash2 className="mr-2 h-4 w-4" /> Xóa
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                            {ticket.rating && (
                                                <div className="flex items-center gap-0.5 text-amber-500">
                                                    {Array.from({ length: ticket.rating }).map((_, i) => (
                                                        <Star key={i} className="h-3.5 w-3.5 fill-current" />
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                    {filteredTickets.length === 0 && (
                        <div className="text-center py-12 text-muted-foreground">
                            <Headphones className="h-12 w-12 mx-auto mb-4 opacity-30" />
                            <p>{isLoadingTickets ? 'Đang tải...' : 'Chưa có ticket nào'}</p>
                            <p className="text-sm mt-1">Nhấn "Tạo Ticket" để gửi yêu cầu hỗ trợ IT</p>
                        </div>
                    )}
                </TabsContent>

                <TabsContent value="approvals" className="space-y-3">
                    {pendingApprovals.map((ticket: any) => {
                        const statusCfg = STATUS_CONFIG[ticket.status] || { label: ticket.status, color: '', icon: '📋' };
                        const priorityCfg = PRIORITY_CONFIG[ticket.priority] || { label: ticket.priority, color: '' };

                        return (
                            <Card key={ticket.id} className="border-orange-200 dark:border-orange-900/50 bg-orange-50/10 hover:shadow-md transition-shadow">
                                <CardContent className="p-4">
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="font-mono text-xs text-muted-foreground">{ticket.code}</span>
                                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusCfg.color}`}>
                                                    {statusCfg.icon} {statusCfg.label}
                                                </span>
                                            </div>
                                            <h3 className="font-semibold text-base truncate">{ticket.title}</h3>
                                            <p className="text-sm text-muted-foreground line-clamp-1 mt-1">Người yêu cầu: {ticket.requester?.fullName}</p>
                                        </div>
                                        <div className="flex gap-2">
                                            <Button 
                                                size="sm" 
                                                variant="outline" 
                                                className="bg-green-50 text-green-700 border-green-200 hover:bg-green-100"
                                                onClick={() => {
                                                    if (confirm('Phê duyệt ticket này?')) {
                                                        approveMutation.mutate({ id: ticket.id }, {
                                                            onSuccess: () => {
                                                                toast.success('Đã phê duyệt');
                                                                refetchApprovals();
                                                            }
                                                        });
                                                    }
                                                }}
                                            >
                                                Duyệt
                                            </Button>
                                            <Button 
                                                size="sm" 
                                                variant="outline" 
                                                className="bg-red-50 text-red-700 border-red-200 hover:bg-red-100"
                                                onClick={() => {
                                                    const reason = prompt('Lý do từ chối:');
                                                    if (reason) {
                                                        rejectMutation.mutate({ id: ticket.id, comment: reason }, {
                                                            onSuccess: () => {
                                                                toast.success('Đã từ chối');
                                                                refetchApprovals();
                                                            }
                                                        });
                                                    }
                                                }}
                                            >
                                                Từ chối
                                            </Button>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </TabsContent>

                <TabsContent value="assigned" className="space-y-3">
                    {assignedTickets.map((ticket: any) => (
                        <TicketCard key={ticket.id} ticket={ticket} onClick={() => setSelectedTicketId(ticket.id)} />
                    ))}
                    {assignedTickets.length === 0 && (
                        <div className="text-center py-12 text-muted-foreground">Chưa có ticket nào được gán cho bạn.</div>
                    )}
                </TabsContent>

                <TabsContent value="all" className="space-y-3">
                    {allTickets.map((ticket: any) => (
                        <TicketCard key={ticket.id} ticket={ticket} onClick={() => setSelectedTicketId(ticket.id)} />
                    ))}
                </TabsContent>
            </Tabs>

            {/* Ticket Detail Sheet */}
            <Sheet open={!!selectedTicketId} onOpenChange={(open) => !open && setSelectedTicketId(null)}>
                <SheetContent className="sm:max-w-xl overflow-y-auto">
                    {isLoadingDetail ? (
                        <div className="flex items-center justify-center h-full">Đang tải...</div>
                    ) : ticketDetail && (
                        <div className="space-y-6">
                            <SheetHeader>
                                <div className="flex items-center gap-2 mb-2">
                                    <Badge variant="outline" className="font-mono">{ticketDetail.code}</Badge>
                                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_CONFIG[ticketDetail.status]?.color}`}>
                                        {STATUS_CONFIG[ticketDetail.status]?.icon} {STATUS_CONFIG[ticketDetail.status]?.label}
                                    </span>
                                </div>
                                <SheetTitle className="text-xl">{ticketDetail.title}</SheetTitle>
                            </SheetHeader>

                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div className="space-y-1">
                                    <p className="text-muted-foreground flex items-center gap-1"><User className="h-3 w-3"/> Người yêu cầu</p>
                                    <p className="font-medium">{ticketDetail.requester?.fullName}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-muted-foreground flex items-center gap-1"><History className="h-3 w-3"/> Ngày tạo</p>
                                    <p className="font-medium">{new Date(ticketDetail.createdAt).toLocaleString('vi-VN')}</p>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <h4 className="font-semibold text-sm border-b pb-1">Mô tả</h4>
                                <p className="text-sm whitespace-pre-wrap text-muted-foreground">{ticketDetail.description}</p>
                            </div>

                            {ticketDetail.asset && (
                                <div className="p-3 bg-muted/50 rounded-lg flex items-center gap-3">
                                    <Laptop className="h-5 w-5 text-blue-500" />
                                    <div>
                                        <p className="text-xs text-muted-foreground font-medium uppercase">Thiết bị liên quan</p>
                                        <p className="text-sm font-semibold">{ticketDetail.asset.name} ({ticketDetail.asset.code})</p>
                                    </div>
                                </div>
                            )}

                            <div className="space-y-4">
                                <h4 className="font-semibold text-sm border-b pb-1 flex items-center gap-2">
                                    <History className="h-4 w-4" /> Lịch sử xử lý
                                </h4>
                                <div className="relative space-y-4 before:absolute before:inset-0 before:ml-2.5 before:-translate-x-px before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-300 before:to-transparent">
                                    {ticketDetail.ticketHistory?.map((h: any, i: number) => (
                                        <div key={i} className="relative flex items-start gap-3 pl-8">
                                            <div className="absolute left-0 flex items-center justify-center w-5 h-5 rounded-full bg-white border-2 border-slate-400">
                                                <div className="w-1.5 h-1.5 rounded-full bg-slate-400"></div>
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs font-semibold">{h.actor?.fullName || 'Hệ thống'}</span>
                                                    <span className="text-[10px] text-muted-foreground">{new Date(h.createdAt).toLocaleString('vi-VN')}</span>
                                                </div>
                                                <p className="text-xs font-medium text-slate-700">{h.action}</p>
                                                {h.comment && <p className="text-xs text-muted-foreground bg-slate-50 p-1.5 rounded mt-1 italic">"{h.comment}"</p>}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </SheetContent>
            </Sheet>
            </div>
        </div>
    );
}

function TicketCard({ ticket, onClick }: { ticket: any, onClick: () => void }) {
    const statusCfg = STATUS_CONFIG[ticket.status] || { label: ticket.status, color: '', icon: '📋' };
    const priorityCfg = PRIORITY_CONFIG[ticket.priority] || { label: ticket.priority, color: '' };

    return (
        <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={onClick}>
            <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                            <span className="font-mono text-xs text-muted-foreground">{ticket.code}</span>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusCfg.color}`}>
                                {statusCfg.icon} {statusCfg.label}
                            </span>
                            <span className={`text-xs ${priorityCfg.color}`}>
                                ● {priorityCfg.label}
                            </span>
                        </div>
                        <h3 className="font-semibold text-base truncate">{ticket.title}</h3>
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                            <span>👤 {ticket.requester?.fullName}</span>
                            <span>📁 {ticket.category?.name}</span>
                            <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {new Date(ticket.createdAt).toLocaleDateString('vi-VN')}
                            </span>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
