const fs = require('fs');
const path = require('path');

const files = [
    {
        path: 'd:/00.APPS/EOFFICE/apps/web/src/app/(dashboard)/factories/page.tsx',
        module: 'factories',
        type: 'Factory',
        hook: 'useUpdateFactory',
        importService: '@/services/factory.service'
    },
    {
        path: 'd:/00.APPS/EOFFICE/apps/web/src/app/(dashboard)/divisions/page.tsx',
        module: 'divisions',
        type: 'Division',
        hook: 'useUpdateDivision',
        importService: '@/services/division.service'
    },
    {
        path: 'd:/00.APPS/EOFFICE/apps/web/src/app/(dashboard)/departments/page.tsx',
        module: 'departments',
        type: 'Department',
        hook: 'useUpdateDepartment',
        importService: '@/services/department.service'
    },
    {
        path: 'd:/00.APPS/EOFFICE/apps/web/src/app/(dashboard)/sections/page.tsx',
        module: 'sections',
        type: 'Section',
        hook: 'useUpdateSection',
        importService: '@/services/section.service'
    }
];

files.forEach(file => {
    let content = fs.readFileSync(file.path, 'utf-8');

    // 1. Add useMemo and Switch
    if (content.includes('import { useState }')) {
        content = content.replace('import { useState }', 'import { useState, useMemo }');
    }
    if (!content.includes('@/components/ui/switch')) {
         content = content.replace('import { useState, useMemo } from "react";', 'import { useState, useMemo } from "react";\nimport { Switch } from "@/components/ui/switch";');
    }

    // 2. Add useUpdateX to service import
    const serviceImportRegex = new RegExp(`import\\s+\\{([^}]+)\\}\\s+from\\s+"${file.importService}"`);
    content = content.replace(serviceImportRegex, (match, imports) => {
        if (!imports.includes(file.hook)) {
            return `import { ${imports.trim().split(',').map(i => i.trim()).concat(file.hook).join(', ')} } from "${file.importService}"`;
        }
        return match;
    });

    // 3. Convert const columns to getColumns
    const columnsRegex = new RegExp(`const columns:\\s*OrgColumnDef<${file.type}>\\[\\]\\s*=\\s*\\[`);
    content = content.replace(columnsRegex, `const getColumns = (onToggle: (id: string, checked: boolean) => void): OrgColumnDef<${file.type}>[] => [`);

    // 4. Insert OrgChart column before status
    const statusColumnRegex = /\{\s*key:\s*"status"/;
    const orgChartColumn = `    {
        key: "showOnOrgChart",
        label: "Sơ đồ",
        className: "w-[80px] text-center",
        render: (item) => (
            <div className="flex justify-center" onClick={(e) => e.stopPropagation()}>
                <Switch
                    checked={(item as any).showOnOrgChart}
                    className="data-[state=checked]:bg-emerald-500 scale-90"
                    onCheckedChange={(checked) => onToggle(item.id, checked)}
                />
            </div>
        ),
    },
    {
        key: "status"`;
    content = content.replace(statusColumnRegex, orgChartColumn);

    // 5. Update Component body
    const componentRegex = /(const\s+\{\s*sortKey[^\}]+\}\s*=\s*useSortState\("[^"]+",\s*"code",\s*"asc"\);)/;
    
    content = content.replace(componentRegex, (match) => {
         return `${match}\n\n    const update${file.type} = ${file.hook}();\n    const columns = useMemo(() => getColumns(async (id, checked) => {\n        try {\n            await update${file.type}.mutateAsync({ id, showOnOrgChart: checked });\n            toast.success("Cập nhật thành công");\n        } catch {\n            toast.error("Lỗi cập nhật");\n        }\n    }), [update${file.type}]);`;
    });

    fs.writeFileSync(file.path, content);
    console.log(`Updated ${file.path}`);
});
