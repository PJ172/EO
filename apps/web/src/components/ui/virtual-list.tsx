"use client";

import * as React from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { cn } from "@/lib/utils";

interface VirtualListProps<T> {
    items: T[];
    estimateSize: number;
    renderItem: (item: T, index: number) => React.ReactNode;
    className?: string;
    overscan?: number;
    getItemKey?: (item: T, index: number) => string | number;
}

export function VirtualList<T>({
    items,
    estimateSize,
    renderItem,
    className,
    overscan = 5,
    getItemKey,
}: VirtualListProps<T>) {
    const parentRef = React.useRef<HTMLDivElement>(null);

    const virtualizer = useVirtualizer({
        count: items.length,
        getScrollElement: () => parentRef.current,
        estimateSize: () => estimateSize,
        overscan,
        getItemKey: getItemKey
            ? (index) => getItemKey(items[index], index)
            : undefined,
    });

    const virtualItems = virtualizer.getVirtualItems();

    return (
        <div
            ref={parentRef}
            className={cn("overflow-auto", className)}
            style={{ contain: "strict" }}
        >
            <div
                style={{
                    height: `${virtualizer.getTotalSize()}px`,
                    width: "100%",
                    position: "relative",
                }}
            >
                {virtualItems.map((virtualRow) => (
                    <div
                        key={virtualRow.key}
                        data-index={virtualRow.index}
                        ref={virtualizer.measureElement}
                        style={{
                            position: "absolute",
                            top: 0,
                            left: 0,
                            width: "100%",
                            transform: `translateY(${virtualRow.start}px)`,
                        }}
                    >
                        {renderItem(items[virtualRow.index], virtualRow.index)}
                    </div>
                ))}
            </div>
        </div>
    );
}

// Table-specific virtual list
interface VirtualTableProps<T> {
    items: T[];
    columns: {
        key: string;
        header: string;
        width?: string;
        render: (item: T) => React.ReactNode;
    }[];
    rowHeight?: number;
    className?: string;
    onRowClick?: (item: T) => void;
    getItemKey?: (item: T, index: number) => string | number;
}

export function VirtualTable<T>({
    items,
    columns,
    rowHeight = 56,
    className,
    onRowClick,
    getItemKey,
}: VirtualTableProps<T>) {
    const parentRef = React.useRef<HTMLDivElement>(null);

    const virtualizer = useVirtualizer({
        count: items.length,
        getScrollElement: () => parentRef.current,
        estimateSize: () => rowHeight,
        overscan: 10,
        getItemKey: getItemKey
            ? (index) => getItemKey(items[index], index)
            : undefined,
    });

    const virtualItems = virtualizer.getVirtualItems();

    return (
        <div className={cn("border rounded-lg overflow-hidden", className)}>
            {/* Header */}
            <div className="bg-muted/50 border-b flex sticky top-0 z-10">
                {columns.map((col) => (
                    <div
                        key={col.key}
                        className="px-4 py-3 text-sm font-medium text-muted-foreground"
                        style={{ width: col.width || "auto", flex: col.width ? "none" : 1 }}
                    >
                        {col.header}
                    </div>
                ))}
            </div>

            {/* Body with virtual scrolling */}
            <div
                ref={parentRef}
                className="overflow-auto"
                style={{ height: "calc(100vh - 300px)", contain: "strict" }}
            >
                <div
                    style={{
                        height: `${virtualizer.getTotalSize()}px`,
                        width: "100%",
                        position: "relative",
                    }}
                >
                    {virtualItems.map((virtualRow) => {
                        const item = items[virtualRow.index];
                        return (
                            <div
                                key={virtualRow.key}
                                data-index={virtualRow.index}
                                ref={virtualizer.measureElement}
                                className={cn(
                                    "flex border-b hover:bg-accent/50 transition-colors",
                                    onRowClick && "cursor-pointer"
                                )}
                                style={{
                                    position: "absolute",
                                    top: 0,
                                    left: 0,
                                    width: "100%",
                                    height: `${rowHeight}px`,
                                    transform: `translateY(${virtualRow.start}px)`,
                                }}
                                onClick={() => onRowClick?.(item)}
                            >
                                {columns.map((col) => (
                                    <div
                                        key={col.key}
                                        className="px-4 py-3 flex items-center text-sm"
                                        style={{
                                            width: col.width || "auto",
                                            flex: col.width ? "none" : 1,
                                        }}
                                    >
                                        {col.render(item)}
                                    </div>
                                ))}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
