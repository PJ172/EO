const fs = require('fs');
const path = require('path');

const filePath = path.join('d:', '00.APPS', 'eOffice', 'apps', 'web', 'src', 'app', '(dashboard)', 'kpi', 'page.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Remove states related to the Dialog
content = content.replace(/\s*const \[isNewPeriodOpen, setIsNewPeriodOpen\] = useState\(false\);\n/, '\n');
content = content.replace(/\s*const \[newPeriod, setNewPeriod\] = useState\(\{[\s\S]*?\}\);\n/, '\n');

// 2. Remove Create Mutation and handleCreatePeriod functions
content = content.replace(/\s*const createPeriodMutation[\s\S]*?\}\);\n/g, '\n');
content = content.replace(/\s*const handleCreatePeriod[\s\S]*?\}\n\s*};\n/g, '\n');

// 3. Replace the Dialog Trigger with a standard Button with onClick routing
const dialogJSXRegex = /<Dialog open=\{isNewPeriodOpen\} onOpenChange=\{setIsNewPeriodOpen\}>[\s\S]*?<\/Dialog>/;
const newButtonJSX = `<Button className="h-10" onClick={() => router.push('/kpi/new')}>
                            <Plus className="mr-2 h-4 w-4" />
                            Thêm mới
                        </Button>`;
content = content.replace(dialogJSXRegex, newButtonJSX);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Successfully refactored kpi/page.tsx');
