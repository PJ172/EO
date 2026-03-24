import { ITAssetDetail } from "@/components/it-assets/asset-detail";

export const metadata = {
    title: "Chi tiết tài sản IT | eOffice",
    description: "Xem chi tiết, giao hoặc thu hồi tài sản",
};

export default async function ITAssetDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const resolvedParams = await params;
    return <ITAssetDetail id={resolvedParams.id} />;
}
