import re

file_path = r"d:\00.APPS\EOFFICE\apps\web\src\components\employees\employee-form.tsx"

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace any onClick={handleSubmit(onSubmit)} with second argument
pattern = r'onClick=\{handleSubmit\(onSubmit\)\}'

new_content = re.sub(
    pattern, 
    'onClick={handleSubmit(onSubmit, (errors) => {\n                                                const errorMessages = getErrorMessages(errors).join(", ");\n                                                toast.error(`Vui lòng kiểm tra lại: ${errorMessages}`);\n                                            })}', 
    content
)

if new_content != content:
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(new_content)
    print("Successfully replaced all remaining instances!")
else:
    print("No other standalone handleSubmit(onSubmit) found!")
