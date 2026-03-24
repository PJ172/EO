"use client";

import { getAvatarVariant } from "../../lib/utils";
import { useOrgTree, DepartmentNode, useMoveDepartment } from "@/services/department.service";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getAvatarUrl } from "@/lib/avatar-utils";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { User, Users, Move, Loader2, ChevronRight, Network } from "lucide-react";
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useState } from "react";
import React from "react";

const ITEM_TYPE = "ORG_NODE";

export function OrganizationChart() {
    const { data: tree, isLoading } = useOrgTree();
    const [activeRootId, setActiveRootId] = useState<string | null>(null);

    // Recursively find path to build Breadcrumbs
    const findPath = (nodes: DepartmentNode[], targetId: string, currentPath: DepartmentNode[] = []): DepartmentNode[] | null => {
        for (const node of nodes) {
            const newPath = [...currentPath, node];
            if (node.id === targetId) return newPath;
            if (node.children) {
                const found = findPath(node.children, targetId, newPath);
                if (found) return found;
            }
        }
        return null;
    };

    if (isLoading) {
        return <div className="p-8 space-y-4 flex flex-col items-center">
            <Skeleton className="h-24 w-64" />
            <div className="flex gap-8">
                <Skeleton className="h-64 w-48" />
                <Skeleton className="h-64 w-48" />
            </div>
        </div>;
    }

    if (!tree || tree.length === 0) {
        return <div className="text-center p-8 text-muted-foreground">Chưa có dữ liệu phòng ban</div>;
    }

    const effectiveRootId = activeRootId || tree[0].id;
    let breadcrumbPath = findPath(tree, effectiveRootId) || [tree[0]];
    const activeNode = breadcrumbPath[breadcrumbPath.length - 1];

    return (
        <DndProvider backend={HTML5Backend}>
            <div className="w-full overflow-x-auto p-8 lg:p-12 bg-muted/10 min-h-[500px] border rounded-xl">
                {/* Breadcrumbs */}
                <div className="mb-6 flex flex-wrap items-center gap-2 text-sm font-medium">
                    <span
                        className="text-muted-foreground hover:text-primary cursor-pointer transition-colors flex items-center gap-1"
                        onClick={() => setActiveRootId(tree[0].id)}
                    >
                        <Network className="w-4 h-4" /> Toàn quyền
                    </span>
                    {breadcrumbPath.map((node, index) => (
                        <React.Fragment key={node.id}>
                            <ChevronRight className="w-4 h-4 text-muted-foreground" />
                            <span
                                className={cn(
                                    "cursor-pointer transition-colors px-2 py-1 rounded-md",
                                    index === breadcrumbPath.length - 1
                                        ? "bg-primary/10 text-primary font-bold"
                                        : "hover:bg-muted text-muted-foreground"
                                )}
                                onClick={() => setActiveRootId(node.id)}
                            >
                                {node.name}
                            </span>
                        </React.Fragment>
                    ))}
                </div>

                <div className="mb-12 text-center bg-card p-4 rounded-xl border shadow-sm max-w-xl mx-auto flex items-center gap-4">
                    <div className="p-3 bg-primary/10 rounded-full">
                        <Move className="w-5 h-5 text-primary" />
                    </div>
                    <div className="text-left">
                        <h3 className="font-semibold text-sm">Chế độ phân tầng (Drill-down)</h3>
                        <p className="text-xs text-muted-foreground mt-0.5">Click đúp vào một Node để lặn sâu vào Phòng/Khối đó. Bạn cũng có thể kéo thả để cập nhật cấp trực thuộc.</p>
                    </div>
                </div>

                <div className="min-w-[800px] flex gap-12 justify-center items-start pb-20">
                    <OrgNode
                        key={activeNode.id}
                        node={activeNode}
                        level={0}
                        onNodeClick={setActiveRootId}
                    />
                </div>
            </div>
        </DndProvider>
    );
}

