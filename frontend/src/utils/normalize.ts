import type { Car, CarBooking } from '@/types';

export const normalizeCar = (car: any): Car => ({
  ...car,
  seat_capacity: car.seat_capacity ?? car.capacity ?? 0,
  capacity: car.capacity ?? car.seat_capacity ?? 0,
  garage_location: car.garage_location ?? car.location,
  location: car.location ?? car.garage_location ?? '',
});

export const normalizeCarBooking = (booking: any): CarBooking => {
  const car = booking.car ? normalizeCar(booking.car) : booking.car;
  const request = booking.request;
  const carName = booking.car_name_snapshot ?? booking.car_name ?? car?.car_name;
  const plateNumber = booking.plate_number_snapshot ?? booking.plate_number ?? car?.plate_number;

  return {
    ...booking,
    car,
    request,
    car_name: booking.car_name ?? carName,
    car_name_snapshot: booking.car_name_snapshot ?? carName,
    plate_number: booking.plate_number ?? plateNumber,
    plate_number_snapshot: booking.plate_number_snapshot ?? plateNumber,
    departure_date: booking.departure_date ?? booking.booking_date,
    end_date: booking.end_date ?? request?.end_date,
    request_booking_date: booking.request_booking_date ?? request?.booking_date ?? request?.departure_date,
    request_end_date: booking.request_end_date ?? request?.end_date,
    request_is_recurring: booking.request_is_recurring ?? request?.is_recurring,
    request_recurring_end_date: booking.request_recurring_end_date ?? request?.recurring_end_date,
    request_duration: booking.request_duration,
  };
};
