'use client';

import { getAvatarVariant } from "@/lib/utils";
import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Building2, ChevronDown, ChevronRight, Edit2, Lock, Mail, MoreVertical, Network, Phone, Plus, RefreshCw, Save, Search, Trash2, Unlock, UserX, Users, X, Loader2, Briefcase, MapPin, AlertTriangle, Eye, EyeOff, LayoutTemplate } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Combobox } from '@/components/ui/combobox';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { PageHeader } from "@/components/ui/page-header";
import OrgChartCanvas from '@/components/org-chart/org-chart-canvas';
import OrgChartExport from '@/components/org-chart/org-chart-export';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from '@/components/ui/toaster';
import { companyService } from '@/services/company.service';
import { divisionService } from '@/services/division.service';
import { apiPost, apiPatch, apiDelete } from '@/lib/api-client';
import { useEmployee } from '@/services/employee.service';

// --- Type Definitions ---
type NodeType = 'COMPANY' | 'FACTORY' | 'DIVISION' | 'DEPARTMENT' | 'SECTION';
type ActionType = 'ADD' | 'EDIT' | 'DELETE' | 'ISOLATE' | 'HIDE' | 'DISCONNECT';

interface SheetState {
    open: boolean;
    action: ActionType;
    nodeId: string;  // Raw ID of the node e.g. "company-uuid", "division-uuid"
    nodeType: NodeType;
    parentType?: NodeType;
    parentId?: string;
}

// Mapping of what child types can be created per parent type
const childTypeMap: Record<NodeType, NodeType[]> = {
    COMPANY: ['FACTORY', 'DIVISION', 'DEPARTMENT'],
    FACTORY: ['DIVISION', 'DEPARTMENT'],
    DIVISION: ['DEPARTMENT'],
    DEPARTMENT: ['SECTION'],
    SECTION: [],
};

const typeLabels: Record<NodeType, string> = {
    COMPANY: 'Công ty',
    FACTORY: 'Nhà máy',
    DIVISION: 'Khối',
    DEPARTMENT: 'Phòng ban',
    SECTION: 'Bộ phận',
};

const typeApiMap: Record<NodeType, string> = {
    COMPANY: '/companies',
    FACTORY: '/factories',
    DIVISION: '/divisions',
    DEPARTMENT: '/departments',
    SECTION: '/sections',
};


