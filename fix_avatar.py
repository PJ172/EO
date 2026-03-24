import os
import re

TARGET_DIR = r"d:\00.APPS\EOFFICE\apps\web\src"

def process_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
        
    original = content
    
    # Check if file has AvatarImage and needs getAvatarVariant
    if '<AvatarImage' in content and 'src={' in content:
        # Check if already imported
        if 'getAvatarVariant' not in content:
            # Try to add import based on path depth
            depth = filepath.replace(TARGET_DIR, "").count(os.sep)
            if depth > 0:
                rel_path = "../" * (depth - 1) + "lib/utils"
            else:
                rel_path = "./lib/utils"
            
            # Simple heuristic to append after last import
            if 'import ' in content:
                last_import_idx = content.rfind('import ')
                end_of_line = content.find('\n', last_import_idx)
                content = content[:end_of_line] + f'\nimport {{ getAvatarVariant }} from "{rel_path}";' + content[end_of_line:]
        
        # Regex to wrap src={...} -> src={getAvatarVariant(...)}
        # A bit tricky due to nested brackets, we'll try a basic approach:
        # src={x.avatar} -> src={getAvatarVariant(x.avatar)}
        # We will manually replace the most common patterns instead for safety
        
        # Pattern 1: x.avatar
        content = re.sub(r'src=\{([a-zA-Z0-9_?.()]+?avatar[a-zA-Z0-9_?.()]*?)\}', r'src={getAvatarVariant(\1, "thumb")}', content)
        
        # We also want to replace "getAvatarUrl" with "getAvatarVariant" if it already exists, because getAvatarUrl was a local helper in some files.
        content = content.replace("getAvatarUrl(", "getAvatarVariant(")
        
    if content != original:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Updated: {filepath}")

for root, dirs, files in os.walk(TARGET_DIR):
    for file in files:
        if file.endswith(('.tsx', '.ts')):
            process_file(os.path.join(root, file))
            
print("Done")
