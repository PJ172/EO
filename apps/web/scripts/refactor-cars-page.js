const fs = require('fs');
const path = require('path');

const pagePath = path.join('d:', '00.APPS', 'eOffice', 'apps', 'web', 'src', 'app', '(dashboard)', 'cars', 'page.tsx');
let content = fs.readFileSync(pagePath, 'utf8');

// 1. Add useRouter import
content = content.replace(/(import { useState } from "react";)/, `import { useRouter } from "next/navigation";\n$1`);

// 2. Remove Dialog, Input, Label, Textarea, Select, DatePicker imports
content = content.replace(/import \{\n?\s*Dialog,\n?\s*DialogContent,\n?\s*DialogHeader,\n?\s*DialogTitle,\n?\s*DialogTrigger,\n?\s*DialogFooter,\n?\} from "@\/components\/ui\/dialog";\n/g, '');
content = content.replace(/import { Input } from "@\/components\/ui\/input";\n/g, '');
content = content.replace(/import { Label } from "@\/components\/ui\/label";\n/g, '');
content = content.replace(/import { Textarea } from "@\/components\/ui\/textarea";\n/g, '');
content = content.replace(/import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@\/components\/ui\/select";\n/g, '');
content = content.replace(/import { DatePicker } from "@\/components\/ui\/date-picker";\n/g, '');

// 3. Add useRouter inside component
content = content.replace(/const queryClient = useQueryClient\(\);\n/, `    const queryClient = useQueryClient();\n    const router = useRouter();\n`);

// 4. Remove state variables
content = content.replace(/\s*const \[isNewCarOpen, setIsNewCarOpen\] = useState\(false\);\n/, '');
content = content.replace(/\s*const \[isBookingOpen, setIsBookingOpen\] = useState\(false\);\n/, '');
content = content.replace(/\s*const \[newCar, setNewCar\] = useState\(\{[\s\S]*?\}\);\n/, '');
content = content.replace(/\s*const \[newBooking, setNewBooking\] = useState\(\{(?:[\s\S]*?\}|[\s\S]*?\n\s+\})\);\n/m, '');

// 5. Remove mutations and handlers
content = content.replace(/\s*const createCarMutation = useMutation\(\{[\s\S]*?\}\);\n/m, '');
content = content.replace(/\s*const createBookingMutation = useMutation\(\{[\s\S]*?\}\);\n/m, '');
content = content.replace(/\s*const handleCreateCar = \(\) => \{[\s\S]*?\};\n/m, '');
content = content.replace(/\s*const handleCreateBooking = \(\) => \{[\s\S]*?\};\n/m, '');

// 6. Replace Dialogs with Buttons
const dialogNewCarRegex = /<Dialog open=\{isNewCarOpen\}(?:[\s\S]*?)<\/Dialog>/;
const buttonNewCar = `<Button className="h-10" onClick={() => router.push('/cars/new')}>
                    <Plus className="mr-2 h-4 w-4" /> Thêm mới
                </Button>`;
content = content.replace(dialogNewCarRegex, buttonNewCar);

const dialogBookingRegex = /<Dialog open=\{isBookingOpen\}(?:[\s\S]*?)<\/Dialog>/;
const buttonBooking = `<Button className="h-10" onClick={() => router.push('/cars/bookings/new')}>
                    <Calendar className="mr-2 h-4 w-4" />
                    Đặt xe
                </Button>`;
content = content.replace(dialogBookingRegex, buttonBooking);

fs.writeFileSync(pagePath, content, 'utf8');
console.log('Successfully refactored cars/page.tsx');
