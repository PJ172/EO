'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, startOfDay } from 'date-fns';
import { vi } from 'date-fns/locale';
import { useForm } from 'react-hook-form';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { UtensilsCrossed, Calendar, ChefHat, Users, CheckCircle2, UserX, Clock } from 'lucide-react';
import { mealApi as api } from '@/lib/api-client';
import { toast } from 'sonner';

export default function AdminMealsPage() {
    const queryClient = useQueryClient();
    const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));

    // Fetch sessions
    const { data: sessions = [] } = useQuery({
        queryKey: ['meal-sessions'],
        queryFn: () => api.getSessions().then(r => r.data),
    });

    // Fetch Daily Stats
    const { data: stats = [], isLoading: loadingStats } = useQuery({
        queryKey: ['meal-stats', selectedDate],
        queryFn: () => api.getDailyStats(selectedDate).then(r => r.data),
    });

    // Fetch Registrations
    const { data: registrations = [], isLoading: loadingRegs } = useQuery({
        queryKey: ['meal-registrations', selectedDate],
        queryFn: () => api.getRegistrationsByDate(selectedDate).then(r => r.data),
    });

    // Fetch Menu
    const { data: menu = [], isLoading: loadingMenu } = useQuery({
        queryKey: ['meal-menu', selectedDate],
        queryFn: () => api.getMenu(selectedDate).then(r => r.data),
    });

    // Menu Form Modal
    const [isMenuModalOpen, setIsMenuModalOpen] = useState(false);
    const [editingSessionId, setEditingSessionId] = useState<string>('');

    const { register, handleSubmit, reset } = useForm({
        defaultValues: {
            mainDish: '',
            sideDish: '',
            soup: '',
            dessert: '',
            price: 0
        }
    });

    const openMenuModal = (sessionId: string) => {
        const existingMenu = menu.find((m: any) => m.sessionId === sessionId);
        const sessionInfo = sessions.find((s: any) => s.id === sessionId);

        setEditingSessionId(sessionId);
        reset({
            mainDish: existingMenu?.mainDish || '',
            sideDish: existingMenu?.sideDish || '',
            soup: existingMenu?.soup || '',
            dessert: existingMenu?.dessert || '',
            price: existingMenu?.price || sessionInfo?.defaultPrice || 0
        });
        setIsMenuModalOpen(true);
    };

    const upsertMenuMutation = useMutation({
        mutationFn: (data: any) => api.upsertMenu(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['meal-menu'] });
            toast.success('Thành công', { description: 'Đã cập nhật thực đơn' });
            setIsMenuModalOpen(false);
        },
        onError: (error: any) => {
            toast.error('Lỗi', { description: error.response?.data?.message || 'Không thể cập nhật thực đơn' });
        }
    });

    const onSubmitMenu = (data: any) => {
        upsertMenuMutation.mutate({
            sessionId: editingSessionId,
            date: selectedDate + 'T00:00:00.000Z', // Bắt buộc ISO format backend
            mainDish: data.mainDish,
            sideDish: data.sideDish,
            soup: data.soup,
            dessert: data.dessert,
            price: Number(data.price)
        });
    };

    // Calculate overall totals
    const safeStats = Array.isArray(stats) ? stats : [];
    const totalRegistered = safeStats.reduce((acc: number, curr: any) => acc + (curr?._count?.registered || 0), 0);
    const totalCancelled = safeStats.reduce((acc: number, curr: any) => acc + (curr?._count?.cancelled || 0), 0);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">
                        👨‍🍳 Quản trị Suất ăn
                    </h1>
                    <p className="text-muted-foreground mt-1">Quản lý thực đơn và xem số liệu tổng hợp báo cơm hằng ngày</p>
                </div>
                <div className="flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-muted-foreground" />
                    <Input
                        type="date"
                        value={selectedDate}
                        onChange={e => setSelectedDate(e.target.value)}
                        className="w-auto border-primary/20 bg-background shadow-sm"
                    />
                </div>
            </div>

            <Tabs defaultValue="overview" className="space-y-4">
                <TabsList className="grid w-full grid-cols-3 max-w-2xl bg-muted/50">
                    <TabsTrigger value="overview">Tổng quan Số liệu</TabsTrigger>
                    <TabsTrigger value="menu">Lên Thực đơn</TabsTrigger>
                    <TabsTrigger value="list">Danh sách Chi tiết</TabsTrigger>
                </TabsList>

                {/* OVERVIEW STATS */}
                <TabsContent value="overview" className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                        <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/20 dark:to-green-900/10 border-green-200">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium text-green-800 dark:text-green-400">
                                    Tổng Đăng ký (Hợp lệ)
                                </CardTitle>
                                <UtensilsCrossed className="h-4 w-4 text-green-600" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-3xl font-bold text-green-700 dark:text-green-300">{totalRegistered}</div>
                                <p className="text-xs text-green-600/80 mt-1">Tổng cộng các ca</p>
                            </CardContent>
                        </Card>
                        <Card className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950/20 dark:to-red-900/10 border-red-200">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium text-red-800 dark:text-red-400">
                                    Tổng Đã Hủy
                                </CardTitle>
                                <UserX className="h-4 w-4 text-red-600" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-3xl font-bold text-red-700 dark:text-red-300">{totalCancelled}</div>
                                <p className="text-xs text-red-600/80 mt-1">Tổng cộng các ca</p>
                            </CardContent>
                        </Card>
                    </div>

                    <h3 className="text-lg font-medium mt-6 mb-3">Thống kê theo ca ăn</h3>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {loadingStats ? (
                            <div className="col-span-3 text-center py-8 text-muted-foreground">Đang tải số liệu...</div>
                        ) : sessions.filter((s: any) => s.isActive).map((session: any) => {
                            const stat = safeStats.find((s: any) => s.sessionId === session.id);
                            const registered = stat?._count?.registered || 0;
                            const cancelled = stat?._count?.cancelled || 0;
                            const used = stat?._count?.used || 0;

                            return (
                                <Card key={session.id}>
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-base flex items-center justify-between">
                                            <span>{session.name}</span>
                                            <Badge variant="outline">{session.timeStart} - {session.timeEnd}</Badge>
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="flexjustify-between items-center text-sm py-2 border-b">
                                            <span className="text-muted-foreground flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-green-500" />Đăng ký ăn:</span>
                                            <span className="font-bold text-lg">{registered} <span className="text-xs font-normal text-muted-foreground">suất</span></span>
                                        </div>
                                        <div className="flex justify-between items-center text-sm py-2">
                                            <span className="text-muted-foreground flex items-center gap-2"><UserX className="h-4 w-4 text-red-400" />Báo hủy:</span>
                                            <span className="font-medium text-red-500">{cancelled}</span>
                                        </div>
                                    </CardContent>
                                </Card>
                            )
                        })}
                    </div>
                </TabsContent>

                {/* MENU EDITOR */}
                <TabsContent value="menu" className="space-y-4">
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {sessions.filter((s: any) => s.isActive).map((session: any) => {
                            const menuItem = menu.find((m: any) => m.sessionId === session.id);

                            return (
                                <Card key={session.id} className="flex flex-col">
                                    <CardHeader className="pb-3 border-b bg-muted/20">
                                        <CardTitle className="text-lg flex items-center gap-2">
                                            <ChefHat className="h-5 w-5 text-orange-500" />
                                            {session.name}
                                        </CardTitle>
                                        <CardDescription>Giờ chốt suất: {session.cutoffTime}</CardDescription>
                                    </CardHeader>
                                    <CardContent className="pt-4 flex-1 flex flex-col">
                                        {loadingMenu ? (
                                            <div className="text-sm text-muted-foreground italic">Đang tải...</div>
                                        ) : menuItem ? (
                                            <div className="space-y-2 text-sm flex-1">
                                                {menuItem.mainDish && <div className="flex gap-2"><span className="text-muted-foreground min-w-[70px]">Món chính:</span> <span className="font-medium">{menuItem.mainDish}</span></div>}
                                                {menuItem.sideDish && <div className="flex gap-2"><span className="text-muted-foreground min-w-[70px]">Món phụ:</span> <span>{menuItem.sideDish}</span></div>}
                                                {menuItem.soup && <div className="flex gap-2"><span className="text-muted-foreground min-w-[70px]">Canh:</span> <span>{menuItem.soup}</span></div>}
                                                {menuItem.dessert && <div className="flex gap-2"><span className="text-muted-foreground min-w-[70px]">Tráng miệng:</span> <span>{menuItem.dessert}</span></div>}
                                                <div className="flex gap-2 mt-4 pt-2 border-t"><span className="text-muted-foreground min-w-[70px]">Đơn giá:</span> <span>{new Intl.NumberFormat('vi-VN').format(menuItem.price)} ₫</span></div>
                                            </div>
                                        ) : (
                                            <div className="flex-1 flex items-center justify-center text-muted-foreground italic text-sm py-6">
                                                Chưa có dữ liệu thực đơn
                                            </div>
                                        )}

                                        <Button
                                            variant="outline"
                                            className="w-full mt-4 border-orange-200 hover:bg-orange-50 hover:text-orange-600 dark:hover:bg-orange-950/30"
                                            onClick={() => openMenuModal(session.id)}
                                        >
                                            Cập nhật Thực đơn
                                        </Button>
                                    </CardContent>
                                </Card>
                            )
                        })}
                    </div>
                </TabsContent>

                {/* DETAILED REGISTRATIONS LIST */}
                <TabsContent value="list" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Danh sách Đăng ký Chi tiết</CardTitle>
                            <CardDescription>Xem danh sách nhân sự báo cơm trong ngày {format(new Date(selectedDate), 'dd/MM/yyyy')}</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {loadingRegs ? (
                                <div className="text-center py-8 text-muted-foreground">Đang tải danh sách...</div>
                            ) : registrations.length === 0 ? (
                                <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg">Không có dữ liệu đăng ký nào cho ngày này</div>
                            ) : (
                                <div className="space-y-6">
                                    {/* Nhóm theo Session */}
                                    {sessions.map((session: any) => {
                                        const sessionRegs = registrations.filter((r: any) => r.sessionId === session.id);
                                        if (sessionRegs.length === 0) return null;

                                        return (
                                            <div key={session.id} className="border rounded-md overflow-hidden">
                                                <div className="bg-muted px-4 py-2 font-semibold flex items-center justify-between">
                                                    <span>{session.name}</span>
                                                    <Badge>{sessionRegs.length} bản ghi</Badge>
                                                </div>
                                                <div className="divide-y max-h-[400px] overflow-y-auto">
                                                    {sessionRegs.map((reg: any) => (
                                                        <div key={reg.id} className="px-4 py-3 flex items-center justify-between hover:bg-muted/30">
                                                            <div className="flex items-center gap-3">
                                                                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium text-xs">
                                                                    {reg.employee.fullName.split(' ').pop()?.charAt(0)}
                                                                </div>
                                                                <div>
                                                                    <div className="font-medium text-sm">{reg.employee.fullName}</div>
                                                                    <div className="text-xs text-muted-foreground">Phòng ban: {reg.employee.departmentId || 'N/A'}</div>
                                                                </div>
                                                            </div>
                                                            <div className="flex flex-col items-end gap-1">
                                                                <Badge variant={reg.status === 'REGISTERED' ? 'default' : reg.status === 'CANCELLED' ? 'destructive' : 'secondary'} className={reg.status === 'REGISTERED' ? 'bg-green-600 hover:bg-green-700' : ''}>
                                                                    {reg.status}
                                                                </Badge>
                                                                {reg.note && <span className="text-xs text-amber-600 italic border border-amber-200 bg-amber-50 px-1.5 py-0.5 rounded">Ghi chú: {reg.note}</span>}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* Menu Edit Modal */}
            <Dialog open={isMenuModalOpen} onOpenChange={setIsMenuModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Cập nhật Thực đơn</DialogTitle>
                        <DialogDescription>
                            Chỉnh sửa các món ăn cho {sessions.find((s: any) => s.id === editingSessionId)?.name} ngày {format(new Date(selectedDate), 'dd/MM/yyyy')}
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleSubmit(onSubmitMenu)} className="space-y-4 py-2">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Món chính</label>
                            <Input placeholder="VD: Gà kho sả ớt, Thịt luộc..." {...register('mainDish')} />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Món phụ</label>
                            <Input placeholder="VD: Rau muống xào tỏi" {...register('sideDish')} />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Canh</label>
                            <Input placeholder="VD: Canh chua cá lóc" {...register('soup')} />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Tráng miệng</label>
                            <Input placeholder="VD: Chuối, Dưa hấu..." {...register('dessert')} />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Đơn giá (VNĐ)</label>
                            <Input type="number" placeholder="30000" {...register('price')} />
                        </div>

                        <DialogFooter className="pt-4">
                            <Button type="button" variant="outline" onClick={() => setIsMenuModalOpen(false)}>Hủy</Button>
                            <Button type="submit" disabled={upsertMenuMutation.isPending}>Lưu Thực đơn</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

        </div>
    );
}
