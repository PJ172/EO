const fs = require('fs');
const path = require('path');

const filePath = path.join('d:', '00.APPS', 'eOffice', 'apps', 'web', 'src', 'components', 'projects', 'tasks-table.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Add useRouter
content = content.replace(/(import \{ useState \} from "react";)/, `$1\nimport { useRouter } from "next/navigation";`);

// 2. Remove TaskDialog import
content = content.replace(/import \{ TaskDialog \} from "\.\/task-dialog";\n/, '');

// 3. Update component body
content = content.replace(/(const queryClient = useQueryClient\(\);)/, `const router = useRouter();\n    $1`);

// 4. Remove taskToEdit and isEditDialogOpen states
content = content.replace(/\s*const \[taskToEdit, setTaskToEdit\] = useState<ProjectTask \| null>\(null\);\n/, '');
content = content.replace(/\s*const \[isEditDialogOpen, setIsEditDialogOpen\] = useState\(false\);\n/, '');

// 5. Replace Edit Button onClick
content = content.replace(/onClick=\{\(\) => \{\n\s*setTaskToEdit\(task\);\n\s*setIsEditDialogOpen\(true\);\n\s*\}\}/, `onClick={() => router.push(\`/projects/\${projectId}/tasks/\${task.id}/edit\`)}`);

// 6. Remove TaskDialog component call
const dialogRegex = /<TaskDialog[\s\S]*?\/>\s*<AlertDialog/;
content = content.replace(dialogRegex, '<AlertDialog');

fs.writeFileSync(filePath, content, 'utf8');
console.log('Successfully refactored tasks-table.tsx');
