const fs = require('fs');
const path = 'd:/00.APPS/eOffice/apps/web/src/app/(dashboard)/bookings/page.tsx';
let content = fs.readFileSync(path, 'utf8');

// I also need to remove 'handleBookingSubmit' 
content = content.replace(/const handleBookingSubmit = \(\) => \{[\s\S]*?\}\n        \}\n    \};\n/g, '');

// Clean missed variables
content = content.replace(/const \[bookingId, setBookingId\] = useState<string \| null>\(null\);\s*/, '');
content = content.replace(/const \[bookingTitle, setBookingTitle\] = useState\(''\);\s*/, '');
content = content.replace(/const \[bookingContent, setBookingContent\] = useState\(''\);\s*/, '');
content = content.replace(/const \[bookingNote, setBookingNote\] = useState\(''\);\s*/, '');
content = content.replace(/const \[bookingDate, setBookingDate\] = useState\(''\);\s*/, '');
content = content.replace(/const \[bookingStartTime, setBookingStartTime\] = useState\(''\);\s*/, '');
content = content.replace(/const \[bookingEndTime, setBookingEndTime\] = useState\(''\);\s*/, '');
content = content.replace(/const \[bookingRoomId, setBookingRoomId\] = useState\(''\);\s*/, '');
content = content.replace(/const \[selectedAttendees, setSelectedAttendees\] = useState<string\[\]>\(\[\]\);\s*/, '');
content = content.replace(/const \[notify, setNotify\] = useState\(true\);\s*(\/\/.*\n)?/, '');
content = content.replace(/const \[isPrivate, setIsPrivate\] = useState\(false\);\s*/, '');
content = content.replace(/const resetForm = \(\) => \{[\s\S]*?\}\n\s*/, '');

// Remove setIsBookingOpen from onClick handler
content = content.replace(/onClick=\{\(\) => setIsBookingOpen\(true\)\}/g, 'onClick={handleNewBooking}');

// Remove handleDeleteBooking since it references bookingId
content = content.replace(/const handleDeleteBooking = async \(\) => \{[\s\S]*?\}\s*catch[^\}]+\}[\n\s]*\};/, '');


fs.writeFileSync(path, content, 'utf8');
console.log('Bookings page cleaned up unused state');
