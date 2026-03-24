"use client";

import React, { useState } from "react";
import { Gantt, Task, ViewMode } from "gantt-task-react";
import "gantt-task-react/dist/index.css";
import { ProjectTask, TaskStatus } from "@/types/project";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface GanttViewProps {
    tasks: ProjectTask[];
    onTaskChange?: (task: Task) => void;
    onDateChange?: (task: Task) => void;
    onProgressChange?: (task: Task) => void;
    onDelete?: (task: Task) => void;
}

export function GanttView({ tasks, onTaskChange, onDateChange, onProgressChange, onDelete }: GanttViewProps) {
    const [viewMode, setViewMode] = useState<ViewMode>(ViewMode.Day);

    // Convert ProjectTask to Gantt Task
    const ganttTasks: Task[] = tasks.map((t) => ({
        id: t.id,
        type: "task",
        name: t.title,
        start: t.startDate ? new Date(t.startDate) : new Date(),
        end: t.dueDate ? new Date(t.dueDate) : new Date(), // If no end date, single day
        progress: t.progress || 0,
        dependencies: t.predecessors?.map((p) => p.predecessorId) || [],
        isDisabled: false,
        styles: {
            progressColor: getProgressColor(t.status),
            progressSelectedColor: "#ff9e0d",
        },
        project: t.projectId, // Not standard, but maybe valid for grouping
    }));

    // If no tasks, rendering Gantt might crash or show empty. Library handles empty array gracefully usually.
    if (ganttTasks.length === 0) {
        return <div className="p-8 text-center text-muted-foreground">Chưa có công việc nào trong dự án này.</div>;
    }

    return (
        <div className="space-y-4">
            <div className="flex justify-end gap-2">
                <Select
                    value={viewMode}
                    onValueChange={(v) => setViewMode(v as ViewMode)}
                >
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Chế độ xem" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value={ViewMode.Day}>Theo Ngày</SelectItem>
                        <SelectItem value={ViewMode.Week}>Theo Tuần</SelectItem>
                        <SelectItem value={ViewMode.Month}>Theo Tháng</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <div className="border rounded-md overflow-hidden bg-white">
                <Gantt
                    tasks={ganttTasks}
                    viewMode={viewMode}
                    onDateChange={onDateChange}
                    onProgressChange={onProgressChange}
                    onDelete={onDelete}
                    locale="vi"
                    listCellWidth="155px"
                    columnWidth={viewMode === ViewMode.Month ? 300 : undefined}
                />
            </div>
        </div>
    );
}

function getProgressColor(status: string) {
    switch (status) {
        case "DONE": return "#22c55e"; // green
        case "IN_PROGRESS": return "#3b82f6"; // blue
        case "REVIEW": return "#a855f7"; // purple
        case "CANCELLED": return "#ef4444"; // red
        default: return "#cbd5e1"; // slate
    }
}
