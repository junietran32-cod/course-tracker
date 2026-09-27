// Shared client-side metadata + formatting helpers for CATS.

export type CourseCategory =
  | "internal_training"
  | "external_course"
  | "professional_certification";

export type ApplicationStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "withdrawn"
  | "cancelled";

export const CATEGORY_META: Record<
  CourseCategory,
  { label: string; short: string; className: string; dot: string }
> = {
  internal_training: {
    label: "Internal training",
    short: "Internal",
    className:
      "bg-emerald-50 text-emerald-700 border-emerald-200/70 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/20",
    dot: "bg-emerald-500",
  },
  external_course: {
    label: "External course",
    short: "External",
    className:
      "bg-sky-50 text-sky-700 border-sky-200/70 dark:bg-sky-500/10 dark:text-sky-300 dark:border-sky-500/20",
    dot: "bg-sky-500",
  },
  professional_certification: {
    label: "Professional certification",
    short: "Certification",
    className:
      "bg-violet-50 text-violet-700 border-violet-200/70 dark:bg-violet-500/10 dark:text-violet-300 dark:border-violet-500/20",
    dot: "bg-violet-500",
  },
};

export const STATUS_META: Record<
  ApplicationStatus,
  { label: string; className: string; dot: string }
> = {
  pending: {
    label: "Pending approval",
    className:
      "bg-amber-50 text-amber-700 border-amber-200/70 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/20",
    dot: "bg-amber-500",
  },
  approved: {
    label: "Approved",
    className:
      "bg-emerald-50 text-emerald-700 border-emerald-200/70 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/20",
    dot: "bg-emerald-500",
  },
  rejected: {
    label: "Rejected",
    className:
      "bg-rose-50 text-rose-700 border-rose-200/70 dark:bg-rose-500/10 dark:text-rose-300 dark:border-rose-500/20",
    dot: "bg-rose-500",
  },
  withdrawn: {
    label: "Withdrawn",
    className:
      "bg-zinc-100 text-zinc-600 border-zinc-200/70 dark:bg-zinc-500/10 dark:text-zinc-300 dark:border-zinc-500/20",
    dot: "bg-zinc-400",
  },
  cancelled: {
    label: "Cancelled",
    className:
      "bg-orange-50 text-orange-700 border-orange-200/70 dark:bg-orange-500/10 dark:text-orange-300 dark:border-orange-500/20",
    dot: "bg-orange-400",
  },
};

/** Format a duration in training days: half-day granularity for internal. */
export function formatDuration(days: number): string {
  if (days === 0.5) return "Half day";
  if (Number.isInteger(days)) {
    return days === 1 ? "1 day" : `${days} days`;
  }
  return `${days} days`;
}

/** Format a whole-dollar fee: "Free" for $0, "$1,250" otherwise. */
export function formatFee(fee: number): string {
  if (fee === 0) return "Free";
  return `$${fee.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

/** Format a YYYY-MM-DD string as "12 Mar 2026" without timezone drift. */
export function formatDate(iso: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso;
  const [y, m, d] = iso.split("-").map(Number);
  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];
  return `${d} ${months[m - 1]} ${y}`;
}

/** Format a date range, collapsing same-day ranges. */
export function formatDateRange(start: string, end: string): string {
  return start === end
    ? formatDate(start)
    : `${formatDate(start)} – ${formatDate(end)}`;
}

/** Today's date as YYYY-MM-DD (local). */
export function todayISO(): string {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 10);
}

/** Compact relative timestamp like "2h ago" / "3 Sep". */
export function formatRelative(ms: number): string {
  const diff = Date.now() - ms;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return formatDate(new Date(ms).toISOString().slice(0, 10));
}
