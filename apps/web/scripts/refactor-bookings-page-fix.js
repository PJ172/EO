const fs = require('fs');
const path = 'd:/00.APPS/eOffice/apps/web/src/app/(dashboard)/bookings/page.tsx';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(/\{\/\* Booking Dialog \*\/\}[\s\S]*?\{\/\* Booking Report Dialog \*\/\}/g,
    `{/* Booking Action Button Mobile */}
            <Button onClick={handleNewBooking} className="md:hidden absolute bottom-4 right-4 shadow-xl rounded-full h-14 w-14 z-50 p-0 text-2xl">
                +
            </Button>
            {/* Booking Report Dialog */}`);

fs.writeFileSync(path, content, 'utf8');
console.log('Bookings page dialog removed.');
