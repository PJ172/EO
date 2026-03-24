const fs = require('fs');
const path = require('path');

const pagePath = path.join('d:', '00.APPS', 'eOffice', 'apps', 'web', 'src', 'app', '(dashboard)', 'it-assets', 'page.tsx');
let content = fs.readFileSync(pagePath, 'utf8');

// 1. Setup useRouter
content = content.replace(/(import \{ useState \} from 'react';)/, `import { useState } from 'react';\nimport { useRouter } from 'next/navigation';`);
content = content.replace(/(const queryClient = useQueryClient\(\);)/, `$1\n    const router = useRouter();`);

// 2. Remove Dialog imports
content = content.replace(/import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@\/components\/ui\/dialog';\n/, '');
content = content.replace(/import { Label } from '@\/components\/ui\/label';\n/, '');
content = content.replace(/import { Textarea } from '@\/components\/ui\/textarea';\n/, '');

// 3. Remove States
content = content.replace(/\s*\/\/ Asset Detail & Actions State[\s\S]*?\/\/\s*Form state[\s\S]*?const \[returnNote, setReturnNote\] = useState\(''\);\n/, '');

// 4. Remove QrLoader and Mutations
content = content.replace(/\s*const handleViewQr = async[\s\S]*?setQrLoading\(false\);\n\s*\}\n\s*};\n/m, '');
content = content.replace(/\s*\/\/ Assignment Mutations[\s\S]*?setReturnNote\(''\);\n\s*\}\n\s*}\);\n/m, '');

// 5. Replace Dialogs in JSX
content = content.replace(/\s*\{\/\* Asset Detail Dialog \*\/\}[\s\S]*?(?=<\/div>\n\s*\);)/, '');

// 6. Update Row onClick
content = content.replace(/setSelectedAsset\(\{ \.\.\.asset, statusCfg, condCfg \}\);\n\s*setDetailOpen\(true\);/, `router.push(\`/it-assets/\${asset.id}\`);`);

fs.writeFileSync(pagePath, content, 'utf8');
console.log('Successfully refactored it-assets/page.tsx');
