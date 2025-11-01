/**
 * Utility functions for calculating rent periods based on tenant check-in dates
 */

export interface RentPeriod {
  startDate: Date;
  endDate: Date;
  nextPeriodStart: Date;
}

/**
 * Get the days in a month, handling leap years
 */
export function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

/**
 * Adjust date to valid day of month (handles 31st -> 28/29/30 cases)
 */
export function adjustToValidDate(targetYear: number, targetMonth: number, day: number): Date {
  const daysInMonth = getDaysInMonth(targetYear, targetMonth);
  const validDay = Math.min(day, daysInMonth);
  return new Date(targetYear, targetMonth, validDay);
}

/**
 * Calculate the current rent period for a tenant based on their check-in date
 * 
 * Case A: Check-in on 1st → Rent period = 1st to last day of month
 * Case B: Check-in mid-month (e.g., 13th) → Rent period = 13th to 12th of next month (rolling)
 */
export function calculateCurrentRentPeriod(checkInDate: Date, referenceDate: Date = new Date()): RentPeriod {
  const checkInDay = checkInDate.getDate();
  const checkInMonth = checkInDate.getMonth();
  const checkInYear = checkInDate.getFullYear();

  // Case A: Check-in on the 1st of any month
  if (checkInDay === 1) {
    // Current period: 1st of current month to last day of current month
    const currentYear = referenceDate.getFullYear();
    const currentMonth = referenceDate.getMonth();
    const daysInMonth = getDaysInMonth(currentYear, currentMonth);
    
    const periodStart = new Date(currentYear, currentMonth, 1);
    const periodEnd = new Date(currentYear, currentMonth, daysInMonth);
    
    // Next period starts on 1st of next month
    const nextPeriodStart = new Date(currentYear, currentMonth + 1, 1);
    
    return {
      startDate: periodStart,
      endDate: periodEnd,
      nextPeriodStart,
    };
  }

  // Case B: Check-in mid-month (rolling period)
  // Find which period we're currently in based on the reference date
  let periodStart = new Date(checkInYear, checkInMonth, checkInDay);
  let periodEnd = new Date(checkInYear, checkInMonth + 1, checkInDay - 1);
  
  // Adjust periodEnd to valid date (handles month-end edge cases)
  periodEnd = adjustToValidDate(periodEnd.getFullYear(), periodEnd.getMonth(), periodEnd.getDate());
  
  // Move forward to find the current period
  while (periodEnd < referenceDate) {
    // Move to next period
    const nextStart = new Date(periodEnd);
    nextStart.setDate(nextStart.getDate() + 1); // Next day after period end
    
    const nextStartYear = nextStart.getFullYear();
    const nextStartMonth = nextStart.getMonth();
    const nextStartDay = checkInDay;
    
    // Adjust to valid date
    periodStart = adjustToValidDate(nextStartYear, nextStartMonth, nextStartDay);
    
    // Calculate period end (same day - 1, next month)
    const periodEndYear = periodStart.getFullYear();
    const periodEndMonth = periodStart.getMonth() + 1;
    const periodEndDay = checkInDay - 1;
    
    periodEnd = adjustToValidDate(periodEndYear, periodEndMonth, periodEndDay);
  }
  
  // Calculate next period start (day after current period end)
  const nextPeriodStart = new Date(periodEnd);
  nextPeriodStart.setDate(nextPeriodStart.getDate() + 1);
  const nextStartYear = nextPeriodStart.getFullYear();
  const nextStartMonth = nextPeriodStart.getMonth();
  const nextPeriodStartDate = adjustToValidDate(nextStartYear, nextStartMonth, checkInDay);
  
  return {
    startDate: periodStart,
    endDate: periodEnd,
    nextPeriodStart: nextPeriodStartDate,
  };
}

/**
 * Calculate the current rent period based on the last payment period
 * This is used when payments have been recorded with manual period overrides
 * 
 * @param lastPaymentPeriodStart - The start date of the most recent payment period
 * @param lastPaymentPeriodEnd - The end date of the most recent payment period
 * @param referenceDate - The date to calculate the current period from (defaults to today)
 * @returns The current rent period based on the payment cycle
 */
