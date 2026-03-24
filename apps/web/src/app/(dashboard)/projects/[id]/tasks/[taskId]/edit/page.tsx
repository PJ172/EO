"use client";

import { useQuery } from "@tanstack/react-query";
import { projectsApi } from "@/lib/api-client";
import { TaskForm } from "@/components/projects/task-form";
import { Loader2 } from "lucide-react";
import { useParams, useRouter } from "next/navigation";

export default function EditTaskPage() {
    const params = useParams();
    const projectId = params.id as string;
    const taskId = params.taskId as string;

    const { data: project, isLoading } = useQuery({
        queryKey: ["project", projectId],
        queryFn: () => projectsApi.getOne(projectId),
    });

    if (isLoading) {
        return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }

    if (!project) return <div>Dự án không tồn tại</div>;

    const taskToEdit = project.tasks?.find((t: any) => t.id === taskId);

    if (!taskToEdit) return <div>Công việc không tồn tại trong dự án này</div>;

    return <TaskForm
        projectId={projectId}
        existingTasks={project.tasks || []}
        members={project.members || []}
        taskToEdit={taskToEdit}
    />;
}
