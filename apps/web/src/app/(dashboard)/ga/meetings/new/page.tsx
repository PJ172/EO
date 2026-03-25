import { BookingForm } from "@/components/bookings/booking-form";

export const metadata = {
    title: "Đặt phòng họp | eOffice",
    description: "Tạo lịch đặt phòng họp mới",
};

export default function NewBookingPage() {
    return <BookingForm />;
}
