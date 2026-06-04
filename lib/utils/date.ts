// ============================================================================
// Date Utilities — IST helpers, week boundaries, payment windows
// ============================================================================

/**
 * Get current date in IST
 */
export function nowIST(): Date {
  return new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
}

/**
 * Get Monday of the current week (IST)
 */
export function getWeekStart(date?: Date): Date {
  const d = date ? new Date(date) : nowIST();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday
  const monday = new Date(d);
  monday.setDate(diff);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

/**
 * Get Sunday of the current week (IST)
 */
export function getWeekEnd(date?: Date): Date {
  const monday = getWeekStart(date);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  return sunday;
}

/**
 * Format date as YYYY-MM-DD
 */
export function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Check if today is within the given week
 */
export function isWithinWeek(weekStart: string, weekEnd: string): boolean {
  const now = nowIST();
  const start = new Date(weekStart);
  const end = new Date(weekEnd);
  end.setHours(23, 59, 59, 999);
  return now >= start && now <= end;
}

/**
 * Get start of today in IST as ISO string
 */
export function todayStartIST(): string {
  const now = nowIST();
  now.setHours(0, 0, 0, 0);
  return formatDate(now) + 'T00:00:00.000Z';
}

/**
 * Get next Monday from a given date
 */
export function getNextMonday(date?: Date): Date {
  const d = date ? new Date(date) : nowIST();
  const day = d.getDay();
  const daysUntilMonday = day === 0 ? 1 : 8 - day;
  const nextMonday = new Date(d);
  nextMonday.setDate(d.getDate() + daysUntilMonday);
  nextMonday.setHours(0, 0, 0, 0);
  return nextMonday;
}

/**
 * Check if current time is within the weekly payment window.
 * Window: Sunday 6:00 AM IST → Monday 6:00 AM IST (24 hours)
 */
export function isSundayPaymentWindow(): boolean {
  const ist = nowIST();
  const day = ist.getDay();
  const hour = ist.getHours();

  // Sunday 6:00 AM onwards
  if (day === 0 && hour >= 6) return true;
  // Monday before 6:00 AM
  if (day === 1 && hour < 6) return true;

  return false;
}

/**
 * Get the next payment window start (next Sunday 6 AM IST)
 */
export function getNextPaymentWindowStart(date?: Date): Date {
  const d = date ? new Date(date) : nowIST();
  const day = d.getDay();
  const daysUntilSunday = day === 0 ? 7 : 7 - day;
  const nextSun = new Date(d);
  nextSun.setDate(d.getDate() + daysUntilSunday);
  nextSun.setHours(6, 0, 0, 0);
  return nextSun;
}

/**
 * Get the next Sunday date (for showing renewal window date)
 */
export function getNextSunday(date?: Date): Date {
  return getNextPaymentWindowStart(date);
}

/**
 * Get the Sunday end of next week (for next week's policy end date)
 */
export function getNextWeekEnd(date?: Date): Date {
  const nextMon = getNextMonday(date);
  const sun = new Date(nextMon);
  sun.setDate(nextMon.getDate() + 6);
  sun.setHours(23, 59, 59, 999);
  return sun;
}

/**
 * Calculate the first policy activation date for a new registration.
 * Rule: Policy activates on the NEXT Monday that is at least 7 days away.
 * This ensures a minimum 7-day waiting period, max 13 days.
 *
 * Examples (registration day → activation Monday):
 *   Monday    → next-to-next Monday (7 days)
 *   Tuesday   → Monday after next (13 days, since next Monday is only 6 days)
 *   Wednesday → Monday after next (12 days)
 *   Thursday  → Monday after next (11 days)
 *   Friday    → Monday after next (10 days)
 *   Saturday  → Monday after next (9 days)
 *   Sunday    → Monday after next (8 days)
 */
export function getFirstPolicyStartDate(registrationDate?: Date): Date {
  const regDate = registrationDate ? new Date(registrationDate) : nowIST();
  const nextMonday = getNextMonday(regDate);

  // Check if next Monday is at least 7 days from registration
  const daysToNextMonday = Math.ceil(
    (nextMonday.getTime() - regDate.getTime()) / 86400000
  );

  if (daysToNextMonday >= 7) {
    return nextMonday;
  }

  // Not enough days — push to the Monday after that
  const mondayAfterNext = new Date(nextMonday);
  mondayAfterNext.setDate(nextMonday.getDate() + 7);
  return mondayAfterNext;
}

/**
 * Format a payment window description
 */
export function formatPaymentWindow(): string {
  const nextSun = getNextPaymentWindowStart();
  const sunStr = nextSun.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' });
  return `${sunStr}, 6:00 AM – Monday 6:00 AM`;
}

/**
 * Get time remaining until payment window closes (in human-readable format)
 * Returns null if not in payment window
 */
export function getPaymentWindowTimeRemaining(): string | null {
  if (!isSundayPaymentWindow()) return null;

  const ist = nowIST();
  // Window closes Monday 6 AM
  const closeTime = new Date(ist);
  if (ist.getDay() === 0) {
    // Sunday — close is tomorrow (Monday) 6 AM
    closeTime.setDate(ist.getDate() + 1);
  }
  // Monday — close is today 6 AM (already handled by isSundayPaymentWindow check)
  closeTime.setHours(6, 0, 0, 0);

  const diff = closeTime.getTime() - ist.getTime();
  if (diff <= 0) return null;

  const hours = Math.floor(diff / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  return `${hours}h ${minutes}m`;
}
