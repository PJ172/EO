const fs = require('fs');
const path = require('path');

const filePath = path.join('d:', '00.APPS', 'eOffice', 'apps', 'web', 'src', 'app', '(dashboard)', 'leaves', 'page.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// Remove Dialog imports
content = content.replace(/import \{\n\s*Dialog,\n\s*DialogContent,\n\s*DialogDescription,\n\s*DialogFooter,\n\s*DialogHeader,\n\s*DialogTitle,\n\s*DialogTrigger,\n\} from "@\/components\/ui\/dialog";\n/, '');

// Remove Textarea import (used only in dialog)
content = content.replace(/import \{ Textarea \} from "@\/components\/ui\/textarea";\n/, '');
content = content.replace(/import \{ Input \} from "@\/components\/ui\/input";\n/, '');

// Add useRouter import after useState
content = content.replace(/import \{ useState \} from "react";/, 'import { useState } from "react";\nimport { useRouter } from "next/navigation";');

// Remove approveData and comment state from LeaveListTable
content = content.replace(/\s*const \[approveData, setApproveData\] = useState<\{ id: string; decision: "APPROVED" \| "REJECTED" \} \| null>\(null\);\n/, '\n');
content = content.replace(/\s*const \[comment, setComment\] = useState\(""\);\n/, '\n');

// Add router inside LeaveListTable
content = content.replace(/(function LeaveListTable\([\s\S]*?\) \{\n\s*const \{ data, isLoading \})/,
    `$1`);
content = content.replace(/const cancelLeave = useCancelLeave\(\);/, 'const router = useRouter();\n    const cancelLeave = useCancelLeave();');

// Replace setApproveData calls with router.push
content = content.replace(/onClick=\{\(\) => setApproveData\(\{ id: leave\.id, decision: "APPROVED" \}\)\}/,
    `onClick={() => router.push(\`/leaves/\${leave.id}/approve?decision=APPROVED\`)}`);
content = content.replace(/onClick=\{\(\) => setApproveData\(\{ id: leave\.id, decision: "REJECTED" \}\)\} className="text-destructive"/,
    `onClick={() => router.push(\`/leaves/\${leave.id}/approve?decision=REJECTED\`)} className="text-destructive"`);

// Remove the Approval Dialog entirely
const dialogRegex = /\s*\{\/\* Approval Dialog \*\/\}[\s\S]*?<\/Dialog>\s*\n/;
content = content.replace(dialogRegex, '\n');

// Remove handleApprove function
content = content.replace(/\s*const handleApprove = async[\s\S]*?\};\n/, '\n');

fs.writeFileSync(filePath, content, 'utf8');
console.log('Successfully refactored leaves/page.tsx');
