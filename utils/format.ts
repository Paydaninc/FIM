export function formatCurrency(amount: number | null | undefined): string {
  if (amount == null) return "$0.00";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

export function formatDate(dateStr: string | Date | null | undefined): string {
  if (!dateStr) return "—";
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatShortDate(dateStr: string | Date | null | undefined): string {
  if (!dateStr) return "—";
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function statusLabel(status: string): string {
  switch (status) {
    case "draft": return "Draft";
    case "sent": return "Sent";
    case "viewed": return "Viewed";
    case "paid": return "Paid";
    case "overdue": return "Overdue";
    case "accepted": return "Accepted";
    case "declined": return "Declined";
    case "converted": return "Converted";
    default: return status.charAt(0).toUpperCase() + status.slice(1);
  }
}

export function statusBg(status: string): string {
  switch (status) {
    case "paid": return "#dcfce7";
    case "overdue": return "#fee2e2";
    case "sent":
    case "viewed":
    case "accepted": return "#dbeafe";
    case "draft": return "#f1f5f9";
    case "declined": return "#fee2e2";
    case "converted": return "#f0fdf4";
    default: return "#f1f5f9";
  }
}

export function statusFg(status: string): string {
  switch (status) {
    case "paid": return "#16a34a";
    case "overdue": return "#dc2626";
    case "sent":
    case "viewed":
    case "accepted": return "#2563eb";
    case "draft": return "#64748b";
    case "declined": return "#dc2626";
    case "converted": return "#16a34a";
    default: return "#64748b";
  }
}

export function initials(name: string | null | undefined): string {
  if (!name) return "?";
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}
