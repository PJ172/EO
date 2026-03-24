import os

dept_path = r'd:\00.APPS\EOFFICE\apps\web\src\app\(dashboard)\departments\page.tsx'
if os.path.exists(dept_path):
    with open(dept_path, 'r', encoding='utf-8') as f:
        code = f.read()
    code = code.replace('<ImportDepartmentDialog\n                        <ImportDepartmentDialog', '<ImportDepartmentDialog')
    with open(dept_path, 'w', encoding='utf-8') as f:
        f.write(code)
    print("Fixed Departments")

fact_path = r'd:\00.APPS\EOFFICE\apps\web\src\app\(dashboard)\factories\page.tsx'
if os.path.exists(fact_path):
    with open(fact_path, 'r', encoding='utf-8') as f:
        code = f.read()
    code = code.replace('<ImportDepartmentDialog\n\n                        <ImportFactoryDialog', '<ImportFactoryDialog')
    with open(fact_path, 'w', encoding='utf-8') as f:
        f.write(code)
    print("Fixed Factories")

print("BATCH FIX COMPLETE")