export function calculateCurrentPeriodFromLastPayment(
  lastPaymentPeriodStart: Date,
  lastPaymentPeriodEnd: Date,
  referenceDate: Date = new Date()
): RentPeriod {
  // Normalize to midnight
  const paymentStart = normalizeDate(lastPaymentPeriodStart);
  const paymentEnd = normalizeDate(lastPaymentPeriodEnd);
  const today = normalizeDate(referenceDate);
  
  // If today is within the last payment period, return that period
  if (today >= paymentStart && today <= paymentEnd) {
    const nextPeriod = calculateNextPeriodFromManualEnd(paymentEnd);
    return {
      startDate: paymentStart,
      endDate: paymentEnd,
      nextPeriodStart: normalizeDate(nextPeriod.startDate),
    };
  }
  
  // If today is before the payment period, something's wrong (shouldn't happen)
  if (today < paymentStart) {
    // Fallback: return the payment period itself
    const nextPeriod = calculateNextPeriodFromManualEnd(paymentEnd);
    return {
      startDate: paymentStart,
      endDate: paymentEnd,
      nextPeriodStart: normalizeDate(nextPeriod.startDate),
    };
  }
  
  // Today is after the payment period
  // Calculate the first period after the payment
  let currentPeriodStart = new Date(paymentEnd);
  currentPeriodStart.setDate(currentPeriodStart.getDate() + 1);
  currentPeriodStart = normalizeDate(currentPeriodStart);
  
  // Calculate the end date of this first period
  const firstPeriodAfterPayment = calculateNextPeriodFromManualEnd(paymentEnd);
  let currentPeriodEnd = normalizeDate(firstPeriodAfterPayment.endDate);
  
  // Move forward through periods until we find the one containing today
  while (currentPeriodEnd < today) {
    // Calculate next period
    const nextPeriod = calculateNextPeriodFromManualEnd(currentPeriodEnd);
    currentPeriodStart = normalizeDate(nextPeriod.startDate);
    currentPeriodEnd = normalizeDate(nextPeriod.endDate);
  }
  
  // Calculate the next period after the current one
  const nextPeriod = calculateNextPeriodFromManualEnd(currentPeriodEnd);
  
  return {
    startDate: currentPeriodStart,
    endDate: currentPeriodEnd,
    nextPeriodStart: normalizeDate(nextPeriod.startDate),
  };
}

/**
 * Get the current rent period for a tenant, considering payment history
 * If payments exist, uses the last payment period to calculate the current cycle
 * Otherwise, falls back to check-in date based calculation
 * 
 * @param checkInDate - Tenant's original check-in date
 * @param payments - Array of payment records for the tenant
 * @param referenceDate - The date to calculate from (defaults to today)
 * @returns The current rent period
 */
export function calculateCurrentRentPeriodWithPayments(
  checkInDate: Date,
  payments: Array<{ paymentPeriodStart?: Date | string; paymentPeriodEnd?: Date | string }> = [],
  referenceDate: Date = new Date()
): RentPeriod {
  // Filter payments that have period information and sort by period end (most recent first)
  const paymentsWithPeriods = payments
    .filter((p) => p.paymentPeriodStart && p.paymentPeriodEnd)
    .map((p) => ({
      periodStart: new Date(p.paymentPeriodStart!),
      periodEnd: new Date(p.paymentPeriodEnd!),
    }))
    .sort((a, b) => b.periodEnd.getTime() - a.periodEnd.getTime());
  
  // If we have payment records, use the last payment period to calculate current period
  if (paymentsWithPeriods.length > 0) {
    const lastPayment = paymentsWithPeriods[0];
    return calculateCurrentPeriodFromLastPayment(
      lastPayment.periodStart,
      lastPayment.periodEnd,
      referenceDate
    );
  }
  
  // Fall back to check-in date based calculation
  return calculateCurrentRentPeriod(checkInDate, referenceDate);
}

/**
 * Calculate next rent period start and end based on a manually set period end
 * This creates a new cycle starting the day after the manual period end,
 * with duration equal to one month (minus one day)
 * 
 * Example:
 * - Manual period end: Oct 31, 2025
 * - Next period start: Nov 1, 2025
 * - Next period end: Nov 30, 2025 (one month later, minus one day)
 */
