'use client';
import { useCallback, useEffect, useState, useMemo, forwardRef, useImperativeHandle, useRef } from 'react';
import {
    ReactFlow,
    Controls,
    Background,
    MiniMap,
    useNodesState,
    useEdgesState,
    Node,
    Edge,
    Panel,
    Position,
    MarkerType,
    useViewport,
    useReactFlow,
    ReactFlowProvider,
    ConnectionLineType,
    reconnectEdge,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Loader2, GripVertical, LayoutList, Ruler, Edit3, Save, Users, Building2, Briefcase, GitBranch, Image as ImageIcon, ShieldAlert, Info, Waypoints, History } from 'lucide-react';
import { Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { apiClient } from '@/lib/api-client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
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
import StructureNode from './custom-nodes/structure-node';
import EmployeeNode from './custom-nodes/employee-node';
import SpacingEdge from './custom-edges/spacing-edge';
import EditableEdge from './custom-edges/editable-edge';
import AutoRoutedEdge from './custom-edges/auto-routed-edge';
import { useElkEdgeRouting, type ElkPoint } from './hooks/use-elk-edge-routing';
import VersionHistoryPanel from './version-history-panel';
import NodeSpacingGuides from './node-spacing-guides';
import {
    treeLayout,
    getDescendantIds,
    computeEmployeeLevelMap,
    getEdgeStyle as computeEdgeStyle,
    defaultNodeColors,
    gradientPresets as importedGradientPresets,
    NODE_W,
    NODE_H,
    H_GAP,
    type LayoutOptions,
} from './hooks/use-org-chart-layout';

const nodeTypes = { orgNode: StructureNode, employeeNode: EmployeeNode };
const edgeTypes = { spacingEdge: SpacingEdge, editableEdge: EditableEdge, autoRoutedEdge: AutoRoutedEdge };
const fitViewOptions = { maxZoom: 1.2, minZoom: 0.3, padding: 0.15 };

interface OrgChartCanvasProps {
    apiData: { nodes: any[]; edges: any[]; departmentInfo?: any; immediateParentId?: string | null; config?: any; hiddenNodes?: Array<{id: string; fullName: string; jobTitle: string}> } | null;
    isLoading: boolean;
    onNodeClick?: (node: any) => void;
    onNodeDoubleClick?: (node: any) => void;
    onActionTrigger?: (action: any, nodeId: string, nodeType: string) => void;
    onEdgeDrop?: (sourceId: string, targetId: string) => Promise<void>;
    isLocked?: boolean;
    layoutTrigger?: number;
    globalConfig?: any;
    onNodePositionChange?: (nodeId: string, x: number, y: number) => void;
    refreshKey?: number;
    onOverridesChange?: () => void;
}

const OrgChartCanvasInner = ({
    apiData, isLoading, onNodeClick, onNodeDoubleClick, onActionTrigger,
    isLocked = true, layoutTrigger = 0, globalConfig, onNodePositionChange, canvasRef, refreshKey, onOverridesChange
}: OrgChartCanvasProps & { canvasRef: any }) => {
    const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
    const { fitView, setViewport, getViewport } = useReactFlow();
    const { x, y, zoom } = useViewport();

    useImperativeHandle(canvasRef, () => ({
        getNodes: () => nodes,
        getEdges: () => edges,
        focusNode: (nodeId: string) => {
            const node = nodes.find(n => n.id === nodeId);
            if (node) fitView({ nodes: [node], duration: 800, padding: 0.4, minZoom: 0.8 });
        },
        getConfig: () => ({ nodesep, ranksep, zoom, nodeDims, nodeColors, nodeLevels }),
        saveConfig: () => {
            const chartKey = apiData?.departmentInfo ? `DEPT-${apiData.departmentInfo.id}` : 'global-config';
            return apiClient.post(`/employees/org-chart/config/${chartKey}`, { nodesep, ranksep, zoom, nodeDims, nodeColors, nodeLevels });
        }
    }));

    const [layoutDirection, setLayoutDirection] = useState<'RIGHT' | 'DOWN'>('DOWN');
    const [isInitialized, setIsInitialized] = useState(false);
    const [collapsedNodeIds, setCollapsedNodeIds] = useState<Set<string>>(new Set());
    const [miniMapPosition, setMiniMapPosition] = useState({ bottom: 16, left: 16 });
    const [isDraggingMiniMap, setIsDraggingMiniMap] = useState(false);
    const [dragStart, setDragStart] = useState({ mouseX: 0, mouseY: 0, startBottom: 16, startLeft: 16 });

    const isDesignMode = !isLocked;
    const [hiddenNodeIds, setHiddenNodeIds] = useState<Set<string>>(new Set());
    const [customEdges, setCustomEdges] = useState<any[]>([]);

    // ─── Auto Edge Routing (ELK Hybrid) ───────────────────────────
    const [autoRouting, setAutoRouting] = useState(true);
    const { routeEdges, isRouting: isElkRouting, lastRoutingTimeMs } = useElkEdgeRouting({ enabled: autoRouting });
    const elkBendPointsRef = useRef<Map<string, ElkPoint[]>>(new Map());

    // ─── Version History Panel ────────────────────────────────────
    const [versionPanelOpen, setVersionPanelOpen] = useState(false);

    const [gatekeeperOpen, setGatekeeperOpen] = useState(false);
    const [gatekeeperConn, setGatekeeperConn] = useState<{
        source: string, 
        target: string, 
        sourceLabel: string, 
        targetLabel: string, 
        targetType: string,
        sourceHandle?: string | null,
        targetHandle?: string | null,
        isMatrixHint?: boolean,
        rawSourceNode?: Node,
        rawTargetNode?: Node
    } | null>(null);
    const [edgeToDelete, setEdgeToDelete] = useState<Edge | null>(null);
    const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

    // Undo/Redo history — captures both node positions and edge waypoints
    type UndoSnapshot = {
        nodes: { id: string; x: number; y: number }[];
        edgeWaypoints: { id: string; waypoints: { x: number; y: number }[] }[];
    };
    const undoStackRef = useRef<UndoSnapshot[]>([]);
    const redoStackRef = useRef<UndoSnapshot[]>([]);
    const pushUndoSnapshot = useCallback(() => {
        const snapshot: UndoSnapshot = {
            nodes: nodes.map(n => ({ id: n.id, x: n.position.x, y: n.position.y })),
            edgeWaypoints: edges
                .filter(e => (e.data as any)?.waypoints?.length > 0)
                .map(e => ({ id: e.id, waypoints: [...(e.data as any).waypoints] })),
        };
        undoStackRef.current.push(snapshot);
        if (undoStackRef.current.length > 50) undoStackRef.current.shift();
        redoStackRef.current = [];
    }, [nodes, edges]);

    const restoreSnapshot = useCallback((snapshot: UndoSnapshot) => {
        setNodes(nds => nds.map(n => {
            const saved = snapshot.nodes.find(s => s.id === n.id);
            return saved ? { ...n, position: { x: saved.x, y: saved.y } } : n;
        }));
        // Restore edge waypoints
        const wpMap = new Map(snapshot.edgeWaypoints.map(ew => [ew.id, ew.waypoints]));
        setEdges(eds => eds.map(e => {
            const savedWp = wpMap.get(e.id);
            if (savedWp !== undefined) {
                return { ...e, data: { ...(e.data || {}), waypoints: savedWp } };
            }
            return e;
        }));
    }, [setNodes, setEdges]);

    const undo = useCallback(() => {
        if (undoStackRef.current.length === 0) return;
        const currentSnapshot: UndoSnapshot = {
            nodes: nodes.map(n => ({ id: n.id, x: n.position.x, y: n.position.y })),
            edgeWaypoints: edges
                .filter(e => (e.data as any)?.waypoints?.length > 0)
                .map(e => ({ id: e.id, waypoints: [...(e.data as any).waypoints] })),
        };
        redoStackRef.current.push(currentSnapshot);
        const prev = undoStackRef.current.pop()!;
        restoreSnapshot(prev);
    }, [nodes, edges, restoreSnapshot]);

    const redo = useCallback(() => {
        if (redoStackRef.current.length === 0) return;
        const currentSnapshot: UndoSnapshot = {
            nodes: nodes.map(n => ({ id: n.id, x: n.position.x, y: n.position.y })),
            edgeWaypoints: edges
                .filter(e => (e.data as any)?.waypoints?.length > 0)
                .map(e => ({ id: e.id, waypoints: [...(e.data as any).waypoints] })),
        };
        undoStackRef.current.push(currentSnapshot);
        const next = redoStackRef.current.pop()!;
        restoreSnapshot(next);
    }, [nodes, edges, restoreSnapshot]);

    // Keyboard shortcuts: Ctrl+Z / Ctrl+Y
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (isLocked && !isDesignMode) return;
            if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
                e.preventDefault();
                undo();
            }
            if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
                e.preventDefault();
                redo();
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [undo, redo, isLocked, isDesignMode]);

    // Listen for waypoint change events from EditableEdge to push undo snapshots
    useEffect(() => {
        const handler = () => pushUndoSnapshot();
        window.addEventListener('orgchart:before-waypoint-change', handler);
        return () => window.removeEventListener('orgchart:before-waypoint-change', handler);
    }, [pushUndoSnapshot]);

    const [nodesep, setNodesep] = useState(50);
    const [ranksep, setRanksep] = useState(120);
    const [prevNodesep, setPrevNodesep] = useState(50);
    const [prevRanksep, setPrevRanksep] = useState(120);
    const [prevLayoutTrigger, setPrevLayoutTrigger] = useState(0);

    const defaultNodeDims: Record<string, { w: number, h: number }> = {
        COMPANY: { w: 272, h: 210 },
        FACTORY: { w: 272, h: 210 },
        DIVISION: { w: 272, h: 210 },
        DEPARTMENT: { w: 272, h: 210 },
        SECTION: { w: 260, h: 80 },
        EMPLOYEE: { w: 254, h: 220 },
    };
    const [nodeDims, setNodeDims] = useState<Record<string, { w: number, h: number }>>(defaultNodeDims);
    const prevNodeDimsRef = useRef(nodeDims);
    const [editingDimType, setEditingDimType] = useState<string>('DIVISION');

    // ─── Color customization per node type ───────────────────────────────────
    const defaultColors: Record<string, { bg: string; text: string; border: string }> = {
        COMPANY:    { bg: 'linear-gradient(135deg,#0f172a 0%,#1e3a5f 60%,#1e293b 100%)', text: '#ffffff', border: 'rgba(255,255,255,0.12)' },
        FACTORY:    { bg: 'linear-gradient(135deg,#1e3a8a 0%,#2563eb 50%,#3b82f6 100%)', text: '#ffffff', border: 'rgba(255,255,255,0.12)' },
        DIVISION:   { bg: 'linear-gradient(135deg,#115e59 0%,#0d9488 50%,#14b8a6 100%)', text: '#ffffff', border: 'rgba(255,255,255,0.12)' },
        DEPARTMENT: { bg: 'linear-gradient(135deg,#14532d 0%,#16a34a 50%,#22c55e 100%)', text: '#ffffff', border: 'rgba(255,255,255,0.12)' },
        SECTION:    { bg: 'linear-gradient(135deg,#0c4a6e 0%,#0284c7 50%,#0ea5e9 100%)', text: '#ffffff', border: 'rgba(255,255,255,0.12)' },
        EMPLOYEE:   { bg: '#ffffff', text: '#1e293b', border: '#e2e8f0' },
    };
    const [nodeColors, setNodeColors] = useState<Record<string, { bg: string; text: string; border: string }>>(defaultColors);
    const [nodeLevels, setNodeLevels] = useState<Record<string, string>>({});
    const [editingColorType, setEditingColorType] = useState<string>('DIVISION');
    const [activeColorTab, setActiveColorTab] = useState<'palette' | 'manual'>('palette');

    // Preset gradient palettes
    const gradientPresets = [
        { label: 'Director Red (L1)', bg: 'linear-gradient(135deg,#9f1239 0%,#e11d48 50%,#fb7185 100%)', text: '#ffffff', border: 'rgba(255,255,255,0.12)' },
        { label: 'Manager Orange (L2)', bg: 'linear-gradient(135deg,#9a3412 0%,#ea580c 50%,#fb923c 100%)', text: '#ffffff', border: 'rgba(255,255,255,0.12)' },
        { label: 'Golden Amber (L3)', bg: 'linear-gradient(135deg,#854d0e 0%,#d97706 50%,#fbbf24 100%)', text: '#ffffff', border: 'rgba(255,255,255,0.12)' },
        { label: 'Midnight Navy',  bg: 'linear-gradient(135deg,#0f172a 0%,#1e3a5f 60%,#1e293b 100%)', text: '#ffffff', border: 'rgba(255,255,255,0.12)' },
        { label: 'Ocean Blue',     bg: 'linear-gradient(135deg,#1e3a8a 0%,#2563eb 50%,#3b82f6 100%)', text: '#ffffff', border: 'rgba(255,255,255,0.12)' },
        { label: 'Teal Forest',   bg: 'linear-gradient(135deg,#115e59 0%,#0d9488 50%,#14b8a6 100%)', text: '#ffffff', border: 'rgba(255,255,255,0.12)' },
        { label: 'Emerald',       bg: 'linear-gradient(135deg,#14532d 0%,#16a34a 50%,#22c55e 100%)', text: '#ffffff', border: 'rgba(255,255,255,0.12)' },
        { label: 'Sky Cyan',      bg: 'linear-gradient(135deg,#0c4a6e 0%,#0284c7 50%,#0ea5e9 100%)', text: '#ffffff', border: 'rgba(255,255,255,0.12)' },
        { label: 'Royal Purple',  bg: 'linear-gradient(135deg,#3b0764 0%,#7c3aed 50%,#a855f7 100%)', text: '#ffffff', border: 'rgba(255,255,255,0.12)' },
        { label: 'Coral Sunset', bg: 'linear-gradient(135deg,#7c2d12 0%,#ea580c 50%,#fb923c 100%)', text: '#ffffff', border: 'rgba(255,255,255,0.12)' },
        { label: 'Slate Cool',   bg: 'linear-gradient(135deg,#1e293b 0%,#334155 50%,#475569 100%)', text: '#ffffff', border: 'rgba(255,255,255,0.12)' },
        { label: 'Warm Sand',    bg: 'linear-gradient(135deg,#fefce8 0%,#fef9c3 80%,#fef08a 100%)',   text: '#713f12', border: '#fde68a' },
    ];

        // Completely recalculate config state whenever apiData or globalConfig changes
    // This prevents config bleeding between different department charts or company chart
    useEffect(() => {
        let newNodesep = 50;
        let newRanksep = 120;
        let newNodeDims = { ...defaultNodeDims };
        let newNodeColors = { ...defaultColors };
        let newNodeLevels = {};
        let newAutoRouting = true;

        // 1. Apply global fallback first (even if we are in dept view)
        if (globalConfig) {
            if (globalConfig.nodesep) newNodesep = globalConfig.nodesep;
            if (globalConfig.ranksep) newRanksep = globalConfig.ranksep;
            if (globalConfig.nodeDims) newNodeDims = { ...newNodeDims, ...globalConfig.nodeDims };
            if (globalConfig.nodeColors) newNodeColors = { ...newNodeColors, ...globalConfig.nodeColors };
            if (globalConfig.nodeLevels) newNodeLevels = { ...newNodeLevels, ...globalConfig.nodeLevels };
            if (globalConfig.autoRouting !== undefined) newAutoRouting = globalConfig.autoRouting;
        }

        // 2. Apply specific chart config on top (apiData.config is only present if it's a dept chart)
        if (apiData?.config) {
            const conf = apiData.config;
            if (conf.nodesep) newNodesep = conf.nodesep;
            if (conf.ranksep) newRanksep = conf.ranksep;
            if (conf.nodeDims) newNodeDims = { ...newNodeDims, ...conf.nodeDims };
            if (conf.nodeColors) newNodeColors = { ...newNodeColors, ...conf.nodeColors };
            if (conf.nodeLevels) newNodeLevels = { ...newNodeLevels, ...conf.nodeLevels };
            if (conf.autoRouting !== undefined) newAutoRouting = conf.autoRouting;
        }

        // Apply immediately to state
        setNodesep(newNodesep);
        setPrevNodesep(newNodesep);
        setRanksep(newRanksep);
        setPrevRanksep(newRanksep);
        
        setNodeDims(newNodeDims);
        prevNodeDimsRef.current = newNodeDims;

        setNodeColors(newNodeColors);
        setNodeLevels(newNodeLevels);
        setAutoRouting(newAutoRouting);

    }, [apiData?.config, globalConfig]);

    const [showSpacingControls, setShowSpacingControls] = useState(false);

    const handleMiniMapMouseDown = (e: React.MouseEvent) => {
        e.preventDefault(); e.stopPropagation();
        setIsDraggingMiniMap(true);
        setDragStart({ mouseX: e.clientX, mouseY: e.clientY, startBottom: miniMapPosition.bottom, startLeft: miniMapPosition.left });
    };

    useEffect(() => {
        const move = (e: MouseEvent) => {
            if (!isDraggingMiniMap) return;
            setMiniMapPosition({
                left: Math.max(0, dragStart.startLeft + e.clientX - dragStart.mouseX),
                bottom: Math.max(0, dragStart.startBottom - (e.clientY - dragStart.mouseY))
            });
        };
        const up = () => setIsDraggingMiniMap(false);
        if (isDraggingMiniMap) { window.addEventListener('mousemove', move); window.addEventListener('mouseup', up); }
        return () => { window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up); };
    }, [isDraggingMiniMap, dragStart]);

    const toggleCollapse = useCallback((nodeId: string) => {
        setCollapsedNodeIds(prev => {
            const next = new Set(prev);
            next.has(nodeId) ? next.delete(nodeId) : next.add(nodeId);
            return next;
        });
    }, []);

    const memoizedDescendants = useMemo(() => {
        const cache = new Map<string, string[]>();
        const get = (id: string, visited: Set<string> = new Set()): string[] => {
            if (cache.has(id)) return cache.get(id)!;
            if (visited.has(id)) return [];
            const currentVisited = new Set(visited);
            currentVisited.add(id);
            if (!apiData) return [];
            const children = apiData.edges.filter(e => e.source === id).map(e => e.target);
            const desc = [...children];
            children.forEach(c => desc.push(...get(c, currentVisited)));
            cache.set(id, desc);
            return desc;
        };
        return (id: string) => get(id);
    }, [apiData]);

    const onNodeDragStop = useCallback((event: any, node: Node) => {
        pushUndoSnapshot();
        onNodePositionChange?.(node.id, node.position.x, node.position.y);
    }, [onNodePositionChange, pushUndoSnapshot]);

    const onConnect = useCallback((params: any) => {
        if (isLocked) return;

        const sNode = nodes.find(n => n.id === params.source);
        const tNode = nodes.find(n => n.id === params.target);
        if (!sNode || !tNode) return;

        // Determine who is the employee (lower rank) and who is the manager (higher rank)
        let empNode;
        let mgrNode;

        const sIsEmp = sNode.type === 'employeeNode';
        const tIsEmp = tNode.type === 'employeeNode';

        if (sIsEmp && !tIsEmp) {
            empNode = sNode; mgrNode = tNode;
        } else if (!sIsEmp && tIsEmp) {
            empNode = tNode; mgrNode = sNode;
        } else if (sIsEmp && tIsEmp) {
            // Both employees — use level (lower number = higher rank = manager)
            const sLevel = (sNode.data as any)?.level ?? 99;
            const tLevel = (tNode.data as any)?.level ?? 99;
            const sY = sNode.position?.y ?? 0;
            const tY = tNode.position?.y ?? 0;

            if (sLevel !== tLevel) {
                empNode = sLevel > tLevel ? sNode : tNode;
                mgrNode = sLevel > tLevel ? tNode : sNode;
            } else if (Math.abs(sY - tY) > 20) {
                empNode = sY > tY ? sNode : tNode;
                mgrNode = sY > tY ? tNode : sNode;
            } else {
                empNode = sNode; mgrNode = tNode;
            }
        } else {
            empNode = tNode; mgrNode = sNode;
        }

        const isMatrixHint = (params.targetHandle || '').startsWith('left') || (params.targetHandle || '').startsWith('right') || (params.sourceHandle || '').startsWith('left') || (params.sourceHandle || '').startsWith('right');

        console.log('[onConnect] Employee:', (empNode.data as any)?.fullName, '→ Manager:', (mgrNode.data as any)?.fullName);

        
        // Store handles exactly as ReactFlow reported them - no swapping
        // gatekeeperConn.source = employee, gatekeeperConn.target = manager
        // But for the EDGE we need: source=manager(bottom), target=employee(top)
        // So we track which raw handle belongs to which node
        const mgrIsSource = params.source === mgrNode.id;
        const mgrHandleId = mgrIsSource ? params.sourceHandle : params.targetHandle;
        const empHandleId = mgrIsSource ? params.targetHandle : params.sourceHandle;

        setGatekeeperConn({
            source: empNode.id,
            target: mgrNode.id,
            // Store as: sourceHandle = manager's handle (for edge source), targetHandle = employee's handle (for edge target)
            sourceHandle: mgrHandleId,
            targetHandle: empHandleId,
            sourceLabel: (empNode.data as any)?.fullName || (empNode.data as any)?.name || (empNode.data as any)?.label || 'Nhân sự',
            targetLabel: (mgrNode.data as any)?.fullName || (mgrNode.data as any)?.name || (mgrNode.data as any)?.label || 'Người quản lý',
            targetType: mgrNode.type || 'employeeNode',
            isMatrixHint,
            rawSourceNode: empNode,
            rawTargetNode: mgrNode
        });
        setGatekeeperOpen(true);
    }, [isLocked, nodes]);

    // Handle edge reconnection (drag edge endpoint to new handle)
    const onReconnect = useCallback((oldEdge: Edge, newConnection: any) => {
        setEdges((eds) => reconnectEdge(oldEdge, newConnection, eds));
    }, [setEdges]);

    // After reconnect completes, persist via API and re-layout
    const onReconnectEnd = useCallback(async (_event: MouseEvent | TouchEvent, edge: Edge, handleType: 'source' | 'target') => {
        // If the edge was dropped onto empty space, it gets removed by ReactFlow.
        // We only persist if it still exists in edges state.
        const stillExists = edges.find(e => e.id === edge.id);
        if (!stillExists) return;

        // Auto re-layout for clean alignment
        if (!isLocked) {
            // Small delay so ReactFlow finishes internal state update
            setTimeout(() => {
                setNodes(prev => [...prev]); // trigger re-render
            }, 50);
        }
    }, [edges, isLocked, setNodes]);

    const onEdgeClick = useCallback((event: React.MouseEvent, edge: Edge) => {
        if (isLocked) return;
        if (edge.data && edge.data.overrideId) {
            setEdgeToDelete(edge);
        }
    }, [isLocked]);


    const handleLevelChange = useCallback((nodeId: string, level: string) => {
        setNodeLevels((prev) => ({ ...prev, [nodeId]: level }));
    }, []);

    const onHideNode = useCallback(async (nodeId: string) => {
        let newSet: Set<string>;
        setHiddenNodeIds((prev) => {
            const next = new Set(prev);
            if (next.has(nodeId)) next.delete(nodeId);
            else next.add(nodeId);
            newSet = next;
            return next;
        });

        // Auto save hidden status
        const chartKey = apiData?.departmentInfo ? `DEPT-${apiData.departmentInfo.id}` : 'global-config';
        try {
            await apiClient.post(`/employees/org-chart/overrides/${chartKey}`, {
                // @ts-ignore
                hiddenNodeIds: Array.from(newSet)
            });
            toast.success('Đã lưu cấu hình thu gọn/ẩn');
        } catch (error) {
            toast.error('Lỗi khi lưu thiết kế');
        }
    }, [apiData]);

    // We can remove saveOverrides completely now
    const saveDesignConfig = async () => {
        const chartKey = apiData?.departmentInfo ? `DEPT-${apiData.departmentInfo.id}` : 'global-config';
        try {
            await apiClient.post(`/employees/org-chart/config/${chartKey}`, {
                nodesep,
                ranksep,
                zoom,
                nodeDims,
                nodeColors,
                nodeLevels,
                autoRouting,
            });
            toast.success('Đã lưu cấu hình thiết kế');
        } catch (error) {
            toast.error('Lỗi khi lưu cấu hình');
        }
    };
    const saveOverrides = async () => {};

    const confirmMatrixConnection = async (type: 'MOVE' | 'MATRIX' | 'HR_CORE') => {
        if (!gatekeeperConn) return;

        const getRealEmployeeId = (nodeId: string, rawNode?: Node) => {
              if (nodeId.startsWith('employee-')) return nodeId.replace('employee-', '');
              if (rawNode?.type === 'employeeNode') {
                  const data = rawNode.data as any;
                  return data.id || nodeId;
              }
              if (rawNode?.data) {
                  const data = rawNode.data as any;
                  if (data.manager?.id) return data.manager.id;
                  if (data.managerEmployeeId) return data.managerEmployeeId;
              }
              return nodeId;
          };

          const realSourceId = getRealEmployeeId(gatekeeperConn.source, gatekeeperConn.rawSourceNode);
          let realTargetId = getRealEmployeeId(gatekeeperConn.target, gatekeeperConn.rawTargetNode);

          const endpoint = type === 'HR_CORE' ? '/organization/move' : '/organization/overrides/matrix';

          const actionPayload = type === 'HR_CORE' ? 
              { sourceId: realSourceId, targetId: realTargetId } : 
              { 
                  employeeId: realSourceId, 
                  action: type === 'MATRIX' ? 'ADD_DOTTED_LINE' : 'MOVE_NODE', 
                  targetManagerId: realTargetId,
                  targetHandle: (() => {
                      // Normalize handle IDs: 'bottom-target' -> 'bottom', 'left-source' -> 'left'
                      const norm = (h: string | null | undefined, fallback: string) => {
                          if (!h) return fallback;
                          return h.replace(/-source$/, '').replace(/-target$/, '');
                      };
                      return norm(gatekeeperConn.sourceHandle, 'bottom') + ':' + norm(gatekeeperConn.targetHandle, 'top');
                  })()
              };

          console.log('[confirmMatrix] Sending:', JSON.stringify(actionPayload));

          try {
               await apiClient.post(endpoint, actionPayload);
               toast.success(type === 'MATRIX' ? 'Đã thiết lập báo cáo Đa tuyến (Matrix).' : 'Đã thay đổi hiển thị Tùy chỉnh (Visual).');
               setGatekeeperOpen(false);
               setGatekeeperConn(null);
               if (onOverridesChange) onOverridesChange();
          } catch (err: any) {
               toast.error(err.response?.data?.message || 'Lỗi thiết lập liên kết!');
          }
      };

    useEffect(() => {
        if (!apiData || apiData.nodes.length === 0) {
            // Only clear nodes if we don't already have them (prevents flashing)
            if (nodes.length === 0) {
                setNodes([]);
                setEdges([]);
            }
            return;
        }

        let mounted = true;

        const build = async () => {
            // Hidden node IDs from collapsed parents
            const hiddenIds = new Set<string>();
            collapsedNodeIds.forEach(id => memoizedDescendants(id).forEach(d => hiddenIds.add(d)));

            const isHorizontal = layoutDirection === 'RIGHT';

            // --- 0. Prepare processed nodes/edges ---
            let currentNodes = apiData.nodes;
            const processedNodes = currentNodes;

            // --- 1. Compute Employee Level Map (extracted to hooks) ---
            const empLevelMap = computeEmployeeLevelMap(processedNodes, apiData.edges);

            // --- 2. Styled edges — using extracted getEdgeStyle ---
            const styledEdges: any[] = [];
            const dedup = new Set<string>();

            apiData.edges.forEach(e => {
                if (e.source === e.target) return;
                const key = `${e.source}|||${e.target}`;
                if (dedup.has(key)) return;
                dedup.add(key);

                const edgeStyle = computeEdgeStyle(e.source, e.target, e, apiData.nodes, empLevelMap);

                styledEdges.push({
                    ...e,
                    sourceHandle: e.sourceHandle || 'bottom',
                    targetHandle: e.targetHandle || 'top',
                    type: (!isLocked || isDesignMode) ? 'editableEdge' : (e.type || 'smoothstep'),
                    pathOptions: { borderRadius: 40 },
                    animated: e.animated !== undefined ? e.animated : false,
                    reconnectable: isDesignMode ? 'target' : false,
                    style: e.style ? e.style : edgeStyle,
                    data: {
                        ...(e.data || {}),
                        targetNodeId: e.target,
                        isEditMode: !isLocked || isDesignMode,
                        editable: !isLocked || isDesignMode,
                        waypoints: e.data?.waypoints || [],
                    },
                    markerEnd: {
                        type: MarkerType.ArrowClosed,
                        width: edgeStyle.strokeWidth > 2 ? 16 : 12,
                        height: edgeStyle.strokeWidth > 2 ? 16 : 12,
                        color: e.data?.isMatrix ? '#10b981' : edgeStyle.stroke,
                    },
                });
            });

            // Add Custom Edges (matrix connections)
            customEdges.forEach(ce => {
                styledEdges.push({
                    id: `e-custom-${ce.source}-${ce.target}`,
                    source: ce.source,
                    target: ce.target,
                    type: 'smoothstep',
                    pathOptions: { borderRadius: 36 },
                    animated: true,
                    reconnectable: isDesignMode ? 'target' : false,
                    style: { stroke: '#10b981', strokeWidth: 2 },
                    markerEnd: { type: MarkerType.ArrowClosed, width: 11, height: 11, color: '#10b981' },
                });
            });

            const processedEdges = [...styledEdges];

            // Visible nodes
            const visibleNodes = processedNodes
                .filter(n => !hiddenIds.has(n.id))
                .map(n => {
                    const isEmployee = n.type === 'employeeNode';
                    const empLevel = isEmployee ? (empLevelMap.get(n.id) || 1) : null;
                    const computedLevelKey = nodeLevels[n.id] || n.data?.customLevel || (isEmployee ? `L${empLevel}` : null);
                    const baseTypeKey = isEmployee ? 'EMPLOYEE' : (n.data?.type?.toUpperCase() || 'DEPARTMENT');
                    const typeDims = (computedLevelKey && nodeDims[computedLevelKey]) ? nodeDims[computedLevelKey] : (nodeDims[baseTypeKey] || { w: NODE_W, h: NODE_H });
                    const typeColor = (computedLevelKey && nodeColors[computedLevelKey]) ? nodeColors[computedLevelKey] : nodeColors[baseTypeKey];
                    return {
                        ...n,
                        data: {
                            ...n.data,
                            // Thêm Level vừa tính vào Data để render Component Node
                            level: isEmployee ? (empLevelMap.get(n.id) || 1) : null,
                            width: typeDims.w,
                            height: typeDims.h,
                            customBg: typeColor?.bg,
                            customText: typeColor?.text,
                            customBorder: typeColor?.border,
                customLevel: nodeLevels[n.id] || n.data.customLevel,
                name: n.data.name || n.data.fullName || n.data.label,
                hasChildren: apiData.edges.some(e => e.source === n.id),
                            isCollapsed: collapsedNodeIds.has(n.id),
                            onToggleCollapse: toggleCollapse,
                            onClick: () => onNodeClick?.(n.data),
                            onAction: onActionTrigger,
                            refreshKey,
                            isDesignMode,
                            isHidden: hiddenNodeIds.has(n.id),
                            onHide: () => onHideNode(n.id),
                            onChangeLevel: handleLevelChange,
                        }
                    };
                });

            const visibleEdges = processedEdges.filter(e => !hiddenIds.has(e.source) && !hiddenIds.has(e.target));

            const shouldLayout = layoutTrigger !== prevLayoutTrigger ||
                nodesep !== prevNodesep ||
                ranksep !== prevRanksep ||
                JSON.stringify(nodeDims) !== JSON.stringify(prevNodeDimsRef.current) ||
                (visibleNodes.length > 0 && visibleNodes.every(n => !n.position || (n.position.x === 0 && n.position.y === 0)));

            if (!mounted) return;

            if (shouldLayout) {
                setPrevNodesep(nodesep);
                setPrevRanksep(ranksep);
                prevNodeDimsRef.current = nodeDims;
                
                // Build a map of dimensions for treeLayout
                const nodeDimsMap = new Map<string, {w: number, h: number}>();
                visibleNodes.forEach(n => nodeDimsMap.set(n.id, { w: n.data.width, h: n.data.height }));
                // Find root nodes (nodes with no incoming edges among visible)
                const targetIds = new Set(visibleEdges.map(e => e.target));
                const roots = visibleNodes.filter(n => !targetIds.has(n.id));

                if (roots.length === 0) { setNodes(visibleNodes); setEdges(visibleEdges); return; }

                // Layout each connected tree component separately
                const positionMap = new Map<string, {x: number, y: number}>();
                const allVisibleIds = new Set(visibleNodes.map(n => n.id));
                let treeOffsetX = 0;

                for (const root of roots) {
                    const componentsIds = [root.id, ...getDescendantIds(root.id, visibleEdges)].filter(id => allVisibleIds.has(id));
                    const componentEdges = visibleEdges.filter(e => componentsIds.includes(e.source) && componentsIds.includes(e.target));

                    const positions = treeLayout(root.id, componentsIds, componentEdges, isHorizontal, { nodesep, ranksep }, nodeDimsMap, nodeLevels);

                    // Find bounds
                    let compMaxX = 0;
                    positions.forEach(p => compMaxX = Math.max(compMaxX, p.x));

                    positions.forEach((pos, id) => {
                        positionMap.set(id, isHorizontal
                            ? { x: pos.x + treeOffsetX, y: pos.y }
                            : { x: pos.x + treeOffsetX, y: pos.y }
                        );
                    });

                    treeOffsetX += compMaxX + NODE_W + H_GAP * 3;
                }

                // CRITICAL: Filter out nodes not in positionMap (true orphans) to prevent
                // ghost nodes at (0,0) that cause overlapping edge rectangle artifacts
                const layoutedNodes = visibleNodes
                    .filter(n => positionMap.has(n.id))
                    .map(n => ({
                        ...n,
                        targetPosition: n.id.startsWith('section-') && !isHorizontal ? Position.Left : (isHorizontal ? Position.Left : Position.Top),
                        sourcePosition: isHorizontal ? Position.Right : Position.Bottom,
                        position: positionMap.get(n.id)!,
                    }));

                // Filter edges to only include connected nodes
                const layoutedNodeIds = new Set(layoutedNodes.map(n => n.id));
                const cleanEdges = visibleEdges.filter(
                    e => layoutedNodeIds.has(e.source) && layoutedNodeIds.has(e.target)
                );

                if (!mounted) return;

                // ── ELK Auto Edge Routing (Hybrid) ──────────────────────
                // After Dagre positions nodes, use ELK to route edges around nodes.
                // This runs off-main-thread via Web Worker.
                if (autoRouting && layoutedNodes.length > 0 && cleanEdges.length > 0) {
                    // Fire-and-forget: route edges async, then inject bend points
                    routeEdges(
                        layoutedNodes.map(n => ({
                            ...n,
                            measured: { width: (n.data as any)?.width || 272, height: (n.data as any)?.height || 220 },
                        })),
                        cleanEdges,
                    ).then(bendPointsMap => {
                        if (!mounted) return;
                        elkBendPointsRef.current = bendPointsMap;
                        // Inject ELK bend points into edge data
                        setEdges(prevEdges => prevEdges.map(e => {
                            const bps = bendPointsMap.get(e.id);
                            const hasManualWaypoints = (e.data as any)?.waypoints?.length > 0;
                            if (bps && bps.length > 0 && !hasManualWaypoints) {
                                return {
                                    ...e,
                                    type: 'autoRoutedEdge',
                                    data: { ...(e.data || {}), elkBendPoints: bps },
                                };
                            }
                            return e;
                        }));
                    });
                }

                setEdges(cleanEdges);
                setNodes(layoutedNodes);
                if (layoutTrigger !== prevLayoutTrigger) setPrevLayoutTrigger(layoutTrigger);
                if (!isInitialized || layoutTrigger !== prevLayoutTrigger) {
                    setTimeout(() => {
                        window.requestAnimationFrame(() => {
                            // Always center content first, then apply saved zoom
                            fitView({ duration: 0, padding: 0.12, maxZoom: 0.9 }).then(() => {
                                if (globalConfig?.zoom) {
                                    const rect = getViewport();
                                    setViewport({ x: rect.x, y: rect.y, zoom: globalConfig.zoom }, { duration: 700 });
                                }
                            });
                        });
                    }, 100);
                    if (!isInitialized) setIsInitialized(true);
                }
                return;
            } else {
                const isH = layoutDirection === 'RIGHT';
                // CRITICAL FIX: Preserve exactly the current on-screen positions to avoid jumping coordinates
                // when simply toggling the lock state or receiving soft API re-renders
                setNodes(prevNodes => {
                    const currentPositions = new Map(prevNodes.map(n => [n.id, n.position]));
                    return visibleNodes.map(n => ({
                        ...n,
                        targetPosition: isH ? Position.Left : Position.Top,
                        sourcePosition: isH ? Position.Right : Position.Bottom,
                        position: currentPositions.get(n.id) || n.position
                    }));
                });
            }

            setEdges(visibleEdges);
        };

        const timer = setTimeout(build, 30);
        return () => { mounted = false; clearTimeout(timer); };
    }, [apiData, layoutDirection, collapsedNodeIds, layoutTrigger, nodesep, ranksep, nodeDims, nodeColors, refreshKey, isLocked, hiddenNodeIds, autoRouting, routeEdges]);

    // Trigger fitView AFTER ReactFlow renders the new nodes
    // This fires whenever the counts of nodes change (new chart loaded)
    const nodeCount = nodes.length;
    useEffect(() => {
        if (nodeCount === 0 || isInitialized) return;
        const rafId = window.requestAnimationFrame(() => {
            setTimeout(() => {
                fitView({ duration: 0, padding: 0.12, maxZoom: 0.9 }).then(() => {
                    if (globalConfig?.zoom) {
                        const rect = getViewport();
                        setViewport({ x: rect.x, y: rect.y, zoom: globalConfig.zoom }, { duration: 500 });
                    }
                });
                setIsInitialized(true);
            }, 150);
        });
        return () => window.cancelAnimationFrame(rafId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [nodeCount, isInitialized]);

    return (
        <div className="flex-1 w-full h-full relative">
            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={isLocked && !isDesignMode ? undefined : onNodesChange}
                onEdgesChange={isLocked && !isDesignMode ? undefined : onEdgesChange}
                onConnect={onConnect}
                nodeTypes={nodeTypes}
                edgeTypes={edgeTypes}
                nodesDraggable={!isLocked || isDesignMode}
                nodesConnectable={isDesignMode}
                edgesReconnectable={isDesignMode}
                elementsSelectable={true}
                onlyRenderVisibleElements={true}
                connectionLineType={ConnectionLineType.SmoothStep}
                proOptions={{ hideAttribution: true }}
                minZoom={0.05}
                maxZoom={2}
                style={{ background: '#f8fafc' }}
                onNodeClick={(_, node) => {
                    setSelectedNodeId(prev => prev === node.id ? null : node.id);
                    onNodeClick && onNodeClick(node.data);
                }}
                onPaneClick={() => setSelectedNodeId(null)}
                onNodeDoubleClick={(_, node) => onNodeDoubleClick && onNodeDoubleClick(node)}
                onNodeDragStop={onNodeDragStop}
                onReconnect={onReconnect}
                onReconnectEnd={onReconnectEnd}
                onEdgeClick={onEdgeClick}
            >
                {/* Node spacing guides - rendered inside ReactFlow for hook access */}
                {(!isLocked || isDesignMode) && selectedNodeId && (
                    <NodeSpacingGuides selectedNodeId={selectedNodeId} />
                )}

                {/* Light dot grid */}
                <Background gap={24} size={1} color="#cbd5e1" style={{ opacity: 0.6 }} />
                <Controls
                    showInteractive={false}
                    className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-md"
                />

                {/* Edge Deletion Confirmation */}
                <AlertDialog open={!!edgeToDelete} onOpenChange={(open) => !open && setEdgeToDelete(null)}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle className="flex items-center gap-2 text-rose-600">
                                <ShieldAlert className="w-5 h-5" />
                                {edgeToDelete?.data?.isMatrix ? 'Xoá Báo cáo Phụ (Matrix)' : 'Khôi phục Mặc định (Visual)'}
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                                {edgeToDelete?.data?.isMatrix 
                                    ? 'Bạn có chắc chắn muốn xóa đường nét đứt này không? Việc xóa sẽ hủy bỏ quan hệ báo cáo phụ đã được thiết lập.' 
                                    : 'Bạn có chắc chắn muốn xóa liên kết hiển thị tùy chỉnh này không? Sơ đồ sẽ khôi phục lại đường nối gốc dựa trên dữ liệu Nhân sự lõi.'}
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Hủy</AlertDialogCancel>
                            <AlertDialogAction
                                className="bg-rose-600 hover:bg-rose-700 text-white"
                                onClick={async () => {
                                    if (!edgeToDelete?.data?.overrideId) return;
                                    try {
                                        await apiClient.delete(`/organization/overrides/matrix/${edgeToDelete.data.overrideId}`);
                                        toast.success('Đã xóa liên kết cấu trúc');
                                        setEdgeToDelete(null);
                                        if (onOverridesChange) onOverridesChange();
                                    } catch (err: any) {
                                        toast.error(err.response?.data?.message || 'Gặp lỗi khi xóa liên kết');
                                    }
                                }}
                            >
                                Đồng ý xóa
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>

                <AlertDialog open={gatekeeperOpen} onOpenChange={setGatekeeperOpen}>
                    <AlertDialogContent className="w-full max-w-lg p-0 overflow-hidden border-0 shadow-2xl rounded-2xl bg-gradient-to-b from-white to-slate-50/80 dark:from-slate-900 dark:to-slate-950/80">
                        {/* Decorative Top Accent */}
                        <div className="h-1.5 w-full bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500" />
                        
                        <div className="p-6">
                            {gatekeeperConn?.targetType === 'employeeNode' ? (
                                <>
                                    <AlertDialogHeader className="mb-5 space-y-3">
                                        <div className="flex justify-center">
                                            <div className="h-12 w-12 bg-blue-50 dark:bg-blue-900/20 rounded-2xl flex items-center justify-center ring-8 ring-white dark:ring-slate-900 shadow-sm">
                                                <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                                            </div>
                                        </div>
                                        <AlertDialogTitle className="text-xl text-center font-extrabold text-slate-800 dark:text-slate-100 tracking-tight">
                                            Xác nhận thiết lập liên kết
                                        </AlertDialogTitle>
                                        <AlertDialogDescription className="text-center text-sm font-medium text-slate-500 dark:text-slate-400">
                                            Bạn đang thiết lập <span className="text-slate-800 dark:text-slate-200 font-bold px-1 bg-slate-100 dark:bg-slate-800 rounded">{gatekeeperConn?.sourceLabel}</span> báo cáo cho <span className="text-slate-800 dark:text-slate-200 font-bold px-1 bg-slate-100 dark:bg-slate-800 rounded">{gatekeeperConn?.targetLabel}</span>. Vui lòng chọn bản chất:
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    
                                    <div className="flex flex-col gap-3 my-2">
                                         
    
                                         <button 
                                            className="group relative w-full text-left p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-emerald-400 dark:hover:border-emerald-500 shadow-sm hover:shadow-md transition-all duration-300"
                                            onClick={() => confirmMatrixConnection('MATRIX')}
                                         >
                                             <div className="absolute inset-0 bg-gradient-to-r from-emerald-50 to-transparent dark:from-emerald-900/10 opacity-0 group-hover:opacity-100 rounded-xl transition-opacity duration-300" />
                                             <div className="relative z-10">
                                                <div className="flex items-center gap-3 mb-1.5">
                                                    <div className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform duration-300">
                                                        <GitBranch className="w-4 h-4"/>
                                                    </div>
                                                    <span className="font-bold text-slate-800 dark:text-slate-200 group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">2. Báo cáo Đa tuyến (Matrix)</span>
                                                </div>
                                                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed block pl-9">
                                                    Vẽ đường phụ trên sơ đồ biểu thị quan hệ dự án/chuyên môn. Giữ nguyên quản lý hành chính trong DB Nhân sự.
                                                </span>
                                             </div>
                                         </button>
    
                                         <button 
                                            className="group relative w-full text-left p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-violet-400 dark:hover:border-violet-500 shadow-sm hover:shadow-md transition-all duration-300"
                                            onClick={() => confirmMatrixConnection('MOVE')}
                                         >
                                             <div className="absolute inset-0 bg-gradient-to-r from-violet-50 to-transparent dark:from-violet-900/10 opacity-0 group-hover:opacity-100 rounded-xl transition-opacity duration-300" />
                                             <div className="relative z-10">
                                                <div className="flex items-center gap-3 mb-1.5">
                                                    <div className="p-1.5 rounded-lg bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 group-hover:scale-110 transition-transform duration-300">
                                                        <ImageIcon className="w-4 h-4"/>
                                                    </div>
                                                    <span className="font-bold text-slate-800 dark:text-slate-200 group-hover:text-violet-700 dark:group-hover:text-violet-400 transition-colors">3. Tuỳ chỉnh hiển thị (Visual)</span>
                                                </div>
                                                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed block pl-9">
                                                    Chỉ điều chỉnh nét đứt/liền trên sơ đồ hiện tại để dễ nhìn, không thay đổi DB Nhân sự hay quyền quản trị.
                                                </span>
                                             </div>
                                         </button>
                                    </div>
    
                                    <div className="flex justify-end pt-4 mt-2 border-t border-slate-100 dark:border-slate-800">
                                        <AlertDialogCancel 
                                            onClick={() => setGatekeeperConn(null)}
                                            className="rounded-full px-6 font-semibold"
                                        >
                                            Hủy bỏ
                                        </AlertDialogCancel>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <AlertDialogHeader className="mb-5">
                                        <div className="flex justify-center mb-3">
                                            <div className="h-12 w-12 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl flex items-center justify-center ring-8 ring-white dark:ring-slate-900 shadow-sm">
                                                <Building2 className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                                            </div>
                                        </div>
                                        <AlertDialogTitle className="text-xl text-center font-extrabold text-slate-800 dark:text-slate-100 tracking-tight">
                                            Điều chuyển Đơn vị trực thuộc
                                        </AlertDialogTitle>
                                        <AlertDialogDescription className="text-center text-sm font-medium text-slate-500 dark:text-slate-400 pt-2">
                                            Bạn đang chuyển <span className="text-slate-800 dark:text-slate-200 font-bold px-1 bg-slate-100 dark:bg-slate-800 rounded">{gatekeeperConn?.sourceLabel}</span> sang trực thuộc <span className="text-slate-800 dark:text-slate-200 font-bold px-1 bg-slate-100 dark:bg-slate-800 rounded">{gatekeeperConn?.targetLabel}</span>.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <div className="bg-indigo-50/50 dark:bg-indigo-900/10 border border-indigo-100/50 dark:border-indigo-900/30 rounded-xl p-4 my-6 text-[13px] text-indigo-800 dark:text-indigo-300 text-center leading-relaxed font-medium">
                                         Hành động này sẽ thay đổi Cơ cấu Tổ chức (HR Core), cập nhật lại phòng ban và phân cấp cho toàn bộ nhân sự trực thuộc. Bạn có chắc chắn?
                                    </div>
                                    <div className="flex gap-3 justify-end pt-2 border-t border-slate-100 dark:border-slate-800">
                                         <AlertDialogCancel onClick={() => setGatekeeperConn(null)} className="rounded-full px-6 font-semibold">Hủy bỏ</AlertDialogCancel>
                                         
                                    </div>
                                </>
                            )}
                        </div>
                    </AlertDialogContent>
                </AlertDialog>

                                {/* Hidden Nodes Unhide Panel */}
                {!isLocked && apiData?.hiddenNodes && apiData.hiddenNodes.length > 0 && (
                    <Panel position="top-left" className="mt-2 ml-2">
                        <div className="bg-white/95 backdrop-blur-sm border border-amber-200 rounded-xl shadow-lg p-3 max-w-[260px]">
                            <div className="flex items-center gap-2 mb-2">
                                <EyeOff className="w-4 h-4 text-amber-600" />
                                <span className="text-xs font-bold text-amber-800 uppercase tracking-wide">Node đã ẩn ({apiData.hiddenNodes.length})</span>
                            </div>
                            <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
                                {apiData.hiddenNodes.map((hn) => (
                                    <div key={hn.id} className="flex items-center justify-between gap-2 bg-amber-50 rounded-lg px-2.5 py-1.5 group hover:bg-amber-100 transition-colors">
                                        <div className="min-w-0">
                                            <p className="text-xs font-semibold text-slate-700 truncate">{hn.fullName}</p>
                                            {hn.jobTitle && <p className="text-[10px] text-slate-500 truncate">{hn.jobTitle}</p>}
                                        </div>
                                        <button
                                            onClick={() => onHideNode(hn.id)}
                                            className="shrink-0 p-1 rounded-md hover:bg-emerald-100 text-slate-400 hover:text-emerald-600 transition-colors"
                                            title="Hiện lại node này"
                                        >
                                            <Eye className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </Panel>
                )}

                {/* Bottom Toolbar has been unified into the right panel */}


                {/* Zoom indicator */}
                <Panel position="bottom-right" className="mb-2 mr-2">
                    <div className="flex items-center gap-2">
                        {/* Auto Routing Toggle */}
                        <button
                            onClick={() => setAutoRouting(prev => !prev)}
                            className={cn(
                                'flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border shadow-sm transition-all duration-200 text-[11px] font-bold tracking-wide select-none',
                                autoRouting
                                    ? 'bg-sky-50 border-sky-200 text-sky-700 hover:bg-sky-100'
                                    : 'bg-white/90 border-slate-200 text-slate-400 hover:bg-slate-50 hover:text-slate-600'
                            )}
                            title={autoRouting ? 'Auto Routing: BẬT — Edges tự động tránh nodes (ELK)' : 'Auto Routing: TẮT — Edges đi thẳng (SmoothStep)'}
                        >
                            <Waypoints className="w-3.5 h-3.5" />
                            <span>Auto</span>
                            {isElkRouting && (
                                <Loader2 className="w-3 h-3 animate-spin" />
                            )}
                        </button>

                        {/* Version History Toggle */}
                        <button
                            onClick={() => setVersionPanelOpen(prev => !prev)}
                            className={cn(
                                'flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border shadow-sm transition-all duration-200 text-[11px] font-bold tracking-wide select-none',
                                versionPanelOpen
                                    ? 'bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100'
                                    : 'bg-white/90 border-slate-200 text-slate-400 hover:bg-slate-50 hover:text-slate-600'
                            )}
                            title="Lịch sử phiên bản"
                        >
                            <History className="w-3.5 h-3.5" />
                        </button>

                        {/* Zoom Indicator */}
                        <div className="bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-full border border-slate-200 shadow-sm flex items-center gap-1">
                            <span className="text-[11px] font-bold text-slate-400 tracking-widest uppercase">Zoom:</span>
                            <input
                                type="number"
                                min="10" max="400"
                                value={Math.round(zoom * 100)}
                                disabled={isLocked && !isDesignMode}
                                onChange={(e) => setViewport({ x, y, zoom: Number(e.target.value) / 100 })}
                                className="w-10 text-[11px] font-bold text-slate-700 bg-transparent border-none p-0 text-right focus:ring-0 focus:outline-none"
                            />
                            <span className="text-[11px] font-bold text-slate-400 uppercase">%</span>
                        </div>
                    </div>
                </Panel>

                {/* ── Legend Panel ── */}
                <Panel position="bottom-left" className="mb-2 ml-2">
                    <div className="bg-white/95 backdrop-blur-sm border border-slate-200 rounded-xl shadow-sm px-3 py-2.5 flex flex-col gap-1.5 select-none">
                        <div className="flex items-center gap-1.5 mb-0.5">
                            <Info className="w-3 h-3 text-slate-400" />
                            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Chú giải</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-0 border-t-[2.5px] border-slate-700" />
                            <span className="text-[10px] text-slate-600 font-medium">Báo cáo trực tiếp</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-0 border-t-2 border-dashed border-emerald-500" />
                            <span className="text-[10px] text-slate-600 font-medium">Đa tuyến (Matrix)</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-0 border-t-[1.5px] border-slate-300" />
                            <span className="text-[10px] text-slate-600 font-medium">Nhân viên cấp dưới</span>
                        </div>
                        {isDesignMode && (
                            <>
                                <div className="border-t border-slate-100 my-0.5" />
                                <div className="flex items-center gap-2">
                                    <div className="flex gap-0.5">
                                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 border border-white shadow-sm" />
                                        <div className="w-2.5 h-2.5 rounded-full bg-amber-400 border border-white shadow-sm" />
                                    </div>
                                    <span className="text-[10px] text-slate-600 font-medium">Nhận / Gửi kết nối</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="flex gap-0.5">
                                        <div className="w-2.5 h-2.5 rounded-full bg-sky-400 border border-white shadow-sm" />
                                        <div className="w-2.5 h-2.5 rounded-full bg-rose-400 border border-white shadow-sm" />
                                    </div>
                                    <span className="text-[10px] text-slate-600 font-medium">Matrix trái / phải</span>
                                </div>
                            </>
                        )}
                    </div>
                </Panel>

                {/* Layout and Spacing controls */}
                {(!isLocked || isDesignMode) && (
                    <Panel position="top-right" className="mt-2 mr-2 flex gap-2">
                        {/* Spacing Adjuster */}
                        <div className="relative">
                            <Button
                                variant="outline"
                                size="icon"
                                className={cn(
                                    "bg-white/95 backdrop-blur-sm h-11 w-11 rounded-xl border border-slate-200 shadow-md hover:bg-slate-50 transition-all flex items-center justify-center", 
                                    showSpacingControls && "border-blue-500 text-blue-600 bg-blue-50/50"
                                )}
                                title="Khoảng cách và Kích thước"
                                onClick={() => setShowSpacingControls(!showSpacingControls)}
                            >
                                <Ruler className="h-4 w-4" />
                            </Button>

                            {showSpacingControls && (
                                <div className="absolute top-12 right-0 bg-white/95 backdrop-blur-md border border-slate-200 rounded-xl shadow-2xl p-3 w-72 flex flex-col gap-4 z-50 animate-in slide-in-from-top-2">
                                    {/* Dimensions by Level */}
                                    <div className="flex flex-col gap-2 pb-3 border-b border-slate-200/60">
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="text-[11px] font-bold text-slate-800 uppercase tracking-wide">Chỉnh kích thước thẻ</span>
                                        </div>
                                        <select 
                                            className="w-full text-xs p-1.5 bg-slate-50 border border-slate-200 rounded-md font-medium text-slate-700 outline-none focus:ring-1 focus:ring-blue-500"
                                            value={editingDimType}
                                            onChange={e => setEditingDimType(e.target.value)}
                                        >
                                            <optgroup label="Đơn vị Tổ chức">
                                                <option value="COMPANY">Công ty</option>
                                                <option value="FACTORY">Nhà máy</option>
                                                <option value="DIVISION">Khối</option>
                                                <option value="DEPARTMENT">Phòng ban</option>
                                                <option value="SECTION">Tổ / Bộ phận</option>
                                                <option value="EMPLOYEE">Thẻ Nhân sự</option>
                                            </optgroup>
                                            <optgroup label="Theo Cấp độ (Layer)">
                                                {Array.from({length: 10}).map((_, i) => <option key={`L${i+1}`} value={`L${i+1}`}>Cấp L{i+1}</option>)}
                                            </optgroup>
                                        </select>

                                        <div className="flex flex-col gap-1 mt-1">
                                            <div className="flex justify-between items-center">
                                                <span className="text-[11px] font-medium text-slate-500">Độ rộng thẻ</span>
                                                <div className="flex items-center gap-1 bg-blue-50 px-1 rounded-md">
                                                    <input 
                                                        type="number" 
                                                        className="w-10 text-[11px] font-bold text-blue-600 bg-transparent border-none p-0 text-right focus:ring-0 focus:outline-none"
                                                        value={nodeDims[editingDimType]?.w || 272}
                                                        onChange={e => setNodeDims(prev => ({ ...prev, [editingDimType]: { ...prev[editingDimType], w: Number(e.target.value)} }))}
                                                    />
                                                    <span className="text-[10px] text-blue-400">px</span>
                                                </div>
                                            </div>
                                            <input 
                                                type="range" 
                                                min="150" max="450" step="2"
                                                value={nodeDims[editingDimType]?.w || 272}
                                                onChange={e => setNodeDims(prev => ({ ...prev, [editingDimType]: { ...prev[editingDimType], w: Number(e.target.value)} }))}
                                                className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                                            />
                                        </div>
                                        
                                        <div className="flex flex-col gap-1">
                                            <div className="flex justify-between items-center">
                                                <span className="text-[11px] font-medium text-slate-500">Độ dài thẻ</span>
                                                <div className="flex items-center gap-1 bg-emerald-50 px-1 rounded-md">
                                                    <input 
                                                        type="number" 
                                                        className="w-10 text-[11px] font-bold text-emerald-600 bg-transparent border-none p-0 text-right focus:ring-0 focus:outline-none"
                                                        value={nodeDims[editingDimType]?.h || 210}
                                                        onChange={e => setNodeDims(prev => ({ ...prev, [editingDimType]: { ...prev[editingDimType], h: Number(e.target.value)} }))}
                                                    />
                                                    <span className="text-[10px] text-emerald-400">px</span>
                                                </div>
                                            </div>
                                            <input 
                                                type="range" 
                                                min="80" max="400" step="2"
                                                value={nodeDims[editingDimType]?.h || 210}
                                                onChange={e => setNodeDims(prev => ({ ...prev, [editingDimType]: { ...prev[editingDimType], h: Number(e.target.value)} }))}
                                                className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                                            />
                                        </div>
                                    </div>

                                    {/* Global Spacing */}
                                    <div className="flex flex-col gap-3">
                                        <div className="flex flex-col gap-1">
                                            <div className="flex justify-between items-center">
                                                <span className="text-[11px] font-bold text-slate-500">Giãn cách Ngang (Node)</span>
                                                <div className="flex items-center gap-1 bg-slate-100 px-1 rounded-md">
                                                    <input 
                                                        type="number" 
                                                        className="w-10 text-[11px] font-bold text-slate-700 bg-transparent border-none p-0 text-right focus:ring-0 focus:outline-none"
                                                        value={nodesep}
                                                        onChange={e => setNodesep(Number(e.target.value))}
                                                    />
                                                    <span className="text-[10px] text-slate-400">px</span>
                                                </div>
                                            </div>
                                            <input 
                                                type="range" 
                                                min="0" max="250" step="10"
                                                value={nodesep}
                                                onChange={e => setNodesep(Number(e.target.value))}
                                                className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-slate-400"
                                            />
                                        </div>
                                        <div className="flex flex-col gap-1">
                                            <div className="flex justify-between items-center">
                                                <span className="text-[11px] font-bold text-slate-500">Giãn cách Dọc (Rank)</span>
                                                <div className="flex items-center gap-1 bg-slate-100 px-1 rounded-md">
                                                    <input 
                                                        type="number" 
                                                        className="w-10 text-[11px] font-bold text-slate-700 bg-transparent border-none p-0 text-right focus:ring-0 focus:outline-none"
                                                        value={ranksep}
                                                        onChange={e => setRanksep(Number(e.target.value))}
                                                    />
                                                    <span className="text-[10px] text-slate-400">px</span>
                                                </div>
                                            </div>
                                            <input 
                                                type="range" 
                                                min="0" max="350" step="10"
                                                value={ranksep}
                                                onChange={e => setRanksep(Number(e.target.value))}
                                                className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-slate-400"
                                            />
                                        </div>
                                    </div>

                                    {/* ─── Color Customization ─── */}
                                    <div className="flex flex-col gap-2 pt-3 border-t border-slate-200/60">
                                        <div className="flex items-center justify-between">
                                            <span className="text-[11px] font-bold text-slate-800 uppercase tracking-wide">Màu thẻ</span>
                                            <button
                                                className="text-[9px] text-slate-400 hover:text-slate-600 underline"
                                                onClick={() => {
                                                  if (!defaultColors[editingColorType]) {
                                                      setNodeColors(prev => { const next = {...prev}; delete next[editingColorType]; return next; });
                                                  } else {
                                                      setNodeColors(prev => ({ ...prev, [editingColorType]: defaultColors[editingColorType] }));
                                                  }
                                              }}
                                            >↺ Đặt lại</button>
                                        </div>
                                        <select
                                            className="w-full text-xs p-1.5 bg-slate-50 border border-slate-200 rounded-md font-medium text-slate-700 outline-none focus:ring-1 focus:ring-blue-500"
                                            value={editingColorType}
                                            onChange={e => setEditingColorType(e.target.value)}
                                        >
                                            <optgroup label="Đơn vị Tổ chức">
                                                <option value="COMPANY">Công ty</option>
                                                <option value="FACTORY">Nhà máy</option>
                                                <option value="DIVISION">Khối</option>
                                                <option value="DEPARTMENT">Phòng ban</option>
                                                <option value="SECTION">Tổ / Bộ phận</option>
                                                <option value="EMPLOYEE">Thẻ Nhân sự</option>
                                            </optgroup>
                                            <optgroup label="Theo Cấp độ (Layer)">
                                                {Array.from({length: 10}).map((_, i) => <option key={`L${i+1}`} value={`L${i+1}`}>Cấp L{i+1}</option>)}
                                            </optgroup>
                                        </select>

                                        {/* Gradient Palette Grid */}
                                        <div className="grid grid-cols-6 gap-1.5 mt-0.5">
                                            {gradientPresets.map((preset, i) => {
                                                const current = nodeColors[editingColorType];
                                                const isSelected = current?.bg === preset.bg;
                                                return (
                                                    <button
                                                        key={i}
                                                        title={preset.label}
                                                        onClick={() => setNodeColors(prev => ({ ...prev, [editingColorType]: { bg: preset.bg, text: preset.text, border: preset.border } }))}
                                                        className={`h-7 rounded-lg transition-all hover:scale-110 active:scale-95 ${isSelected ? 'ring-2 ring-blue-500 ring-offset-1 scale-105' : 'ring-1 ring-slate-200 hover:ring-slate-300'}`}
                                                        style={{ background: preset.bg }}
                                                    />
                                                );
                                            })}
                                        </div>

                                        {/* Manual overrides */}
                                        <div className="flex flex-col gap-1.5 mt-1 pt-2 border-t border-slate-100">
                                            <div className="flex items-center justify-between">
                                                <span className="text-[10px] text-slate-500 font-medium">Màu chữ</span>
                                                <div className="flex items-center gap-1.5">
                                                    <div className="w-4 h-4 rounded-full border border-slate-200" style={{ background: nodeColors[editingColorType]?.text || '#ffffff' }} />
                                                    <input type="color" value={nodeColors[editingColorType]?.text || '#ffffff'}
                                                        onChange={e => setNodeColors(prev => ({ ...prev, [editingColorType]: { ...prev[editingColorType], text: e.target.value } }))}
                                                        className="w-6 h-6 cursor-pointer rounded border-0 bg-transparent p-0"
                                                    />
                                                </div>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <span className="text-[10px] text-slate-500 font-medium">Màu khung viền</span>
                                                <div className="flex items-center gap-1.5">
                                                    <div className="w-4 h-4 rounded-full border border-slate-200" style={{ background: nodeColors[editingColorType]?.border || '#e2e8f0' }} />
                                                    <input type="color" value={(nodeColors[editingColorType]?.border || '#e2e8f0').replace(/rgba?\(.+\)/, '#94a3b8')}
                                                        onChange={e => setNodeColors(prev => ({ ...prev, [editingColorType]: { ...prev[editingColorType], border: e.target.value } }))}
                                                        className="w-6 h-6 cursor-pointer rounded border-0 bg-transparent p-0"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    {/* Final Save Button */}
                                    <Button 
                                        className="w-full bg-slate-900 border-none hover:bg-black text-[11px] font-bold h-9 rounded-lg shadow-md gap-2"
                                        onClick={async () => {
                                            const chartKey = apiData?.departmentInfo ? `DEPT-${apiData.departmentInfo.id}` : 'global-config';
                                            try {
                                                await apiClient.post(`/employees/org-chart/config/${chartKey}`, {
                                                    nodesep, ranksep, nodeDims, nodeColors
                                                });
                                                toast.success('Đã lưu cấu hình hiển thị');
                                            } catch (error) {
                                                toast.error('Lỗi khi lưu cấu hình');
                                            }
                                        }}
                                    >
                                        <Save className="h-3.5 w-3.5" />
                                        LƯU KÍCH THƯỚC TRÊN RULER
                                    </Button>
                                </div>
                            )}
                        </div>
                    </Panel>
                )}

                {/* MiniMap Removed as requested */}
            </ReactFlow>

            {/* Version History Panel (outside ReactFlow) */}
            <VersionHistoryPanel
                isOpen={versionPanelOpen}
                onClose={() => setVersionPanelOpen(false)}
                chartKey={apiData?.departmentInfo ? `DEPT-${apiData.departmentInfo.id}` : 'global-config'}
                canManage={isDesignMode}
                onRestore={(snapshot) => {
                    // Apply restored snapshot — trigger a refresh
                    if (snapshot?.config) {
                        if (snapshot.config.nodesep) setNodesep(snapshot.config.nodesep);
                        if (snapshot.config.ranksep) setRanksep(snapshot.config.ranksep);
                    }
                    setVersionPanelOpen(false);
                    onOverridesChange?.();
                }}
            />
        </div>
    );
};

const OrgChartCanvas = forwardRef((props: OrgChartCanvasProps, ref) => (
    <ReactFlowProvider>
        <OrgChartCanvasInner {...props} canvasRef={ref} />
    </ReactFlowProvider>
));
OrgChartCanvas.displayName = 'OrgChartCanvas';
export default OrgChartCanvas;









