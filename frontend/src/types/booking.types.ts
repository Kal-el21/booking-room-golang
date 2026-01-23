
export type BookingStatus = 'confirmed' | 'cancelled' | 'completed';

export interface RoomBooking {
  id: number;
  request_id: number;
  room_id: number;
  room?: Room;
  booked_by: number;
  booked_by_user?: User;
  booking_date: string;
  start_time: string;
  end_time: string;
  status: BookingStatus;
  created_at: string;
  updated_at: string;
}