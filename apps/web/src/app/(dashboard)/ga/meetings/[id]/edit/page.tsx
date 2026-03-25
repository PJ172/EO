import { BookingForm } from "@/components/bookings/booking-form";

export const metadata = {
    title: "Cập nhật lịch họp | eOffice",
    description: "Cập nhật thông tin lịch họp",
};

export default async function EditBookingPage({ params }: { params: Promise<{ id: string }> }) {
    const resolvedParams = await params;
    return <BookingForm bookingId={resolvedParams.id} />;
}
