package models

import (
	"time"

	"gorm.io/gorm"
)

type BookingStatus string

const (
	BookingConfirmed BookingStatus = "confirmed"
	BookingCancelled BookingStatus = "cancelled"
	BookingCompleted BookingStatus = "completed"
)

type RoomBooking struct {
	ID          uint           `gorm:"primaryKey;autoIncrement" json:"id"`
	RequestID   uint           `gorm:"not null;index" json:"request_id"` // Changed from unique to index (multiple bookings per request)
	RoomID      uint           `gorm:"not null;index" json:"room_id"`
	BookedBy    uint           `gorm:"not null" json:"booked_by"` // GA who created the booking
	BookingDate time.Time      `gorm:"type:date;not null;index" json:"booking_date"`
	StartTime   time.Time      `gorm:"type:time;not null" json:"start_time"`
	EndTime     time.Time      `gorm:"type:time;not null" json:"end_time"`
	Status      BookingStatus  `gorm:"type:varchar(50);not null;default:'confirmed'" json:"status"`
	CreatedAt   time.Time      `gorm:"autoCreateTime" json:"created_at"`
	UpdatedAt   time.Time      `gorm:"autoUpdateTime" json:"updated_at"`
	DeletedAt   gorm.DeletedAt `gorm:"index" json:"-"`

	// Relationships
	Request               RoomRequest            `gorm:"foreignKey:RequestID" json:"request,omitempty"`
	Room                  Room                   `gorm:"foreignKey:RoomID" json:"room,omitempty"`
	BookedByUser          User                   `gorm:"foreignKey:BookedBy" json:"booked_by_user,omitempty"`
	Notifications         []Notification         `gorm:"foreignKey:BookingID" json:"notifications,omitempty"`
	NotificationSchedules []NotificationSchedule `gorm:"foreignKey:BookingID" json:"notification_schedules,omitempty"`
}

// TableName specifies table name
func (RoomBooking) TableName() string {
	return "room_bookings"
}

// IsConfirmed checks if booking is confirmed
func (b *RoomBooking) IsConfirmed() bool {
	return b.Status == BookingConfirmed
}

// IsCancelled checks if booking is cancelled
func (b *RoomBooking) IsCancelled() bool {
	return b.Status == BookingCancelled
}

// IsCompleted checks if booking is completed
func (b *RoomBooking) IsCompleted() bool {
	return b.Status == BookingCompleted
}

// CanBeCancelled checks if booking can be cancelled
func (b *RoomBooking) CanBeCancelled() bool {
	return b.Status == BookingConfirmed && time.Now().Before(b.BookingDate)
}

// IsUpcoming checks if booking is in the future
func (b *RoomBooking) IsUpcoming() bool {
	now := time.Now()
	bookingDateTime := time.Date(
		b.BookingDate.Year(),
		b.BookingDate.Month(),
		b.BookingDate.Day(),
		b.StartTime.Hour(),
		b.StartTime.Minute(),
		0, 0,
		b.BookingDate.Location(),
	)
	return bookingDateTime.After(now)
}

// IsOngoing checks if booking is currently happening
func (b *RoomBooking) IsOngoing() bool {
	now := time.Now()
	startDateTime := time.Date(
		b.BookingDate.Year(),
		b.BookingDate.Month(),
		b.BookingDate.Day(),
		b.StartTime.Hour(),
		b.StartTime.Minute(),
		0, 0,
		b.BookingDate.Location(),
	)
	endDateTime := time.Date(
		b.BookingDate.Year(),
		b.BookingDate.Month(),
		b.BookingDate.Day(),
		b.EndTime.Hour(),
		b.EndTime.Minute(),
		0, 0,
		b.BookingDate.Location(),
	)
	return now.After(startDateTime) && now.Before(endDateTime)
}

// RoomBookingResponse for API responses
type RoomBookingResponse struct {
	ID           uint          `json:"id"`
	RequestID    uint          `json:"request_id"`
	RoomID       uint          `json:"room_id"`
	Room         *RoomResponse `json:"room,omitempty"`
	BookedBy     uint          `json:"booked_by"`
	BookedByUser *UserResponse `json:"booked_by_user,omitempty"`
	BookingDate  string        `json:"booking_date"` // Format: YYYY-MM-DD
	StartTime    string        `json:"start_time"`   // Format: HH:MM
	EndTime      string        `json:"end_time"`     // Format: HH:MM
	Status       BookingStatus `json:"status"`
	CreatedAt    time.Time     `json:"created_at"`
	UpdatedAt    time.Time     `json:"updated_at"`
}

// ToResponse converts RoomBooking to RoomBookingResponse
func (b *RoomBooking) ToResponse() RoomBookingResponse {
	response := RoomBookingResponse{
		ID:          b.ID,
		RequestID:   b.RequestID,
		RoomID:      b.RoomID,
		BookedBy:    b.BookedBy,
		BookingDate: b.BookingDate.Format("2006-01-02"),
		StartTime:   b.StartTime.Format("15:04"),
		EndTime:     b.EndTime.Format("15:04"),
		Status:      b.Status,
		CreatedAt:   b.CreatedAt,
		UpdatedAt:   b.UpdatedAt,
	}

	if b.Room.ID != 0 {
		roomResp := b.Room.ToResponse()
		response.Room = &roomResp
	}

	if b.BookedByUser.ID != 0 {
		userResp := b.BookedByUser.ToResponse()
		response.BookedByUser = &userResp
	}

	return response
}
