import os
import re

TARGET_DIR = r"d:\00.APPS\EOFFICE\apps\web\src"

def process_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
        
    original = content
    
    # regex to find cases where `import { getAvatarVariant` was injected AFTER an unclosed `import {`
    # E.g.
    # import {
    # import { getAvatarVariant } from "../../lib/utils";
    
    # We will simply find lines that start exactly with:
    # import { getAvatarVariant } from
    # and if the PREVIOUS line is exactly 'import {' or similar broken state, we fix it.
    
    # Easier automated fix: 
    # Delete the injected line `import { getAvatarVariant } from "...";`
    # And then carefully inject it AFTER an existing safe import, like `import { cn }` or at the top of the file.
    
    if 'getAvatarVariant' in content and 'import { getAvatarVariant }' in content:
        lines = content.split('\n')
        new_lines = []
        needs_import = False
        import_path = ""
        
        for i, line in enumerate(lines):
            # Check for our bad injection
            if line.strip().startswith('import { getAvatarVariant } from'):
                needs_import = True
                import_path = line.split('from')[1].strip().strip('";')
                
                # Check if previous line is broken `import {`
                if i > 0 and lines[i-1].strip() == 'import {':
                    pass # We will remove this line, and we keep `import {`
                continue
            
            new_lines.append(line)
            
        if needs_import:
            # Re-inject safely at the top, after the first import or right at line 0
            for i, line in enumerate(new_lines):
                if line.startswith('import '):
                    new_lines.insert(i, f'import {{ getAvatarVariant }} from "{import_path}";')
                    break
            else:
                new_lines.insert(0, f'import {{ getAvatarVariant }} from "{import_path}";')
                
        content = '\n'.join(new_lines)
        
    if content != original:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Fixed: {filepath}")

for root, dirs, files in os.walk(TARGET_DIR):
    for file in files:
        if file.endswith(('.tsx', '.ts')):
            process_file(os.path.join(root, file))
            
print("Done")