export default function OrgChartPage() {
    const queryClient = useQueryClient();
    const router = useRouter();
    const [currentView, setCurrentView] = useState<'COMPANY' | 'DEPARTMENT'>('COMPANY');
    const [selectedDepartmentId, setSelectedDepartmentId] = useState<string | null>(null);

    // Read initial from URL on mount
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search);
            const deptId = params.get('dept');
            if (deptId) {
                setCurrentView('DEPARTMENT');
                setSelectedDepartmentId(deptId);
            }
        }
    }, []);

    // Helper to sync view state to URL without reloading
    const updateViewState = useCallback((view: 'COMPANY' | 'DEPARTMENT', deptId: string | null = null) => {
        setCurrentView(view);
        setSelectedDepartmentId(deptId);
        
        if (typeof window !== 'undefined') {
            const url = new URL(window.location.href);
            if (view === 'DEPARTMENT' && deptId) {
                url.searchParams.set('dept', deptId);
            } else {
                url.searchParams.delete('dept');
            }
            window.history.replaceState({}, '', url.toString());
        }
    }, []);

    // Compute chartKey based on which screen is currently shown
    const getChartKey = useCallback(() => {
        if (currentView === 'DEPARTMENT' && selectedDepartmentId) {
            const rawId = selectedDepartmentId;
            const deptId = rawId.startsWith('department-')
                ? rawId.slice('department-'.length)
                : rawId;
            return `DEPT-${deptId}`;
        }
        return 'COMPANY';
    }, [currentView, selectedDepartmentId]);

    const [selectedNode, setSelectedNode] = useState<any | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<{ nodeId: string; nodeType: NodeType; label: string } | null>(null);
    const [disconnectTarget, setDisconnectTarget] = useState<{ nodeId: string; nodeType: NodeType; label: string } | null>(null);
    const [layoutTrigger, setLayoutTrigger] = useState(0);
    const [refreshKey, setRefreshKey] = useState<number>(Date.now());

    // Phase 5: Locking & Employee Listing
    const [isLocked, setIsLocked] = useState(true);
    const canvasRef = useRef<{ getNodes: () => any[], getEdges: () => any[], focusNode: (nodeId: string) => void, getConfig: () => any, saveConfig: () => Promise<any> }>(null);

    // Phase 6: Search & Focus
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);

    const handleSearch = (query: string) => {
        setSearchQuery(query);
        if (!query.trim() || !currentData?.nodes) {
            setSearchResults([]);
            return;
        }

        const lowerQuery = query.toLowerCase();
        const filtered = currentData.nodes.filter((n: any) => 
            n.data?.label?.toLowerCase().includes(lowerQuery) || 
            n.data?.fullName?.toLowerCase().includes(lowerQuery) ||
            n.data?.code?.toLowerCase().includes(lowerQuery) ||
            n.data?.employeeCode?.toLowerCase().includes(lowerQuery)
        ).slice(0, 10); // Limit to 10 results

        setSearchResults(filtered);
    };

    const jumpToNode = (node: any) => {
        setSearchQuery('');
        setSearchResults([]);
        if (canvasRef.current) {
            canvasRef.current.focusNode(node.id);
        }
        setSelectedNode(node.data);
    };



    const [sheetState, setSheetState] = useState<SheetState>({
        open: false,
        action: 'ADD',
        nodeId: '',
        nodeType: 'DEPARTMENT',
    });

    // Quick form fields
    const [formName, setFormName] = useState('');
    const [formCode, setFormCode] = useState('');
    const [formNote, setFormNote] = useState('');
    const [addChildType, setAddChildType] = useState<NodeType>('DEPARTMENT');
    const [actionApiPath, setActionApiPath] = useState<string>('');

    // Parse raw node ID like "company-uuid" -> { type: 'COMPANY', id: 'uuid' }
    const parseNodeId = (rawId: string) => {
        // Find the first dash and return everything after it
        const dashIndex = rawId.indexOf('-');
        return dashIndex >= 0 ? rawId.slice(dashIndex + 1) : rawId;
    };

    // Determine the source table/API by the node ID prefix
    const getApiPathFromNodeId = (rawId: string): string => {
        if (rawId.startsWith('company-')) return '/companies';
        if (rawId.startsWith('factory-')) return '/factories';
        if (rawId.startsWith('division-')) return '/divisions';
        if (rawId.startsWith('department-')) return '/departments';
        if (rawId.startsWith('section-')) return '/sections';
        return '/departments'; // fallback
    };

    // Fetch departments directly for Combobox — independent of showOnOrgChart flag
    const { data: departmentsRaw } = useQuery({
        queryKey: ['org-chart', 'dept-combobox'],
        queryFn: async () => {
            const res = await apiClient.get('/organization', { params: { limit: 500, status: 'ACTIVE' } });
            return res.data;
        },
        staleTime: 60000, // 1 phút — refresh sau toggle showOnOrgChart
        refetchOnWindowFocus: true,
        placeholderData: (prev) => prev,
    });

    const departmentOptions = useMemo(() => {
        return (departmentsRaw?.data || []).sort((a: any, b: any) =>
            (a.name || '').localeCompare(b.name || '')
        );
    }, [departmentsRaw]);

    const comboboxOptions = useMemo(() => {
        const defaultOption = { value: 'all', label: '🏢 SUNPLAST' };
        if (!departmentOptions?.length) return [defaultOption];
        return [
            defaultOption,
            ...departmentOptions.map((opt: any) => ({
                value: opt.id,
                label: opt.name,
            }))
        ];
    }, [departmentOptions]);

    // Fetch Display Data depending on current view
    const { data: currentData, isLoading, refetch: refetchData } = useQuery({
        queryKey: ['org-chart', 'display-data', currentView, selectedDepartmentId],
        queryFn: async () => {
            if (currentView === 'DEPARTMENT' && selectedDepartmentId) {
                // Strip 'department-' prefix if present, otherwise use raw UUID
                const rawId = selectedDepartmentId;
                const deptId = rawId.startsWith('department-')
                    ? rawId.slice('department-'.length)
                    : rawId;
                const res = await apiClient.get(`/employees/org-chart/dept/${deptId}`);
                return res.data;
            }
            const res = await apiClient.get('/employees/org-chart/structure');
            return res.data;
        },
        staleTime: 30000, // 30 giây - tự refresh khi quay lại tab
        gcTime: 60000,
        refetchInterval: false,
        refetchOnWindowFocus: true,
        refetchOnReconnect: false,
        placeholderData: (prev) => prev,
    });

    // Fetch Global Config Data
    const { data: globalConfig, refetch: refetchConfig } = useQuery({
        queryKey: ['org-chart-config'],
        queryFn: async () => {
            const res = await apiClient.get('/organization/config/global');
            return res.data;
        },
        staleTime: Infinity,
        gcTime: Infinity,
        refetchInterval: false,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        placeholderData: (prev) => prev,
    });
    
    // Fetch full detail for Sidebar when an employee node is selected
    // ADDED GUARD: Only fetch if ID is a valid GUID/UUID (length > 30) and node is an employee (has fullName)
    const isValidEmployeeId = selectedNode?.id && selectedNode.id.length > 30 && (selectedNode.fullName || selectedNode.type === 'employee');
    const { data: fullEmployeeDetail, isLoading: isLoadingFullDetail } = useEmployee(
        isValidEmployeeId ? selectedNode.id : '',
        {
            staleTime: Infinity,
            gcTime: Infinity,
            refetchInterval: false,
            refetchOnWindowFocus: false,
            refetchOnReconnect: false,
            placeholderData: (prev: any) => prev,
        }
    );

     // Fetch Employees inside Selected Node
    const { data: nodeEmployees, isLoading: loadingEmployees } = useQuery({
        queryKey: ['org-chart', 'node-employees', selectedNode?.id, selectedNode?.type],
        queryFn: async () => {
            if (!selectedNode || selectedNode.fullName) return [];
            
            // Filter by organizational unit ID directly
            const typeKey = `${selectedNode.type?.toLowerCase()}Id`;
            const res = await apiClient.get('/employees', { 
                params: { [typeKey]: selectedNode.id, limit: 100 } 
            });
            return res.data?.data || [];
        },
        enabled: !!selectedNode && !selectedNode.fullName && currentView === 'COMPANY',
        staleTime: Infinity,
        gcTime: Infinity,
        refetchInterval: false,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        placeholderData: (prev) => prev,
    });

    // Handle Context Menu Actions from Node
    const handleActionTrigger = useCallback((action: ActionType, rawNodeId: string, rawNodeType: string) => {
        const nodeType = rawNodeType as NodeType;
        const parsedId = parseNodeId(rawNodeId);


        if (action === 'DISCONNECT') {
            const nodeInData = currentData?.nodes?.find((n: any) => n.id === rawNodeId);
            const label = nodeInData?.data?.label || nodeType;
            setDisconnectTarget({ nodeId: rawNodeId, nodeType, label });
            return;
        }

        if (action === 'DELETE') {
            // Get node label from current data
            const nodeInData = currentData?.nodes?.find((n: any) => n.id === rawNodeId);
            const label = nodeInData?.data?.label || nodeType;
            setActionApiPath(getApiPathFromNodeId(rawNodeId));
            setDeleteTarget({ nodeId: parsedId, nodeType, label });
            return;
        }

        if (action === 'ADD') {
            const possibleChildren = childTypeMap[nodeType] || [];
            const defaultChild = possibleChildren[0] || 'DEPARTMENT' as NodeType;
            setAddChildType(defaultChild);
            setFormName('');
            setFormCode('');
            setFormNote('');
            setActionApiPath(''); // Add will determine path based on addChildType
            setSheetState({
                open: true,
                action: 'ADD',
                nodeId: rawNodeId,
                nodeType: nodeType,
                parentId: parsedId,
                parentType: nodeType,
            });
        }

        if (action === 'EDIT') {
            const nodeInData = currentData?.nodes?.find((n: any) => n.id === rawNodeId);
            setFormName(nodeInData?.data?.label || '');
            setFormCode(nodeInData?.data?.code || '');
            setFormNote('');
            setActionApiPath(getApiPathFromNodeId(rawNodeId));
            setSheetState({
                open: true,
                action: 'EDIT',
                nodeId: rawNodeId,
                nodeType: nodeType,
                parentId: parsedId,
            });
        }
    }, [currentData]);

    const handleSubmit = async () => {
        if (!formName.trim() || !formCode.trim()) {
            toast.error('Vui lòng nhập đầy đủ Mã và Tên đơn vị.');
            return;
        }

        setIsSubmitting(true);
        try {
            const { action, nodeType, parentId } = sheetState;

            if (action === 'ADD') {
                const targetType = addChildType;
                const apiPath = typeApiMap[targetType];
                const payload: Record<string, any> = {
                    code: formCode.trim(),
                    name: formName.trim(),
                    note: formNote.trim() || undefined,
                };

                // Map parent ID into payload based on child type
                if (targetType === 'FACTORY') payload.companyId = parentId;
                else if (targetType === 'DIVISION') {
                    if (nodeType === 'FACTORY') payload.factoryId = parentId;
                    else if (nodeType === 'COMPANY') payload.companyId = parentId;
                }
                else if (targetType === 'DEPARTMENT') {
                    if (nodeType === 'DIVISION') payload.divisionId = parentId;
                    else if (nodeType === 'FACTORY') payload.factoryId = parentId;
                    else if (nodeType === 'COMPANY') payload.companyId = parentId;
                }
                else if (targetType === 'SECTION') {
                    payload.departmentId = parentId;
                }

                await apiPost(apiPath, payload);
                toast.success(`Thêm ${typeLabels[targetType]} thành công!`);
            } else if (action === 'EDIT') {
                const apiPath = actionApiPath || typeApiMap[nodeType];
                await apiPatch(`${apiPath}/${parentId}`, {
                    name: formName.trim(),
                    note: formNote.trim() || undefined,
                });
                toast.success(`Cập nhật ${typeLabels[nodeType]} thành công!`);
            }

            setSheetState(prev => ({ ...prev, open: false }));
            refetchData();
            queryClient.invalidateQueries({ queryKey: ['org-chart'] });
        } catch (err: any) {
            toast.error(err?.message || 'Đã xảy ra lỗi khi lưu dữ liệu.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;
        setIsSubmitting(true);
        try {
            const { nodeId, nodeType } = deleteTarget;
            const apiPath = actionApiPath || typeApiMap[nodeType];
            await apiDelete(`${apiPath}/${nodeId}`);
            toast.success(`Đã xóa ${typeLabels[nodeType]} thành công!`);
            refetchData();
            queryClient.invalidateQueries({ queryKey: ['org-chart'] });
        } catch (err: any) {
            toast.error(err?.message || 'Không thể xóa đơn vị này.');
        } finally {
            setIsSubmitting(false);
            setDeleteTarget(null);
        }
    };

    const handleDisconnect = async () => {
        if (!disconnectTarget) return;
        setIsSubmitting(true);
        try {
            const { nodeId } = disconnectTarget;
            await apiPatch('/all/move/node', {
                sourceId: nodeId,
                targetId: null
            });
            toast.success('Đã ngắt kết nối đơn vị thành công!');
            refetchData();
            queryClient.invalidateQueries({ queryKey: ['org-chart'] });
        } catch (err: any) {
            toast.error(err?.message || 'Không thể ngắt kết nối đơn vị này.');
        } finally {
            setIsSubmitting(false);
            setDisconnectTarget(null);
        }
    };

    const handleEdgeDrop = async (sourceId: string, targetId: string) => {
        // Trong ReactFlow khi nối dây từ trên xuống:
        // sourceId = Parent Node ID
        // targetId = Child Node ID (Node bị di chuyển)
        // API move/node yêu cầu:
        // body.sourceId = Node bị di chuyển
        // body.targetId = Chỗ đến mới (Parent mới)

        setIsSubmitting(true);
        const toastId = toast.loading('Đang cập nhật sơ đồ...');
        try {
            await apiPost('/organization/move', {
                sourceId: targetId, // Đứa con bị bế đi
                targetId: sourceId  // Nhận ông bố mới
            });
            toast.success('Đã cập nhật cấu trúc đơn vị thành công!', { id: toastId });
            refetchData();
            queryClient.invalidateQueries({ queryKey: ['org-chart'] });
        } catch (error: any) {
            toast.error(error.message || 'Lỗi nối dây không hợp lệ', { id: toastId });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleSaveLayout = async (nodes: any[], configPayload?: any) => {
        setIsSubmitting(true);
        const toastId = toast.loading('Đang lưu bố cục sơ đồ...');
        try {
            const chartKey = getChartKey();
            const positions = nodes
                .map(n => ({
                    nodeId: n.id,
                    x: Math.round(n.position.x),
                    y: Math.round(n.position.y)
                }));
            
            // Collect edge waypoints from canvas
            const currentEdges = canvasRef.current?.getEdges?.() || [];
            const edgeWaypoints = currentEdges
                .filter((e: any) => e.data?.waypoints?.length > 0)
                .map((e: any) => ({
                    edgeId: e.id,
                    waypoints: e.data.waypoints,
                }));

            await Promise.all([
                positions.length > 0 ? apiPost('/organization/positions/bulk', { chartKey, positions }) : Promise.resolve(),
                edgeWaypoints.length > 0 ? apiPost('/organization/edge-waypoints', { chartKey, edges: edgeWaypoints }) : Promise.resolve(),
                canvasRef.current?.saveConfig ? canvasRef.current.saveConfig() : (configPayload ? apiPatch('/organization/config/global', configPayload) : Promise.resolve())
            ]);
            
            toast.success('Bố cục đã được lưu thành công!', { id: toastId });
            refetchData();
            refetchConfig();
        } catch (error: any) {
            toast.error(error.message || 'Lỗi khi lưu bố cục', { id: toastId });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handlePositionChange = async (nodeId: string, x: number, y: number) => {
        try {
            const chartKey = getChartKey();
            await apiPatch('/organization/position', { chartKey, nodeId, x, y });
        } catch (error) {
            console.error('Failed to save node position', error);
        }
    };

    return (
        <div className="flex flex-col h-[calc(100vh-0rem)] bg-background overflow-hidden">
            {/* Simplified Toolbar */}
            <div className="bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-sm px-3 py-1.5 flex flex-wrap items-center justify-between gap-3 z-20 shrink-0">
                <div className="flex items-center gap-2 px-2">
                    <div className="h-8 w-8 rounded-lg flex items-center justify-center bg-gradient-to-br from-teal-500 to-emerald-700 shadow-sm mr-1">
                        <Network className="h-4 w-4 text-white" />
                    </div>
                    <span className="font-bold text-slate-800 tracking-tight hidden lg:inline">SƠ ĐỒ TỔ CHỨC</span>

                    {/* Department Navigation Combobox & Back Button */}
                    <div className="flex items-center gap-2">
                        {currentView === 'DEPARTMENT' && (
                            <Button 
                                variant="outline" 
                                size="sm" 
                                className="h-8 gap-1.5 rounded-md border-slate-200 hover:bg-slate-100 text-slate-700 font-medium px-2.5 transition-all shadow-sm"
                                onClick={() => {
                                    updateViewState('COMPANY');
                                    if (canvasRef.current) setTimeout(() => canvasRef.current?.focusNode('company-1'), 100);
                                }}
                            >
                                <ArrowLeft className="w-3.5 h-3.5" />
                                <span className="text-xs">Trở về</span>
                            </Button>
                        )}
                        
                        <Combobox 
                            options={comboboxOptions}
                            value={selectedDepartmentId || 'all'}
                            onValueChange={(val) => {
                                if (val === 'all') {
                                    updateViewState('COMPANY');
                                } else {
                                    updateViewState('DEPARTMENT', val);
                                }
                            }}
                            placeholder="Sơ đồ tổ chức"
                            searchPlaceholder="Tìm kiếm nhanh..."
                            emptyText="Không tìm thấy phòng ban."
                            className="h-8 w-[280px] bg-white border-slate-200/60 shadow-sm rounded-md text-xs font-semibold text-slate-700"
                            listClassName="text-xs font-medium"
                        />
                    </div>
                </div>

                <div className="flex flex-1 items-center justify-end gap-2 max-w-5xl">
                    <div className="flex items-center gap-1.5 bg-slate-50 p-1 rounded-lg border border-slate-200/50">
                        <Button
                            variant="outline"
                            size="sm"
                            className={cn(
                                    "h-8 gap-2 rounded-md transition-all font-medium whitespace-nowrap px-3",
                                    isLocked 
                                        ? "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50" 
                                        : "text-blue-600 bg-blue-50 hover:bg-blue-100 hover:text-blue-700 shadow-sm border border-blue-100"
                                )}
                                onClick={() => setIsLocked(!isLocked)}
                            >
                                {isLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                                <span className="text-xs">{isLocked ? 'Đã khóa' : 'Chỉnh sửa'}</span>
                        </Button>
                        
                        {!isLocked && (
                            <Button
                                variant="default"
                                size="sm"
                                className="h-8 gap-2 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-all px-3"
                                onClick={() => {
                                    const currentNodes = canvasRef.current?.getNodes();
                                    const configPayload = canvasRef.current?.getConfig ? canvasRef.current.getConfig() : null;
                                    if (currentNodes) handleSaveLayout(currentNodes, configPayload);
                                }}
                            >
                                <Save className="w-3.5 h-3.5" />
                                <span className="text-xs">Lưu toàn bộ bố cục</span>
                            </Button>
                        )}

                        {/* Nút Làm mới đã bị xóa theo yêu cầu UX/UI */}

                        {!isLocked && (
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 px-2 rounded-md flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-200/50 transition-all gap-1.5"
                                onClick={() => setLayoutTrigger(prev => prev + 1)}
                                title="Tự động xếp lại sơ đồ"
                            >
                                <LayoutTemplate className="w-3.5 h-3.5 text-blue-500" />
                                <span className="text-xs">Căn chỉnh</span>
                            </Button>
                        )}
                    </div>

                    {/* Export button — always visible */}
                    <OrgChartExport chartTitle={currentView === 'COMPANY' ? 'Sơ_đồ_công_ty' : 'Sơ_đồ_phòng_ban'} />

                    {/* Compact Search Bar */}
                    <div className="relative group flex-1 max-w-[320px]">
                        <div className="flex items-center gap-2 bg-slate-100/80 px-2.5 h-8 rounded-lg border border-slate-200/50 hover:bg-white hover:border-blue-400 focus-within:bg-white focus-within:border-blue-500 transition-all">
                            <Search className="w-3.5 h-3.5 text-slate-400" />
                            <Input 
                                placeholder="Tìm kiếm nhanh..." 
                                className="h-6 p-0 border-none bg-transparent focus-visible:ring-0 text-xs placeholder:text-slate-400 w-full"
                                value={searchQuery}
                                onChange={(e) => handleSearch(e.target.value)}
                            />
                            {searchQuery && (
                                <X className="w-3 h-3 text-slate-400 hover:text-slate-600 cursor-pointer" onClick={() => handleSearch('')} />
                            )}
                        </div>

                        {/* Search Results Dropdown */}
                        {searchResults.length > 0 && (
                            <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-1 duration-200">
                                <div className="p-1.5 bg-slate-50/80 border-b flex items-center justify-between">
                                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest px-1">Kết quả ({searchResults.length})</span>
                                </div>
                                <div className="max-h-[280px] overflow-y-auto p-1 custom-scrollbar">
                                    {searchResults.map((node) => (
                                        <div 
                                            key={node.id} 
                                            className="flex items-center gap-2.5 p-1.5 rounded-lg hover:bg-blue-50/50 cursor-pointer transition-colors group"
                                            onClick={() => jumpToNode(node)}
                                        >
                                            <div className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 ${node.type === 'employeeNode' ? 'bg-blue-50 text-blue-600' : 'bg-slate-100 text-slate-600'}`}>
                                                {node.type === 'employeeNode' ? <Users className="w-3.5 h-3.5" /> : <Building2 className="w-3.5 h-3.5" />}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs font-bold text-slate-800 truncate leading-tight">{node.data?.fullName || node.data?.label}</p>
                                                <p className="text-[9px] text-slate-500 font-medium truncate uppercase tracking-tighter mt-0.5">
                                                    {node.data?.jobTitle || node.data?.code || typeLabels[node.data?.type as NodeType]}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>


            {/* Canvas Area */}
            <div className="flex-1 flex gap-0 overflow-hidden">
                <Card className="flex-1 overflow-hidden flex flex-col shadow-none border-none rounded-xl relative h-full bg-white">
                    <OrgChartCanvas
                        ref={canvasRef}
                        apiData={currentData}
                        globalConfig={globalConfig}
                        isLoading={isLoading}
                        onNodeClick={setSelectedNode}
                        onNodeDoubleClick={(node) => {
                            if (['FACTORY', 'DIVISION', 'DEPARTMENT', 'SECTION'].includes(node.data?.type)) {
                                updateViewState('DEPARTMENT', node.id);
                            }
                        }}
                        onActionTrigger={handleActionTrigger}
                        onEdgeDrop={handleEdgeDrop}
                        isLocked={isLocked}
                        layoutTrigger={layoutTrigger}
                        onNodePositionChange={handlePositionChange}
                        refreshKey={refreshKey}
                        onOverridesChange={() => {
                            refetchData();
                            queryClient.invalidateQueries({ queryKey: ['org-chart'] });
                        }}
                    />
                </Card>

                {/* Sidebar Details */}
                {selectedNode && (
                    <Card className="w-80 flex-shrink-0 flex flex-col h-full overflow-y-auto animate-in slide-in-from-right-8 duration-300">
                        <CardHeader className="flex flex-row items-center justify-between border-b px-4 py-3 sticky top-0 bg-white z-10">
                            <CardTitle className="text-base">Thông tin chi tiết</CardTitle>
                            <Button variant="ghost" size="icon" onClick={() => setSelectedNode(null)}>
                                <X className="h-4 w-4" />
                            </Button>
                        </CardHeader>
                        <CardContent className="p-4 flex flex-col gap-4">
                            {selectedNode.fullName ? (
                                <>
                                    <div className="flex flex-col items-center gap-3 text-center border-b pb-4">
                                        <Avatar className="h-20 w-20 border-2 shadow-sm">
                                            <AvatarImage src={getAvatarVariant(selectedNode.avatar, "thumb")} alt={selectedNode.fullName} className="object-cover" />
                                            <AvatarFallback className="text-xl bg-slate-100">{selectedNode.fullName?.charAt(0) || 'U'}</AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <h3 className="font-semibold text-lg">{selectedNode.fullName}</h3>
                                            <p className="text-sm text-blue-600 font-medium">{selectedNode.jobTitle}</p>
                                        </div>
                                    </div>

                                    <div className="space-y-3 mt-2 text-sm text-slate-700 relative">
                                        {isLoadingFullDetail && (
                                            <div className="absolute inset-0 bg-white/50 backdrop-blur-[1px] z-10 flex items-center justify-center">
                                                <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
                                            </div>
                                        )}
                                        <div className="flex items-start gap-3">
                                            <Briefcase className="w-4 h-4 text-slate-400 mt-0.5" />
                                            <div>
                                                <p className="text-xs text-slate-500">Phòng ban</p>
                                                <p className="font-medium">{selectedNode.department}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-start gap-3">
                                            <Mail className="w-4 h-4 text-slate-400 mt-0.5" />
                                            <div>
                                                <p className="text-xs text-slate-500">Email</p>
                                                <p className="font-medium">{(fullEmployeeDetail as any)?.emailCompany || (isLoadingFullDetail ? '---' : 'Chưa cập nhật')}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-start gap-3">
                                            <Phone className="w-4 h-4 text-slate-400 mt-0.5" />
                                            <div>
                                                <p className="text-xs text-slate-500">Số điện thoại</p>
                                                <p className="font-medium">{(fullEmployeeDetail as any)?.phone || (isLoadingFullDetail ? '---' : 'Chưa cập nhật')}</p>
                                            </div>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="flex flex-col items-center gap-3 text-center border-b pb-4">
                                        <div className="p-3 bg-slate-100 rounded-full">
                                            <Building2 className="w-8 h-8 text-blue-600" />
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-lg">{selectedNode.label}</h3>
                                            <p className="text-sm text-slate-500 uppercase">{typeLabels[selectedNode.type as NodeType] || selectedNode.type}</p>
                                        </div>
                                    </div>
                                    <div className="space-y-3 mt-2 text-sm text-slate-700">
                                        <div className="flex items-start gap-3">
                                            <MapPin className="w-4 h-4 text-slate-400 mt-0.5" />
                                            <div>
                                                <p className="text-xs text-slate-500">Mã Đơn Vị</p>
                                                <p className="font-medium">{selectedNode.code || 'N/A'}</p>
                                            </div>
                                        </div>
                                    </div>
                                    {/* Employee List Section */}
                                    {currentView === 'COMPANY' && (
                                        <div className="pt-4 border-t mt-4 flex-1 overflow-hidden flex flex-col">
                                            <h4 className="font-semibold text-sm mb-3 text-slate-800 flex items-center justify-between shrink-0">
                                                <span>{selectedNode.managerEmployeeId ? 'Nhân sự trực thuộc quản lý' : 'Danh sách nhân sự'}</span>
                                                <Badge variant="secondary" className="bg-blue-50 text-blue-700">
                                                    {loadingEmployees ? <Loader2 className="w-3 h-3 animate-spin" /> : nodeEmployees?.length || 0}
                                                </Badge>
                                            </h4>

                                            <div className="space-y-3 overflow-y-auto pr-2 custom-scrollbar flex-1 pb-4">
                                                {loadingEmployees ? (
                                                    <div className="flex justify-center py-4">
                                                        <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
                                                    </div>
                                                ) : nodeEmployees && nodeEmployees.length > 0 ? (
                                                    nodeEmployees.map((emp: any) => (
                                                        <div key={emp.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-colors">
                                                            <Avatar className="h-8 w-8 shrink-0">
                                                                <AvatarImage src={getAvatarVariant(emp.avatar, "thumb")} alt={emp.fullName} />
                                                                <AvatarFallback className="text-xs bg-slate-200 text-slate-600">{emp.fullName?.charAt(0) || 'U'}</AvatarFallback>
                                                            </Avatar>
                                                            <div className="flex-1 min-w-0">
                                                                <p className="text-sm font-medium text-slate-900 truncate">{emp.fullName}</p>
                                                                <p className="text-xs text-slate-500 truncate">{emp.jobTitle?.name || 'Nhân viên'}</p>
                                                            </div>
                                                        </div>
                                                    ))
                                                ) : (
                                                    <p className="text-sm text-center text-slate-500 py-6 bg-slate-50 rounded-lg border border-dashed border-slate-200">
                                                        Chưa có nhân viên nào
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}
                        </CardContent>
                    </Card>
                )}
            </div>

            {/* Quick Edit/Add Sheet */}
            <Sheet open={sheetState.open} onOpenChange={(open) => setSheetState(prev => ({ ...prev, open }))}>
                <SheetContent className="w-[420px] sm:w-[500px] overflow-y-auto">
                    <SheetHeader className="pb-4 border-b">
                        <SheetTitle className="text-lg">
                            {sheetState.action === 'ADD' ? (
                                `Thêm đơn vị trực thuộc ${typeLabels[sheetState.nodeType]}`
                            ) : (
                                `Chỉnh sửa ${typeLabels[sheetState.nodeType]}`
                            )}
                        </SheetTitle>
                        <SheetDescription>
                            {sheetState.action === 'ADD'
                                ? 'Tạo mới một đơn vị con bên dưới đơn vị hiện tại.'
                                : 'Cập nhật thông tin của đơn vị tổ chức này.'}
                        </SheetDescription>
                    </SheetHeader>

                    <div className="space-y-5 pt-5">
                        {/* If ADD: show child type selector */}
                        {sheetState.action === 'ADD' && (() => {
                            const possible = childTypeMap[sheetState.nodeType] || [];
                            return possible.length > 1 ? (
                                <div className="space-y-2">
                                    <Label>Loại đơn vị con</Label>
                                    <Select value={addChildType} onValueChange={(v) => setAddChildType(v as NodeType)}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Chọn loại đơn vị" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {possible.map(t => (
                                                <SelectItem key={t} value={t}>{typeLabels[t]}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            ) : possible.length === 1 ? (
                                <div className="flex items-center gap-2 text-sm text-slate-600 bg-slate-50 border rounded-lg px-3 py-2">
                                    <Building2 className="w-4 h-4 text-blue-500" />
                                    <span>Tạo mới <strong>{typeLabels[possible[0]]}</strong></span>
                                </div>
                            ) : (
                                <div className="flex items-center gap-2 text-sm text-orange-600 bg-orange-50 border border-orange-200 rounded-lg px-3 py-2">
                                    <AlertTriangle className="w-4 h-4" />
                                    <span>Đơn vị này không thể có đơn vị con.</span>
                                </div>
                            );
                        })()}

                        <div className="space-y-2">
                            <Label htmlFor="unit-code">Mã đơn vị <span className="text-red-500">*</span></Label>
                            <Input
                                id="unit-code"
                                placeholder="VD: PB001"
                                value={formCode}
                                onChange={(e) => setFormCode(e.target.value)}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="unit-name">Tên đơn vị <span className="text-red-500">*</span></Label>
                            <Input
                                id="unit-name"
                                placeholder="VD: Phòng Kế toán"
                                value={formName}
                                onChange={(e) => setFormName(e.target.value)}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="unit-note">Ghi chú</Label>
                            <Input
                                id="unit-note"
                                placeholder="Thông tin bổ sung (tùy chọn)"
                                value={formNote}
                                onChange={(e) => setFormNote(e.target.value)}
                            />
                        </div>

                        <div className="flex gap-3 pt-4 border-t">
                            <Button
                                variant="outline"
                                className="flex-1"
                                onClick={() => setSheetState(prev => ({ ...prev, open: false }))}
                                disabled={isSubmitting}
                            >
                                Hủy
                            </Button>
                            <Button
                                className="flex-1 bg-blue-600 hover:bg-blue-700"
                                onClick={handleSubmit}
                                disabled={isSubmitting || (sheetState.action === 'ADD' && (childTypeMap[sheetState.nodeType] || []).length === 0)}
                            >
                                {isSubmitting ? (
                                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Đang lưu...</>
                                ) : sheetState.action === 'ADD' ? 'Thêm Đơn vị' : 'Lưu thay đổi'}
                            </Button>
                        </div>
                    </div>
                </SheetContent>
            </Sheet>

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Xác nhận xóa đơn vị</AlertDialogTitle>
                        <AlertDialogDescription>
                            Bạn có chắc muốn xóa <strong>{deleteTarget?.label}</strong>
                            {' '}({deleteTarget?.nodeType && typeLabels[deleteTarget.nodeType]}) không?
                            <br />
                            Thao tác này sẽ chuyển đơn vị vào Thùng rác (có thể khôi phục).
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isSubmitting}>Hủy</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDelete}
                            className="bg-red-600 hover:bg-red-700 text-white"
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Xác nhận Xóa'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Disconnect Confirmation Dialog */}
            <AlertDialog open={!!disconnectTarget} onOpenChange={(open) => !open && setDisconnectTarget(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Xác nhận tách / ngắt kết nối nhánh</AlertDialogTitle>
                        <AlertDialogDescription>
                            Bạn có chắc muốn tách <strong>{disconnectTarget?.label}</strong>
                            {' '}({disconnectTarget?.nodeType && typeLabels[disconnectTarget.nodeType]}) khỏi đơn vị cấp trên hiện tại không?
                            <br />
                            Nhánh này sẽ được hiển thị độc lập trên cùng của sơ đồ.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isSubmitting}>Hủy</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDisconnect}
                            className="bg-blue-600 hover:bg-blue-700 text-white"
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Xác nhận Tách nhánh'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
