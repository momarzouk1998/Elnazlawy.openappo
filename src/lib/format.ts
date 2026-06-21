// أدوات مساعدة مشتركة
export function formatCurrency(value: number | null | undefined): string {
  if (value == null || isNaN(value)) return "0 ج.م";
  return new Intl.NumberFormat("ar-EG", {
    minimumFractionDigits: 0, maximumFractionDigits: 2,
  }).format(value) + " ج.م";
}
export function formatNumber(value: number | null | undefined): string {
  if (value == null || isNaN(value)) return "0";
  return new Intl.NumberFormat("ar-EG").format(value);
}
export function formatDate(date: string | null | undefined): string {
  if (!date) return "-";
  try {
    return new Date(date).toLocaleDateString("ar-EG", {
      year: "numeric", month: "long", day: "numeric",
    });
  } catch { return date; }
}
export function formatDateShort(date: string | null | undefined): string {
  if (!date) return "-";
  try {
    return new Date(date).toLocaleDateString("ar-EG");
  } catch { return date; }
}
export function daysBetween(start: string, end: string): number | null {
  if (!start || !end) return null;
  const s = new Date(start); const e = new Date(end);
  return Math.ceil((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24));
}
export const STATUS_LABELS: Record<string, string> = {
  open: "مفتوح",
  in_progress: "قيد التنفيذ",
  completed: "مكتمل",
  delivered: "تم التسليم",
};
export const STATUS_COLORS: Record<string, string> = {
  open: "bg-yellow-100 text-yellow-800 border-yellow-300",
  in_progress: "bg-blue-100 text-blue-800 border-blue-300",
  completed: "bg-green-100 text-green-800 border-green-300",
  delivered: "bg-gray-100 text-gray-800 border-gray-300",
};
export const ORDER_TYPE_LABELS: Record<string, string> = {
  new: "تصنيع جديد", maintenance: "صيانة",
};
export const ENTRY_TYPE_LABELS: Record<string, string> = {
  purchase: "مشتريات",
  income: "دفعة واردة من معرض",
  expense: "دفعة صادرة لمورد",
  transfer: "تحويل تمريري",
  overhead: "نثريات",
};
export const ENTRY_TYPE_COLORS: Record<string, string> = {
  purchase: "bg-red-100 text-red-700 border-red-300",
  income: "bg-green-100 text-green-700 border-green-300",
  expense: "bg-red-100 text-red-700 border-red-300",
  transfer: "bg-orange-100 text-orange-700 border-orange-300",
  overhead: "bg-purple-100 text-purple-700 border-purple-300",
};
export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cash: "نقدي", transfer: "تحويل", both: "كلاهما",
};
