import { format, parseISO } from 'date-fns';
import type { RoomRequest, Booking, CarRequest, CarBooking } from '@/types';

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

// ─── Car Request Helpers ────────────────────────────────────────────────────

/**
 * Return a human-readable date range for a car request.
 * Car requests use `departure_date` instead of `booking_date`.
 */
export const formatCarRequestDateRange = (request: Partial<CarRequest>): string => {
  const startDate = request.departure_date || request.booking_date;
  const endDate = request.end_date;
  const isRecurring = request.is_recurring;
  const recurringType = request.recurring_type;
  const recurringDays = request.recurring_days;
  const recurringEndDate = request.recurring_end_date;

  if (!endDate && !isRecurring) {
    return format(parseISO(startDate!), 'MMM dd, yyyy');
  }

  if (endDate && !isRecurring) {
    return `${format(parseISO(startDate!), 'MMM dd')} - ${format(parseISO(endDate), 'MMM dd, yyyy')}`;
  }

  if (isRecurring) {
    const daysMap: Record<string, string> = {
      '1': 'Mon', '2': 'Tue', '3': 'Wed', '4': 'Thu', '5': 'Fri', '6': 'Sat', '7': 'Sun',
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
 * Return a short label for the car request booking type label
 */
export const getCarRequestTypeLabel = (request: Partial<CarRequest>): string => {
  if (request.is_recurring) return 'Recurring';
  if (request.end_date) return 'Multi-day';
  return 'Single Day';
};

// ─── Car Booking Helpers ─────────────────────────────────────────────────────

/**
 * Return a human-readable range for a car booking drive period.
 * Car bookings also use `departure_date` (not `booking_date`).
 */
export const formatCarBookingDateRange = (booking: Partial<CarBooking>): string => {
  const start = booking.departure_date || booking.booking_date;
  if (!start) return 'N/A';
  if (!booking.end_date || start === booking.end_date) {
    return format(parseISO(start), 'MMM dd, yyyy');
  }
  return `${format(parseISO(start), 'MMM dd')} - ${format(parseISO(booking.end_date), 'MMM dd, yyyy')}`;
};

/**
 * Format pickup timestamp to readable string
 */
export const formatPickupTime = (ts?: string): string => {
  if (!ts) return 'Not picked up';
  return format(parseISO(ts), 'MMM dd, yyyy · HH:mm');
};

/**
 * Format return timestamp to readable string
 */
export const formatReturnTime = (ts?: string): string => {
  if (!ts) return 'Not returned';
  return format(parseISO(ts), 'MMM dd, yyyy · HH:mm');
};

/**
 * Helper: difference in km between end and start odometer
 */
export const getKmTraveled = (start?: number, end?: number): number | null => {
  if (start == null || end == null) return null;
  return end - start;
};

/**
 * Return a human-readable status label for car-booking lifecycle
 */
export const getCarBookingStatusLabel = (status: string): string => {
  const map: Record<string, string> = {
    confirmed:  'Confirmed',
    picked_up:  'Picked Up',
    in_use:     'In Use',
    returned:   'Returned',
    late_return:'Late Return',
    cancelled:  'Cancelled',
  };
  return map[status] || status;
};

/**
 * Variant/badge config for car-booking status
 */
export const getCarBookingStatusConfig = (status: string): 'default' | 'outline' | 'secondary' | 'destructive' => {
  const map: Record<string, 'default' | 'outline' | 'secondary' | 'destructive'> = {
    confirmed:   'default',
    picked_up:   'outline',
    in_use:      'secondary',
    returned:    'default',
    late_return: 'destructive',
    cancelled:   'destructive',
  };
  return map[status] || 'outline';
};
