"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { carBookingApi } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Plus, Car, Calendar, Loader2, MapPin, Users, Clock, X, CheckCircle, Search, FileDown, Upload, ArrowUpDown, ChevronUp, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SearchBar } from "@/components/ui/search-bar";
import { Settings2 } from "lucide-react";

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
    AVAILABLE: { label: "Sẵn sàng", color: "bg-green-100 text-green-700" },
    BUSY: { label: "Đang sử dụng", color: "bg-orange-100 text-orange-700" },
    MAINTENANCE: { label: "Bảo trì", color: "bg-gray-100 text-gray-700" },
    CONFIRMED: { label: "Đã xác nhận", color: "bg-blue-100 text-blue-700" },
    CANCELLED: { label: "Đã hủy", color: "bg-red-100 text-red-700" },
};

export default function CarsPage() {
    const queryClient = useQueryClient();
    const router = useRouter(); const [search, setSearch] = useState("");
    const [sort, setSort] = useState<{ sortBy: string, order: "asc" | "desc" }>({ sortBy: "name", order: "asc" });
    const handleExport = () => toast.info("Tính năng Xuất Excel đang được phát triển...");
    const handleImport = () => toast.info("Tính năng Nhập Excel đang được phát triển...");

    const toggleSort = (field: string) => {
        setSort(prev => ({
            sortBy: field,
            order: prev.sortBy === field && prev.order === "asc" ? "desc" : "asc"
        }));
    };

    const SortIcon = ({ field }: { field: string }) => {
        if (sort.sortBy !== field) return <ArrowUpDown className="ml-1 h-3.5 w-3.5 text-muted-foreground/50 group-hover:text-muted-foreground group-hover:bg-muted/50 rounded" />;
        return sort.order === "asc"
            ? <ChevronUp className="ml-1 h-3.5 w-3.5 text-foreground bg-muted/50 rounded" />
            : <ChevronDown className="ml-1 h-3.5 w-3.5 text-foreground bg-muted/50 rounded" />;
    };

    const { data: allCars, isLoading: carsLoading, refetch: refetchCars } = useQuery({
        queryKey: ["cars"],
        queryFn: carBookingApi.getCars,
    });

    const cars = allCars?.filter((c: any) =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.licensePlate.toLowerCase().includes(search.toLowerCase())
    ).sort((a: any, b: any) => {
        const aVal = sort.sortBy.split('.').reduce((obj, key) => obj?.[key], a) || '';
        const bVal = sort.sortBy.split('.').reduce((obj, key) => obj?.[key], b) || '';
        if (aVal < bVal) return sort.order === "asc" ? -1 : 1;
        if (aVal > bVal) return sort.order === "asc" ? 1 : -1;
        return 0;
    });

    const { data: myBookings, isLoading: bookingsLoading } = useQuery({
        queryKey: ["car-bookings"],
        queryFn: carBookingApi.getMyBookings,
    });

    const { data: stats } = useQuery({
        queryKey: ["car-stats"],
        queryFn: carBookingApi.getStats,
    });
    const cancelBookingMutation = useMutation({
        mutationFn: carBookingApi.cancelBooking,
        onSuccess: () => {
            toast.success("Đã hủy lịch đặt");
            queryClient.invalidateQueries({ queryKey: ["car-bookings"] });
        },
    });
    return (
        <div className="flex flex-col h-[calc(100vh-0rem)] space-y-4 p-2 bg-background">
            <div className="bg-card/60 backdrop-blur-xl border border-border/50 shadow-sm rounded-xl p-2 animate-in fade-in slide-in-from-top-4 duration-500">
            <PageHeader
                title="QUẢN LÝ XE & ĐẶT XE"
                titleClassName="from-blue-500 to-blue-700 dark:from-blue-400 dark:to-blue-300"
                icon={
                    <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-xl flex items-center justify-center shadow-sm bg-gradient-to-br from-blue-500 to-blue-700">
                        <Car className="h-4 w-4 sm:h-5 sm:w-5 text-white" style={{ margin: '2px' }} />
                    </div>
                }
                className="mb-0 border-none bg-transparent p-0 shadow-none"
                onRefresh={refetchCars}
                isRefreshing={carsLoading}
                search={
                    <SearchBar
                        placeholder="Tìm kiếm xe hoặc biển số..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                }
            >
                <div className="flex items-center gap-2">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" className="h-9 bg-white/80 backdrop-blur-sm border-border/50 hover:bg-slate-100 transition-all rounded-xl shadow-sm font-semibold gap-2">
                                <Settings2 className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm">Tùy chọn</span>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-[200px] border-border shadow-lg rounded-xl">
                            <DropdownMenuItem onClick={handleExport} className="py-2.5 cursor-pointer rounded-lg mx-1">
                                <FileDown className="mr-2 h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                                <span className="font-medium">Xuất dữ liệu Excel</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={handleImport} className="py-2.5 cursor-pointer rounded-lg mx-1">
                                <Upload className="mr-2 h-4 w-4 text-blue-600 dark:text-blue-400" />
                                <span className="font-medium">Nhập dữ liệu Excel</span>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                    <Button className="h-9 bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/20 transition-all hover:-translate-y-0.5 px-5 rounded-xl font-semibold" onClick={() => router.push('/cars/new')}>
                        <Plus className="mr-2 h-4 w-4" /> Thêm mới
                    </Button>

                    <Button className="h-9 bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-500/20 transition-all hover:-translate-y-0.5 px-5 rounded-xl font-semibold" onClick={() => router.push('/cars/bookings/new')}>
                        <Calendar className="mr-2 h-4 w-4" />
                        Đặt xe
                    </Button>
                </div>
            </PageHeader>
            </div>

            <div className="flex-1 overflow-y-auto min-h-0 space-y-4 custom-scrollbar pr-1 pb-2">
            {/* Stats */}
            <div className="grid gap-4 md:grid-cols-4" >
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Tổng xe</CardTitle>
                        <Car className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats?.totalCars || 0}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Xe khả dụng</CardTitle>
                        <CheckCircle className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">{stats?.availableCars || 0}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Lịch sắp tới</CardTitle>
                        <Calendar className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-blue-600">{stats?.upcomingBookings || 0}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Tổng lượt đặt</CardTitle>
                        <Clock className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats?.totalBookings || 0}</div>
                    </CardContent>
                </Card>
            </div>

            <Tabs defaultValue="cars">
                <TabsList>
                    <TabsTrigger value="cars" className="flex gap-2">
                        <Car className="h-4 w-4" />
                        Danh sách xe
                    </TabsTrigger>
                    <TabsTrigger value="bookings" className="flex gap-2">
                        <Calendar className="h-4 w-4" />
                        Lịch đặt của tôi
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="cars">
                    <div className="rounded-md border bg-card">
                        <div className="p-4 border-b">
                            <h3 className="font-semibold leading-none tracking-tight">Danh sách xe</h3>
                        </div>
                        <div className="p-0">
                            {carsLoading ? (
                                <div className="flex justify-center py-8">
                                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                </div>
                            ) : (
                                <Table>
                                    <TableHeader className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 shadow-[0_1px_2px_rgba(0,0,0,0.04)] ring-1 ring-border/50">
                                        <TableRow className="hover:bg-transparent border-none">
                                            <TableHead className="h-10 font-medium cursor-pointer hover:bg-muted/80 transition-colors group" onClick={() => toggleSort("name")}>
                                                <div className="flex items-center">
                                                    Tên xe <SortIcon field="name" />
                                                </div>
                                            </TableHead>
                                            <TableHead className="h-10 font-medium cursor-pointer hover:bg-muted/80 transition-colors group" onClick={() => toggleSort("licensePlate")}>
                                                <div className="flex items-center">
                                                    Biển số <SortIcon field="licensePlate" />
                                                </div>
                                            </TableHead>
                                            <TableHead className="h-10 font-medium cursor-pointer hover:bg-muted/80 transition-colors group" onClick={() => toggleSort("driverName")}>
                                                <div className="flex items-center">
                                                    Tài xế <SortIcon field="driverName" />
                                                </div>
                                            </TableHead>
                                            <TableHead className="h-10 font-medium cursor-pointer hover:bg-muted/80 transition-colors group" onClick={() => toggleSort("seatCount")}>
                                                <div className="flex items-center">
                                                    Số ghế <SortIcon field="seatCount" />
                                                </div>
                                            </TableHead>
                                            <TableHead className="h-10 font-medium cursor-pointer hover:bg-muted/80 transition-colors group" onClick={() => toggleSort("status")}>
                                                <div className="flex items-center">
                                                    Trạng thái <SortIcon field="status" />
                                                </div>
                                            </TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {cars?.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                                    Chưa có xe nào. Bấm "Thêm xe" để bắt đầu.
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            cars?.map((car: any) => (
                                                <TableRow key={car.id}>
                                                    <TableCell className="font-medium">
                                                        <div className="flex items-center gap-2">
                                                            <Car className="h-4 w-4 text-muted-foreground" />
                                                            {car.name}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>{car.licensePlate}</TableCell>
                                                    <TableCell>{car.driverName || "-"}</TableCell>
                                                    <TableCell>
                                                        <div className="flex items-center gap-1">
                                                            <Users className="h-4 w-4 text-muted-foreground" />
                                                            {car.seatCount}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge className={STATUS_LABELS[car.status]?.color || ""}>
                                                            {STATUS_LABELS[car.status]?.label || car.status}
                                                        </Badge>
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            )}
                        </div>
                    </div>
                </TabsContent>

                <TabsContent value="bookings">
                    <div className="rounded-md border bg-card">
                        <div className="p-4 border-b">
                            <h3 className="font-semibold leading-none tracking-tight">Lịch đặt xe của tôi</h3>
                        </div>
                        <div className="p-0">
                            {bookingsLoading ? (
                                <div className="flex justify-center py-8">
                                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                </div>
                            ) : (
                                <Table>
                                    <TableHeader className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 shadow-[0_1px_2px_rgba(0,0,0,0.04)] ring-1 ring-border/50">
                                        <TableRow className="hover:bg-transparent border-none">
                                            <TableHead className="h-10 font-medium text-foreground">Xe</TableHead>
                                            <TableHead className="h-10 font-medium text-foreground">Địa điểm</TableHead>
                                            <TableHead className="h-10 font-medium text-foreground">Thời gian</TableHead>
                                            <TableHead className="h-10 font-medium text-foreground">Trạng thái</TableHead>
                                            <TableHead className="h-10 font-medium text-foreground"></TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {myBookings?.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                                    Chưa có lịch đặt nào.
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            myBookings?.map((booking: any) => (
                                                <TableRow key={booking.id}>
                                                    <TableCell className="font-medium">
                                                        {booking.car?.name} - {booking.car?.licensePlate}
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex items-center gap-1">
                                                            <MapPin className="h-4 w-4 text-muted-foreground" />
                                                            {booking.destination}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="text-sm">
                                                            {format(new Date(booking.startTime), "dd/MM HH:mm", { locale: vi })} -{" "}
                                                            {format(new Date(booking.endTime), "HH:mm", { locale: vi })}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge className={STATUS_LABELS[booking.status]?.color || ""}>
                                                            {STATUS_LABELS[booking.status]?.label || booking.status}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell>
                                                        {booking.status === "CONFIRMED" && (
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => cancelBookingMutation.mutate(booking.id)}
                                                            >
                                                                <X className="h-4 w-4 text-red-500" />
                                                            </Button>
                                                        )}
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            )}
                        </div>
                    </div>
                </TabsContent>
            </Tabs>
            </div>
        </div>
    );
}
