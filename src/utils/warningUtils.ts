import { differenceInDays } from "date-fns";

export const getExpiryStatus = (dateStr: string | null) => {
    if (!dateStr) return { status: "unknown", color: "bg-gray-100 text-gray-800", label: "Chưa cập nhật" };

    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return { status: "unknown", color: "bg-gray-100 text-gray-800", label: "Ngày không hợp lệ" };

    const daysLeft = differenceInDays(date, new Date());

    if (daysLeft < 0) return { status: "expired", color: "bg-red-100 text-red-800", label: "Đã hết hạn" };
    if (daysLeft <= 7) return { status: "critical", color: "bg-red-100 text-red-800", label: `Còn ${daysLeft} ngày` };
    if (daysLeft <= 30) return { status: "warning", color: "bg-yellow-100 text-yellow-800", label: `Còn ${daysLeft} ngày` };
    return { status: "safe", color: "bg-green-100 text-green-800", label: `Còn ${daysLeft} ngày` };
};
