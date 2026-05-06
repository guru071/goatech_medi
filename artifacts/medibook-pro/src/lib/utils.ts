import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number | string, currency = "INR"): string {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  if (isNaN(num)) return "₹0";
  return new Intl.NumberFormat("en-IN", { style: "currency", currency, maximumFractionDigits: 0 }).format(num);
}

export function formatDate(date: string | Date): string {
  if (!date) return "-";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export function formatTime(time: string): string {
  if (!time) return "-";
  const [h, m] = time.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 || 12;
  return `${hour12}:${(m || 0).toString().padStart(2, "0")} ${period}`;
}

export function getStatusColor(status: string): string {
  const map: Record<string, string> = {
    pending: "bg-amber-100 text-amber-800 border-amber-200",
    confirmed: "bg-teal-100 text-teal-800 border-teal-200",
    completed: "bg-green-100 text-green-800 border-green-200",
    cancelled: "bg-red-100 text-red-800 border-red-200",
    no_show: "bg-gray-100 text-gray-600 border-gray-200",
    approved: "bg-green-100 text-green-800 border-green-200",
    rejected: "bg-red-100 text-red-800 border-red-200",
    suspended: "bg-orange-100 text-orange-800 border-orange-200",
    active: "bg-teal-100 text-teal-800 border-teal-200",
    open: "bg-amber-100 text-amber-800 border-amber-200",
    in_progress: "bg-blue-100 text-blue-800 border-blue-200",
    resolved: "bg-green-100 text-green-800 border-green-200",
    closed: "bg-gray-100 text-gray-600 border-gray-200",
    low: "bg-gray-100 text-gray-600 border-gray-200",
    medium: "bg-amber-100 text-amber-800 border-amber-200",
    high: "bg-orange-100 text-orange-800 border-orange-200",
    urgent: "bg-red-100 text-red-800 border-red-200",
  };
  return map[status] || "bg-gray-100 text-gray-600 border-gray-200";
}

export function downloadReceiptTxt(appointment: Record<string, unknown>) {
  const formatC = (v: unknown) => {
    const n = parseFloat(String(v || 0));
    return isNaN(n) ? "₹0" : formatCurrency(n);
  };
  const content = [
    "MEDIBOOK PRO - APPOINTMENT RECEIPT",
    "====================================",
    `Appointment ID: #${appointment.id}`,
    `Patient: ${appointment.patientName || "-"}`,
    `Clinic: ${appointment.clinicName || "-"}`,
    `Doctor: ${appointment.doctorName || "-"}`,
    `Date: ${formatDate(String(appointment.appointmentDate))}`,
    `Time: ${formatTime(String(appointment.appointmentTime))}`,
    `Token: #${appointment.tokenNumber}`,
    `Status: ${String(appointment.status || "").toUpperCase()}`,
    `Consultation Fee: ${formatC(appointment.consultationFee)}`,
    "====================================",
    "Thank you for choosing MediBook Pro!",
    `Generated: ${new Date().toLocaleString("en-IN")}`,
  ].join("\n");

  const blob = new Blob([content], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `medibook-receipt-${appointment.id}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}

