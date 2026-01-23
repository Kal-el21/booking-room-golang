
export type RequestStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

export interface RoomRequest {
  id: number;
  user_id: number;
  user?: User;
  required_capacity: number;
  purpose: string;
  notes?: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  status: RequestStatus;
  assigned_by?: number;
  assigner?: User;
  rejected_reason?: string;
  booking?: RoomBooking;
  created_at: string;
  updated_at: string;
}

export interface CreateRequestInput {
  required_capacity: number;
  purpose: string;
  notes?: string;
  booking_date: string;
  start_time: string;
  end_time: string;
}