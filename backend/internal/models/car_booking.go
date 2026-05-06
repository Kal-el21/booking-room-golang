package models

import (
	"time"

	"gorm.io/gorm"
)

type CarBookingStatus string

const (
	CarBookingConfirmed CarBookingStatus = "confirmed"
	CarBookingCancelled CarBookingStatus = "cancelled"
	CarBookingCompleted CarBookingStatus = "completed"
)

type CarBooking struct {
	ID          uint           `gorm:"primaryKey;autoIncrement" json:"id"`
	RequestID   uint           `gorm:"not null;index" json:"request_id"` // Changed from unique to index (multiple bookings per request)
	CarID       uint           `gorm:"not null;index" json:"car_id"`
	BookedBy    uint           `gorm:"not null" json:"booked_by"` // GA who created the booking
	BookingDate time.Time      `gorm:"type:date;not null;index" json:"booking_date"`
	StartTime   time.Time      `gorm:"type:time;not null" json:"start_time"`
	EndTime     time.Time      `gorm:"type:time;not null" json:"end_time"`
	Status      CarBookingStatus `gorm:"type:varchar(50);not null;default:'confirmed'" json:"status"`
	CreatedAt   time.Time      `gorm:"autoCreateTime" json:"created_at"`
	UpdatedAt   time.Time      `gorm:"autoUpdateTime" json:"updated_at"`
	DeletedAt   gorm.DeletedAt `gorm:"index" json:"-"`

	// Relationships
	Request               CarRequest            `gorm:"foreignKey:RequestID" json:"request,omitempty"`
	Car                   Car                   `gorm:"foreignKey:CarID" json:"car,omitempty"`
	BookedByUser          User                   `gorm:"foreignKey:BookedBy" json:"booked_by_user,omitempty"`
	Notifications         []Notification         `gorm:"foreignKey:BookingID" json:"notifications,omitempty"`
	NotificationSchedules []NotificationSchedule `gorm:"foreignKey:BookingID" json:"notification_schedules,omitempty"`
}

// TableName specifies table name
func (CarBooking) TableName() string {
	return "car_bookings"
}

// IsConfirmed checks if booking is confirmed
func (b *CarBooking) IsConfirmed() bool {
	return b.Status == CarBookingConfirmed
}

// IsCancelled checks if booking is cancelled
func (b *CarBooking) IsCancelled() bool {
	return b.Status == CarBookingCancelled
}

// IsCompleted checks if booking is completed
func (b *CarBooking) IsCompleted() bool {
	return b.Status == CarBookingCompleted
}

// CanBeCancelled checks if booking can be cancelled
func (b *CarBooking) CanBeCancelled() bool {
	return b.Status == CarBookingConfirmed && time.Now().Before(b.BookingDate)
}

// IsUpcoming checks if booking is in the future
func (b *CarBooking) IsUpcoming() bool {
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
func (b *CarBooking) IsOngoing() bool {
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

// CarBookingResponse for API responses
type CarBookingResponse struct {
	ID           uint          `json:"id"`
	RequestID    uint          `json:"request_id"`
	CarID        uint          `json:"car_id"`
	CarName      string        `json:"car_name"`
	Car          *CarResponse  `json:"car,omitempty"`
	BookedBy     uint          `json:"booked_by"`
	BookedByUser *UserResponse `json:"booked_by_user,omitempty"`
	BookingDate  string        `json:"booking_date"` // Format: YYYY-MM-DD
	StartTime    string        `json:"start_time"`   // Format: HH:MM
	EndTime      string        `json:"end_time"`     // Format: HH:MM
	Status       CarBookingStatus `json:"status"`
	CreatedAt    time.Time     `json:"created_at"`
	UpdatedAt    time.Time     `json:"updated_at"`
}

// ToResponse converts CarBooking to CarBookingResponse
func (b *CarBooking) ToResponse() CarBookingResponse {
	response := CarBookingResponse{
		ID:          b.ID,
		RequestID:   b.RequestID,
		CarID:       b.CarID,
		CarName:     b.Car.CarName,
		BookedBy:    b.BookedBy,
		BookingDate: b.BookingDate.Format("2006-01-02"),
		StartTime:   b.StartTime.Format("15:04"),
		EndTime:     b.EndTime.Format("15:04"),
		Status:      b.Status,
		CreatedAt:   b.CreatedAt,
		UpdatedAt:   b.UpdatedAt,
	}

	if b.Car.ID != 0 {
		carResp := b.Car.ToResponse()
		response.Car = &carResp
	}

	if b.BookedByUser.ID != 0 {
		userResp := b.BookedByUser.ToResponse()
		response.BookedByUser = &userResp
	}

	return response
}