import re

file_path = r"d:\00.APPS\EOFFICE\apps\web\src\components\employees\employee-form.tsx"

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Match the React Node inside toast.error
pattern = r'(const errorMessages = getErrorMessages\(errors\);\s*toast\.error\(\s*<divclassName="space-y-1">.*?<\/div>\s*\);)'
# Wait, let's be more general but safe
target = """const errorMessages = getErrorMessages(errors);
                                                toast.error(
                                                    <div className="space-y-1">
                                                        <div className="font-bold">Vui lòng kiểm tra lại:</div>
                                                        <ul className="list-disc pl-4 text-xs font-normal">
                                                            {errorMessages.map((msg, i) => <li key={i}>{msg}</li>)}
                                                        </ul>
                                                    </div>
                                                );"""

# Let's replace ONLY that exact target with regex with spaces allowed
pattern = r'const errorMessages = getErrorMessages\(errors\);\s*toast\.error\(\s*<div className="space-y-1">[\s\S]*?<\/div>\s*\);'

new_content = re.sub(
    pattern, 
    'const errorMessages = getErrorMessages(errors).join(", ");\n                                                toast.error(`Vui lòng kiểm tra lại: ${errorMessages}`);', 
    content
)

if new_content == content:
    print("No matches found/replaced!")
    # Let's try matching with more flexibility
    pattern2 = r'errorMessages\.map\(\(msg, i\) => <li key=\{i\}>\{msg\}<\/li>\)'
    if re.search(pattern2, content):
        print("Found inner map, replacing block...")
        # Match from const errorMessages to );
        pattern3 = r'const errorMessages = getErrorMessages\(errors\);[\s\S]*?toast\.error\([\s\S]*?<\/div>[\s\S]*?\);'
        new_content = re.sub(
            pattern3,
            'const errorMessages = getErrorMessages(errors).join(", ");\n                                                toast.error(`Vui lòng kiểm tra lại: ${errorMessages}`);',
            content
        )

if new_content != content:
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(new_content)
    print("Successfully replaced!")
else:
    print("Failed to replace with regex either!")
