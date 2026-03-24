import { CreateProjectForm } from "@/components/projects/create-project-form";

export const metadata = {
    title: "Tạo dự án mới | eOffice",
    description: "Khởi tạo dự án mới trên hệ thống",
};

export default function NewProjectPage() {
    return <CreateProjectForm />;
}
