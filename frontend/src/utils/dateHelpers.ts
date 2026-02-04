import { format, parseISO } from 'date-fns';
import type { RoomRequest, Booking } from '@/types';

/**
 * Format date range for display in requests and bookings
 * Handles single day, multi-day, and recurring bookings
 */
export const formatDateRange = (request: Partial<RoomRequest>): string => {
  const startDate = request.booking_date;
  const endDate = request.end_date;
  const isRecurring = request.is_recurring;
  const recurringType = request.recurring_type;
  const recurringDays = request.recurring_days;
  const recurringEndDate = request.recurring_end_date;

  // Single day booking
  if (!endDate && !isRecurring) {
    return format(parseISO(startDate!), 'MMM dd, yyyy');
  }

  // Multi-day booking (no recurring)
  if (endDate && !isRecurring) {
    return `${format(parseISO(startDate!), 'MMM dd')} - ${format(parseISO(endDate), 'MMM dd, yyyy')}`;
  }

  // Recurring booking
  if (isRecurring) {
    const daysMap: Record<string, string> = {
      '1': 'Mon',
      '2': 'Tue',
      '3': 'Wed',
      '4': 'Thu',
      '5': 'Fri',
      '6': 'Sat',
      '7': 'Sun',
    };

    let pattern = '';
    
    if (recurringType === 'daily') {
      pattern = 'Every day';
    } else if (recurringType === 'weekly' && recurringDays) {
      const days = recurringDays.split(',').map(d => daysMap[d.trim()] || d).join(', ');
      pattern = `Every ${days}`;
    } else if (recurringType === 'monthly') {
      pattern = 'Monthly';
    }

    const endStr = recurringEndDate 
      ? ` until ${format(parseISO(recurringEndDate), 'MMM dd, yyyy')}`
      : '';

    return `${pattern}${endStr}`;
  }

  return format(parseISO(startDate!), 'MMM dd, yyyy');
};

/**
 * Format date range for booking display (for multi-day bookings)
 */
export const formatBookingDateRange = (booking: Partial<Booking>): string => {
  if (!booking.end_date || booking.booking_date === booking.end_date) {
    return format(parseISO(booking.booking_date!), 'MMM dd, yyyy');
  }
  return `${format(parseISO(booking.booking_date!), 'MMM dd')} - ${format(parseISO(booking.end_date), 'MMM dd, yyyy')}`;
};

/**
 * Format time range for display
 */
export const formatTimeRange = (startTime: string, endTime: string): string => {
  return `${startTime} - ${endTime}`;
};

/**
 * Get a short label for the booking type
 */
export const getBookingTypeLabel = (request: Partial<RoomRequest>): string => {
  if (request.is_recurring) {
    const type = request.recurring_type;
    if (type === 'daily') return 'Daily';
    if (type === 'weekly') return 'Weekly';
    if (type === 'monthly') return 'Monthly';
    return 'Recurring';
  }
  if (request.end_date) return 'Multi-day';
  return 'Single day';
};

/**
 * Check if booking spans multiple days
 */
export const isMultiDayBooking = (booking: Partial<Booking>): boolean => {
  if (!booking.end_date) return false;
  return booking.booking_date !== booking.end_date;
};