function OrgNode({ node, level = 0, onNodeClick }: { node: DepartmentNode, level?: number, onNodeClick: (id: string) => void }) {
    const { mutate: moveDepartment, isPending } = useMoveDepartment();

    const [{ isDragging }, dragRef] = useDrag(() => ({
        type: ITEM_TYPE,
        item: { id: node.id, name: node.name },
        collect: (monitor) => ({
            isDragging: !!monitor.isDragging(),
        }),
    }));

    const [{ isOver }, dropRef] = useDrop(() => ({
        accept: ITEM_TYPE,
        drop: (item: { id: string, name: string }) => {
            if (item.id !== node.id) {
                if (window.confirm(`Xác nhận chuyển "${item.name}" làm đơn vị trực thuộc "${node.name}"?`)) {
                    moveDepartment({ sourceId: item.id, targetId: node.id }, {
                        onSuccess: () => toast.success(`Đã chuyển ${item.name} thành công.`),
                        onError: (err: any) => toast.error(err.response?.data?.message || err.message || "Lỗi khi chuyển phòng ban"),
                    });
                }
            }
        },
        collect: (monitor) => ({
            isOver: !!monitor.isOver() && monitor.getItem()?.id !== node.id,
        }),
    }), [node.id, moveDepartment]);

    // @ts-ignore
    const attachRef = (el: HTMLDivElement | null) => {
        dragRef(dropRef(el));
    };

    const hasChildren = node.children && node.children.length > 0;
    const showChildren = level < 1 && hasChildren;

    return (
        <div className="flex flex-col items-center z-10 transition-all duration-300 animate-in fade-in zoom-in group/node">
            <div ref={attachRef} className="relative z-20 cursor-grab active:cursor-grabbing">
                <Card
                    className={cn(
                        "w-64 border-2 transition-all duration-200 relative mb-8 shadow-sm group",
                        isOver ? "border-emerald-500 bg-emerald-500/10 ring-4 ring-emerald-500/20 scale-105" : "hover:border-primary/50 hover:shadow-md bg-card",
                        isDragging ? "opacity-40 scale-95 border-dashed" : "opacity-100",
                        level > 0 && hasChildren ? "cursor-pointer hover:ring-2 ring-primary/20" : ""
                    )}
                    onDoubleClick={() => {
                        if (level > 0 && hasChildren) {
                            onNodeClick(node.id);
                        }
                    }}
                >
                    {isPending && (
                        <div className="absolute inset-0 bg-background/50 backdrop-blur-[2px] rounded-xl flex flex-col items-center justify-center z-50">
                            <Loader2 className="w-6 h-6 animate-spin text-primary" />
                            <span className="text-xs font-semibold mt-2">Đang lưu...</span>
                        </div>
                    )}
                    {/* Connector line to top */}
                    <div className="absolute -top-8 left-1/2 w-px h-8 bg-border" />

                    <CardContent className="p-4 flex flex-col items-center text-center space-y-3 pt-6">
                        <div className="relative pt-2">
                            <Avatar className="h-16 w-16 border-2 border-background shadow-sm pointer-events-none">
                                <AvatarImage src={getAvatarVariant(node.manager?.fullName || 'N/A')} />
                                <AvatarFallback><User className="h-8 w-8 text-muted-foreground" /></AvatarFallback>
                            </Avatar>
                            <Badge className="absolute -bottom-2 -right-2 px-1.5 py-0.5 text-[10px]" variant="secondary">
                                Manager
                            </Badge>
                        </div>

                        <div>
                            <h3 className="font-bold text-lg leading-tight">{node.name}</h3>
                            <p className="text-xs text-muted-foreground mt-1 font-mono uppercase tracking-wide">{node.code}</p>
                        </div>

                        <div className="w-full pt-2 border-t mt-2">
                            {node.manager ? (
                                <>
                                    <p className="text-sm font-medium">{node.manager.fullName}</p>
                                    <p className="text-xs text-muted-foreground italic">{node.manager.position?.name || 'Quản lý'}</p>
                                </>
                            ) : (
                                <p className="text-sm text-muted-foreground italic">Chưa có quản lý</p>
                            )}
                        </div>

                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded-full mt-1">
                            <Users className="h-3 w-3" />
                            <span>{node._count?.employees || 0} nhân sự</span>
                        </div>

                        {/* Drill-down prompt */}
                        {level > 0 && hasChildren && (
                            <div
                                className="mt-4 pt-3 w-full border-t border-dashed text-xs font-semibold text-primary/80 flex justify-center items-center gap-1 hover:text-primary transition-colors cursor-pointer"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onNodeClick(node.id);
                                }}
                            >
                                Xem {node.children?.length} đơn vị con <ChevronRight className="w-3 h-3" />
                            </div>
                        )}
                    </CardContent>

                    {/* Connector line to bottom if rendering children */}
                    {showChildren && (
                        <div className="absolute -bottom-8 left-1/2 w-px h-8 bg-border transition-all group-hover:bg-primary/50 pointer-events-none" />
                    )}

                    {/* Visual drag handle hint */}
                    <div className="absolute -top-3 -right-3 w-7 h-7 bg-muted text-muted-foreground rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm pointer-events-none border">
                        <Move className="w-3.5 h-3.5" />
                    </div>
                </Card>
            </div>

            {showChildren && (
                <div className="flex gap-8 relative mt-0">
                    {/* Horizontal connector line */}
                    {node.children && node.children.length > 1 && (
                        <div className="absolute -top-8 left-[calc(50%-50%+128px)] right-[calc(50%-50%+128px)] h-px bg-border sm:left-1/4 sm:right-1/4 w-[calc(100%-16rem)] mx-auto" />
                    )}

                    {/* Actually, drawing perfect lines in Flexbox is hard dynamically without fixed widths.
                        Let's try a simpler approach: Container line
                    */}
                    <div className="absolute -top-8 left-0 right-0 h-px bg-transparent">
                        {/* We need logical lines. Let's start simple: render children. 
                              The sophisticated lines usually require a Tree UI library.
                              For now, I will render specific connector logic for visual structure. 
                          */}
                    </div>

                    {node.children?.map((child) => (
                        <div key={child.id} className="relative flex flex-col items-center">
                            {/* Top vertical connector for child */}
                            <div className="w-px h-8 bg-border absolute -top-8 left-1/2" />
                            <OrgNode node={child} level={level + 1} onNodeClick={onNodeClick} />
                        </div>
                    ))}

                    {/* Wrapper for horizontal line connection */}
                    <div className="absolute -top-8 h-px bg-border left-[50%] right-[50%] w-[calc(100%-16rem)] -z-10"
                        style={{
                            left: node.children && node.children.length > 1 ? '8rem' : '50%',
                            right: node.children && node.children.length > 1 ? '8rem' : '50%'
                        }}
                    />
                </div>
            )}
        </div>
    );
}
