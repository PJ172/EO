"use client";

import { ProjectTask, TaskPriority, TaskStatus } from "@/types/project";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Edit2, Trash2 } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
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
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { projectsApi } from "@/lib/api-client";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getAvatarUrl } from "@/lib/avatar-utils";
import { EmployeeAvatar } from "@/components/ui/employee-avatar";

interface TasksTableProps {
    tasks: ProjectTask[];
    members: any[];
    projectId: string;
}

export function TasksTable({ tasks, members, projectId }: TasksTableProps) {    const [taskToDelete, setTaskToDelete] = useState<ProjectTask | null>(null);
    const router = useRouter();
    const queryClient = useQueryClient();

    const deleteMutation = useMutation({
        mutationFn: (id: string) => projectsApi.deleteTask(id),
        onSuccess: () => {
            toast.success("Đã xóa công việc");
            setTaskToDelete(null);
            queryClient.invalidateQueries({ queryKey: ["projects", projectId] });
            queryClient.invalidateQueries({ queryKey: ["projects"] });
        },
        onError: (error: any) => {
            toast.error(error.error?.message || "Lỗi xóa công việc");
        },
    });

    const getStatusBadge = (status: TaskStatus) => {
        switch (status) {
            case TaskStatus.TODO:
                return <Badge variant="secondary">Cần làm</Badge>;
            case TaskStatus.IN_PROGRESS:
                return <Badge className="bg-blue-500 hover:bg-blue-600">Đang làm</Badge>;
            case TaskStatus.REVIEW:
                return <Badge className="bg-orange-500 hover:bg-orange-600">Review</Badge>;
            case TaskStatus.DONE:
                return <Badge className="bg-green-500 hover:bg-green-600">Hoàn thành</Badge>;
        }
    };

    const getPriorityBadge = (priority: TaskPriority) => {
        switch (priority) {
            case TaskPriority.LOW:
                return <Badge variant="outline" className="text-gray-500">Thấp</Badge>;
            case TaskPriority.MEDIUM:
                return <Badge variant="outline" className="text-blue-500">TB</Badge>;
            case TaskPriority.HIGH:
                return <Badge variant="outline" className="text-orange-500">Cao</Badge>;
            case TaskPriority.URGENT:
                return <Badge variant="destructive">Khẩn cấp</Badge>;
        }
    };

    return (
        <>
            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Tiêu đề</TableHead>
                            <TableHead>Trạng thái</TableHead>
                            <TableHead>Ưu tiên</TableHead>
                            <TableHead>Người thực hiện</TableHead>
                            <TableHead>Ngày bắt đầu</TableHead>
                            <TableHead>Hạn chót</TableHead>
                            <TableHead className="text-right">Thao tác</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {tasks.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} className="h-24 text-center">
                                    Chưa có công việc nào.
                                </TableCell>
                            </TableRow>
                        ) : (
                            tasks.map((task) => (
                                <TableRow key={task.id}>
                                    <TableCell className="font-medium">{task.title}</TableCell>
                                    <TableCell>{getStatusBadge(task.status)}</TableCell>
                                    <TableCell>{getPriorityBadge(task.priority)}</TableCell>
                                    <TableCell>
                                        {task.assignee ? (
                                            <div className="flex items-center gap-2">
                                                <EmployeeAvatar
                                                    avatar={task.assignee.avatar}
                                                    fullName={task.assignee.fullName || ''}
                                                    className="h-6 w-6"
                                                />
                                                <span className="text-sm">{task.assignee.fullName}</span>
                                            </div>
                                        ) : (
                                            <span className="text-gray-400 text-sm">Chưa giao</span>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        {task.startDate ? format(new Date(task.startDate), "dd/MM/yyyy", { locale: vi }) : "-"}
                                    </TableCell>
                                    <TableCell>
                                        {task.dueDate ? format(new Date(task.dueDate), "dd/MM/yyyy", { locale: vi }) : "-"}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => router.push(`/projects/${projectId}/tasks/${task.id}/edit`)}
                                            >
                                                <Edit2 className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="text-red-500 hover:text-red-600"
                                                onClick={() => setTaskToDelete(task)}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            <AlertDialog open={!!taskToDelete} onOpenChange={(open) => !open && setTaskToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Bạn có chắc chắn muốn xóa?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Hành động này không thể hoàn tác. Công việc "{taskToDelete?.title}" sẽ bị xóa vĩnh viễn.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Hủy</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => taskToDelete && deleteMutation.mutate(taskToDelete.id)}
                            className="bg-red-500 hover:bg-red-600"
                        >
                            Xóa
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
