const fs = require('fs');
const path = 'd:/00.APPS/eOffice/apps/web/src/app/(dashboard)/bookings/page.tsx';
let content = fs.readFileSync(path, 'utf8');

// Replace handleEventDoubleClick
content = content.replace(
    /const handleEventDoubleClick = \(event: any\) => \{[\s\S]*?else \{\s*toast\.error\('Bạn không có quyền chỉnh sửa lịch này'\);\s*\}\s*\};/g,
    `const handleEventDoubleClick = (event: any) => {
        if (user?.employee?.id === event.organizerEmployeeId) {
            router.push('/bookings/' + event.id + '/edit');
        } else {
            toast.error('Bạn không có quyền chỉnh sửa lịch này');
        }
    };`);

// Replace handleOpenBookingModal
content = content.replace(
    /const handleOpenBookingModal = \(\{[^\}]+\}\) => \{[\s\S]*?setIsBookingOpen\(true\);\s*\};/g,
    `const handleOpenBookingModal = ({ start, roomId }: { start: Date; roomId?: string }) => {
        let url = \`/bookings/new?date=\${format(start, 'yyyy-MM-dd')}\`;
        
        const now = new Date();
        const minutes = now.getMinutes();
        const remainder = minutes % 15;
        const roundedMinutes = remainder === 0 ? minutes : minutes + (15 - remainder);

        now.setMinutes(roundedMinutes);
        now.setSeconds(0);
        const end = addMinutes(now, 30);

        url += \`&startTime=\${format(now, 'HH:mm')}&endTime=\${format(end, 'HH:mm')}\`;
        if (roomId) url += \`&roomId=\${roomId}\`;

        router.push(url);
    };`);

// Replace handleNewBooking
content = content.replace(
    /const handleNewBooking = \(\) => \{[\s\S]*?setIsBookingOpen\(true\);\s*\}/g,
    `const handleNewBooking = () => {
        router.push('/bookings/new');
    }`);

// Add useRouter tracking
if (!content.includes('import { useRouter }')) {
    content = content.replace("import { cn } from '@/lib/utils';", "import { cn } from '@/lib/utils';\nimport { useRouter } from 'next/navigation';");
    content = content.replace('const { user } = useAuth();', 'const { user } = useAuth();\n    const router = useRouter();');
}

// Remove the Dialog
content = content.replace(/\{\/\* Booking Dialog \*\*\/\}[\s\S]*?\{\/\* Booking Report Dialog \*\*\/\}/,
    `{/* Booking Action Button Mobile */}
            <Button onClick={handleNewBooking} className="md:hidden absolute bottom-4 right-4 shadow-xl rounded-full h-14 w-14 z-50 p-0 text-2xl">
                +
            </Button>
            {/* Booking Report Dialog */}`);

// Clear up some old states
content = content.replace(/const \[isBookingOpen, setIsBookingOpen\] = useState\(false\);\s*/, '');
content = content.replace(/const createBooking = useCreateBooking\(\);\s*/, '');
content = content.replace(/const updateBooking = useUpdateBooking\(\);\s*/, '');

fs.writeFileSync(path, content, 'utf8');
console.log('Bookings page refactored successfully.');
