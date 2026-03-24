"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { projectsApi } from "@/lib/api-client";
import { Project, ProjectTask } from "@/types/project";
import { useParams, useRouter } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Calendar, Users, FolderKanban, ArrowLeft, Plus } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { GanttView } from "@/components/projects/gantt-view";
import { TasksTable } from "@/components/projects/tasks-table";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

export default function ProjectDetailsPage() {
    const params = useParams();
    const id = params.id as string;
    const router = useRouter();
    const queryClient = useQueryClient();

    const { data: project, isLoading } = useQuery({
        queryKey: ["project", id],
        queryFn: () => projectsApi.getOne(id),
    });

    const updateTaskMutation = useMutation({
        mutationFn: ({ taskId, data }: { taskId: string; data: any }) =>
            projectsApi.updateTask(taskId, data),
        onSuccess: () => {
            toast.success("Cập nhật công việc thành công");
            queryClient.invalidateQueries({ queryKey: ["project", id] });
        },
        onError: () => {
            toast.error("Lỗi cập nhật công việc");
        },
    });

    if (isLoading) {
        return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }

    if (!project) {
        return <div>Không tìm thấy dự án</div>;
    }

    const handleGanttChange = (task: any) => {
        // Map Gantt Task back to API DTO
        updateTaskMutation.mutate({
            taskId: task.id,
            data: {
                startDate: task.start.toISOString(),
                dueDate: task.end.toISOString(),
                progress: task.progress,
            }
        });
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" asChild>
                    <Link href="/projects"><ArrowLeft className="h-4 w-4" /></Link>
                </Button>
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">{project.name}</h2>
                    <div className="flex items-center gap-2 text-muted-foreground text-sm">
                        <span className="font-mono">{project.code}</span>
                        <span>•</span>
                        <span>{project.manager?.fullName}</span>
                    </div>
                </div>
                <div className="ml-auto flex gap-2">
                    <Button onClick={() => router.push(`/projects/${id}/tasks/new`)}>
                        <Plus className="mr-2 h-4 w-4" /> Thêm công việc
                    </Button>
                </div>
            </div>

            <Tabs defaultValue="gantt" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="overview">Tổng quan</TabsTrigger>
                    <TabsTrigger value="gantt">Biểu đồ Gantt</TabsTrigger>
                    <TabsTrigger value="tasks">Danh sách công việc</TabsTrigger>
                    <TabsTrigger value="members">Thành viên</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Thôngĩtin dự án</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <h4 className="font-semibold">Mô tả</h4>
                                <p className="text-muted-foreground">{project.description || "Chưa có mô tả"}</p>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <h4 className="font-semibold">Thời gian</h4>
                                    <div className="flex items-center mt-1">
                                        <Calendar className="mr-2 h-4 w-4 text-muted-foreground" />
                                        {format(new Date(project.startDate), "dd/MM/yyyy", { locale: vi })}
                                        {project.endDate && ` - ${format(new Date(project.endDate), "dd/MM/yyyy", { locale: vi })}`}
                                    </div>
                                </div>
                                <div>
                                    <h4 className="font-semibold">Trạng thái</h4>
                                    <div className="mt-1">
                                        <Badge>{project.status}</Badge>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="gantt" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Tiến độ dự án</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="min-h-[500px]">
                                <GanttView
                                    tasks={project.tasks || []}
                                    onDateChange={handleGanttChange}
                                    onProgressChange={handleGanttChange}
                                />
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="tasks">
                    <Card>
                        <CardContent className="mt-4">
                            <TasksTable tasks={project.tasks || []} members={project.members || []} projectId={id} />
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="members">
                    <Card>
                        <CardContent className="pt-6">
                            <p className="text-muted-foreground text-center">Quản lý thành viên đang được phát triển.</p>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
