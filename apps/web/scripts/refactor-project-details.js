const fs = require('fs');
const path = require('path');

const filePath = path.join('d:', '00.APPS', 'eOffice', 'apps', 'web', 'src', 'app', '(dashboard)', 'projects', '[id]', 'page.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. replace imports
content = content.replace(/import \{ TaskDialog \} from "@\/components\/projects\/task-dialog";\n/, 'import { useRouter } from "next/navigation";\n');

// 2. update queryClient inside function to add router
content = content.replace(/const queryClient = useQueryClient\(\);/, 'const router = useRouter();\n    const queryClient = useQueryClient();');

// 3. remove TaskDialog JSX and Add Button
const taskDialogJSX = `<TaskDialog
                        projectId={id}
                        existingTasks={project.tasks || []}
                        members={project.members || []}
                        trigger={
                            <Button>
                                <Plus className="mr-2 h-4 w-4" /> Thêm công việc
                            </Button>
                        }
                    />`;
const newButton = `<Button onClick={() => router.push(\`/projects/\${id}/tasks/new\`)}>
                                <Plus className="mr-2 h-4 w-4" /> Thêm công việc
                            </Button>`;
content = content.replace(taskDialogJSX, newButton);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Successfully refactored projects/[id]/page.tsx');
