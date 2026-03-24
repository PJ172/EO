import os

list_files_config = [
    {
        "filepath": r'd:\00.APPS\EOFFICE\apps\web\src\app\(dashboard)\factories\page.tsx',
        "form_name": "FactoryForm",
        "import_line": 'import { FactoryForm } from "@/components/factories/factory-form";',
        "create_old": "router.push('/factories/new')",
        "edit_old_pattern": "router.push(`/factories/${item.id}/edit`)",
        "id_prop": "factoryId",
        "dialogs_old": "dialogs={\n                    <ImportDepartmentDialog",
        "dialogs_new_slot": """dialogs={
                    <>
                        <FactoryForm 
                            variant="drawer"
                            open={isFormOpen}
                            onOpenChange={setIsFormOpen}
                            factoryId={selectedId}
                            onSuccess={refetch}
                        />
                        <ImportDepartmentDialog"""
    },
    {
        "filepath": r'd:\00.APPS\EOFFICE\apps\web\src\app\(dashboard)\divisions\page.tsx',
        "form_name": "DivisionForm",
        "import_line": 'import { DivisionForm } from "@/components/divisions/division-form";',
        "create_old": "router.push('/divisions/new')",
        "edit_old_pattern": "router.push(`/divisions/${item.id}/edit`)",
        "id_prop": "divisionId",
        "dialogs_old": "dialogs={\n                    <ImportDepartmentDialog",
        "dialogs_new_slot": """dialogs={
                    <>
                        <DivisionForm 
                            variant="drawer"
                            open={isFormOpen}
                            onOpenChange={setIsFormOpen}
                            divisionId={selectedId}
                            onSuccess={refetch}
                        />
                        <ImportDepartmentDialog"""
    },
    {
        "filepath": r'd:\00.APPS\EOFFICE\apps\web\src\app\(dashboard)\departments\page.tsx',
        "form_name": "DepartmentForm",
        "import_line": 'import { DepartmentForm } from "@/components/departments/department-form";',
        "create_old": "router.push('/departments/new')",
        "edit_old_pattern": "router.push(`/departments/${item.id}/edit`)",
        "id_prop": "departmentId",
        "dialogs_old": "dialogs={\n                    <ImportDepartmentDialog",
        "dialogs_new_slot": """dialogs={
                    <>
                        <DepartmentForm 
                            variant="drawer"
                            open={isFormOpen}
                            onOpenChange={setIsFormOpen}
                            departmentId={selectedId}
                            onSuccess={refetch}
                        />
                        <ImportDepartmentDialog"""
    },
    {
        "filepath": r'd:\00.APPS\EOFFICE\apps\web\src\app\(dashboard)\sections\page.tsx',
        "form_name": "SectionForm",
        "import_line": 'import { SectionForm } from "@/components/sections/section-form";',
        "create_old": "router.push('/sections/new')",
        "edit_old_pattern": "router.push(`/sections/${item.id}/edit`)",
        "id_prop": "sectionId",
        "dialogs_old": "dialogs={\n                    <ImportDepartmentDialog",
        "dialogs_new_slot": """dialogs={
                    <>
                        <SectionForm 
                            variant="drawer"
                            open={isFormOpen}
                            onOpenChange={setIsFormOpen}
                            sectionId={selectedId}
                            onSuccess={refetch}
                        />
                        <ImportDepartmentDialog"""
    },
    {
        "filepath": r'd:\00.APPS\EOFFICE\apps\web\src\app\(dashboard)\job-titles\page.tsx',
        "form_name": "JobTitleForm",
        "import_line": 'import { JobTitleForm } from "@/components/job-titles/job-title-form";',
        "create_old": "router.push('/job-titles/new')",
        "edit_old_pattern": "router.push(`/job-titles/${item.id}/edit`)",
        "id_prop": "jobTitleId",
        "dialogs_old": "dialogs={\n                    <>\n                        <ImportJobTitleDialog",
        "dialogs_new_slot": """dialogs={
                    <>
                        <JobTitleForm 
                            variant="drawer"
                            open={isFormOpen}
                            onOpenChange={setIsFormOpen}
                            jobTitleId={selectedId}
                            onSuccess={refetch}
                        />
                        <ImportJobTitleDialog"""
    }
]

for cfg in list_files_config:
    filepath = cfg["filepath"]
    if not os.path.exists(filepath):
        print(f"File not found: {filepath}")
        continue

    with open(filepath, 'r', encoding='utf-8') as f:
        code = f.read()

    # 1. Imports
    if cfg["form_name"] not in code:
        code = code.replace(
            'import { useRouter',
            cfg["import_line"] + '\nimport { useRouter'
        )

    # 2. State injection
    if "const [isFormOpen, setIsFormOpen]" not in code:
        code = code.replace(
            'const router = useRouter();',
            'const router = useRouter();\n    const [isFormOpen, setIsFormOpen] = useState(false);\n    const [selectedId, setSelectedId] = useState<string | null>(null);'
        )

    # 3. Create/Edit click replacement
    code = code.replace(cfg["create_old"], " { setSelectedId(null); setIsFormOpen(true); }")
    # For Edit, exact match search with backticks
    code = code.replace(cfg["edit_old_pattern"], " { setSelectedId(item.id); setIsFormOpen(true); }")

    # 4. Dialogs slot injection
    if cfg["dialogs_old"] in code:
        code = code.replace(cfg["dialogs_old"], cfg["dialogs_new_slot"])
    else:
        # For JobTitle which may have fragment already
        if "dialogs={\n                    <>" in code:
             code = code.replace("dialogs={\n                    <>", cfg["dialogs_new_slot"])

    # Ensure close tags are updated if replacing open slots
    if cfg["id_prop"] != "jobTitleId": # For Department/Section/etc
        code = code.replace(
            'type="COMPANY"\n                    />\n                }',
            'type="COMPANY"\n                        />\n                    </>\n                }'
        )
        code = code.replace(
            'type="FACTORY"\n                    />\n                }',
            'type="FACTORY"\n                        />\n                    </>\n                }'
        )
        code = code.replace(
            'type="DIVISION"\n                    />\n                }',
            'type="DIVISION"\n                        />\n                    </>\n                }'
        )
        code = code.replace(
            'type="DEPARTMENT"\n                    />\n                }',
            'type="DEPARTMENT"\n                        />\n                    </>\n                }'
        )
        code = code.replace(
            'type="SECTION"\n                    />\n                }',
            'type="SECTION"\n                        />\n                    </>\n                }'
        )

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(code)

    print(f"SUCCESS: {filepath}")
print("ALL BATCH LIST UPDATES COMPLETE")