export function calculateNextPeriodFromManualEnd(manualPeriodEnd: Date): { startDate: Date; endDate: Date } {
  // Next period starts the day after the manual period end
  const nextStart = new Date(manualPeriodEnd);
  nextStart.setDate(nextStart.getDate() + 1);
  
  // Normalize to midnight to avoid time component issues
  nextStart.setHours(0, 0, 0, 0);
  
  // Calculate next period end: add one month to nextStart, then subtract one day
  // This preserves the same day-of-month pattern as the original period
  const nextStartYear = nextStart.getFullYear();
  const nextStartMonth = nextStart.getMonth();
  const nextStartDay = nextStart.getDate();
  
  // Add one month
  let nextEndYear = nextStartYear;
  let nextEndMonth = nextStartMonth + 1;
  
  // Handle year rollover
  if (nextEndMonth > 11) {
    nextEndMonth = 0;
    nextEndYear += 1;
  }
  
  // Subtract one day by going to the last day of the target month
  // We use adjustToValidDate to handle edge cases like Feb 29 -> Feb 28 in non-leap years
  const nextEnd = adjustToValidDate(nextEndYear, nextEndMonth, nextStartDay);
  nextEnd.setDate(nextEnd.getDate() - 1);
  
  // Normalize to midnight
  nextEnd.setHours(0, 0, 0, 0);
  
  return {
    startDate: nextStart,
    endDate: nextEnd,
  };
}

/**
 * Calculate next rent period start date only (for backward compatibility)
 * @deprecated Use calculateNextPeriodFromManualEnd instead to get both start and end
 */
export function calculateNextPeriodStartFromManualEnd(manualPeriodEnd: Date): Date {
  const nextPeriod = calculateNextPeriodFromManualEnd(manualPeriodEnd);
  return nextPeriod.startDate;
}

/**
 * Format date for display
 */
export function formatDateForDisplay(date: Date): string {
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Compare two dates by year, month, and day only (ignoring time)
 */
export function isSameDate(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

/**
 * Normalize date to midnight (ignore time component) for comparison
 */
export function normalizeDate(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/**
 * Check if a payment period overlaps with or covers the current rent period
 * A payment is considered valid if:
 * - Payment period overlaps with rent period, OR
 * - Payment period contains the rent period, OR
 * - Payment period exactly matches rent period
 */
export function isPaymentPeriodValid(
  paymentStart: Date,
  paymentEnd: Date,
  rentPeriodStart: Date,
  rentPeriodEnd: Date
): boolean {
  const payStart = normalizeDate(paymentStart);
  const payEnd = normalizeDate(paymentEnd);
  const rentStart = normalizeDate(rentPeriodStart);
  const rentEnd = normalizeDate(rentPeriodEnd);
  
  // Check if payment period overlaps with rent period
  // Overlap occurs if: payStart <= rentEnd AND payEnd >= rentStart
  return payStart.getTime() <= rentEnd.getTime() && payEnd.getTime() >= rentStart.getTime();
}

/**
 * Get payment status based on period and payment history
 */
export type PaymentStatus = 'paid' | 'due_soon' | 'overdue';

export interface PaymentStatusInfo {
  status: PaymentStatus;
  label: string;
  colorClass: string;
  bgColorClass: string;
}

export function getPaymentStatus(
  periodStart: Date,
  periodEnd: Date,
  hasPayment: boolean,
  today: Date = new Date()
): PaymentStatusInfo {
  const daysUntilDue = Math.ceil((periodEnd.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  
  if (hasPayment) {
    return {
      status: 'paid',
      label: 'Paid',
      colorClass: 'text-green-700',
      bgColorClass: 'bg-green-100',
    };
  }
  
  if (today > periodEnd) {
    return {
      status: 'overdue',
      label: 'Overdue',
      colorClass: 'text-red-700',
      bgColorClass: 'bg-red-100',
    };
  }
  
  if (daysUntilDue <= 7 && daysUntilDue >= 0) {
    return {
      status: 'due_soon',
      label: 'Due Soon',
      colorClass: 'text-amber-700',
      bgColorClass: 'bg-amber-100',
    };
  }
  
  return {
    status: 'due_soon',
    label: 'Pending',
    colorClass: 'text-gray-700',
    bgColorClass: 'bg-gray-100',
  };
}

