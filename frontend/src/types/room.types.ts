
export type RoomStatus = 'available' | 'occupied' | 'maintenance';

export interface Room {
  id: number;
  room_name: string;
  capacity: number;
  location: string;
  description?: string;
  status: RoomStatus;
  is_active: boolean;
  created_by: number;
  created_at: string;
  creator?: User;
}

export interface CreateRoomRequest {
  room_name: string;
  capacity: number;
  location: string;
  description?: string;
  status?: RoomStatus;
}

export interface UpdateRoomRequest {
  room_name?: string;
  capacity?: number;
  location?: string;
  description?: string;
  status?: RoomStatus;
  is_active?: boolean;
}