package models

import (
	"time"
)

type NotificationType string
type NotificationChannel string

const (
	NotifBookingConfirmed NotificationType = "booking_confirmed"
	NotifBookingRejected  NotificationType = "booking_rejected"
	NotifBookingCancelled NotificationType = "booking_cancelled"
	NotifReminder         NotificationType = "reminder"
	NotifRoomChanged      NotificationType = "room_changed"
	NotifNewRequest       NotificationType = "new_request"
	NotifNewCarRequest    NotificationType = "new_car_request"
	NotifCarBookingConfirmed  NotificationType = "car_booking_confirmed"
	NotifCarBookingRejected   NotificationType = "car_booking_rejected"
	NotifCarBookingCancelled  NotificationType = "car_booking_cancelled"
)

const (
	ChannelEmail NotificationChannel = "email"
	ChannelInApp NotificationChannel = "in_app"
	ChannelBoth  NotificationChannel = "both"
)

type Notification struct {
	ID           uint                `gorm:"primaryKey;autoIncrement" json:"id"`
	UserID       uint                `gorm:"not null;index" json:"user_id"`
	BookingID    *uint               `gorm:"index" json:"booking_id,omitempty"`
	RoomID       *uint               `gorm:"index" json:"room_id,omitempty"`
	CarID        *uint               `gorm:"index" json:"car_id,omitempty"`
	CarBookingID *uint               `gorm:"index" json:"car_booking_id,omitempty"`
	Title        string              `gorm:"type:varchar(255);not null" json:"title"`
	Message      string              `gorm:"type:text;not null" json:"message"`
	Type         NotificationType    `gorm:"type:varchar(50);not null" json:"type"`
	Channel      NotificationChannel `gorm:"type:varchar(50);not null" json:"channel"`
	IsRead       bool                `gorm:"default:false" json:"is_read"`
	ReadAt       *time.Time          `gorm:"type:timestamp" json:"read_at"`
	SentAt       *time.Time          `gorm:"type:timestamp" json:"sent_at"`
	CreatedAt    time.Time           `gorm:"autoCreateTime" json:"created_at"`
	UpdatedAt    time.Time           `gorm:"autoUpdateTime" json:"updated_at"`

	// Relationships — no FK constraints, loaded via Preload
	User    User        `gorm:"foreignKey:UserID" json:"user,omitempty"`
	Room    *Room       `gorm:"foreignKey:RoomID" json:"room,omitempty"`
	Car     *Car        `gorm:"foreignKey:CarID" json:"car,omitempty"`
	CarBooking *CarBooking `gorm:"foreignKey:CarBookingID" json:"car_booking,omitempty"`
}

// MarkAsRead marks notification as read
func (n *Notification) MarkAsRead() {
	now := time.Now()
	n.IsRead = true
	n.ReadAt = &now
}

// NotificationResponse for API responses
type NotificationResponse struct {
	ID           uint                `json:"id"`
	UserID       uint                `json:"user_id"`
	BookingID    *uint               `json:"booking_id"`
	CarBookingID *uint               `json:"car_booking_id,omitempty"`
	Title        string              `json:"title"`
	Message      string              `json:"message"`
	Type         NotificationType    `json:"type"`
	Channel      NotificationChannel `json:"channel"`
	IsRead       bool                `json:"is_read"`
	ReadAt       *time.Time          `json:"read_at"`
	SentAt       *time.Time          `json:"sent_at"`
	CreatedAt    time.Time           `json:"created_at"`
}

// ToResponse converts Notification to NotificationResponse
func (n *Notification) ToResponse() NotificationResponse {
	return NotificationResponse{
		ID:           n.ID,
		UserID:       n.UserID,
		BookingID:    n.BookingID,
		CarBookingID: n.CarBookingID,
		Title:        n.Title,
		Message:      n.Message,
		Type:         n.Type,
		Channel:      n.Channel,
		IsRead:       n.IsRead,
		ReadAt:       n.ReadAt,
		SentAt:       n.SentAt,
		CreatedAt:    n.CreatedAt,
	}
}

// NotificationSchedule for scheduled notifications (reminders)
type NotificationSchedule struct {
	ID              uint                `gorm:"primaryKey;autoIncrement" json:"id"`
	BookingID       *uint               `gorm:"index" json:"booking_id,omitempty"` // General (no FK)
	RoomBookingID   *uint               `gorm:"index" json:"room_booking_id,omitempty"`
	CarBookingID    *uint               `gorm:"index" json:"car_booking_id,omitempty"`
	NotifyType      string              `gorm:"type:varchar(50);not null" json:"notify_type"` // 24h_before, 3h_before, 30m_before
	NotifyAt        time.Time           `gorm:"type:timestamp;not null;index" json:"notify_at"`
	Channel         NotificationChannel `gorm:"type:varchar(50);not null" json:"channel"`
	IsSent          bool                `gorm:"default:false" json:"is_sent"`
	SentAt          *time.Time          `gorm:"type:timestamp" json:"sent_at"`
	CreatedAt       time.Time           `gorm:"autoCreateTime" json:"created_at"`
	UpdatedAt       time.Time           `gorm:"autoUpdateTime" json:"updated_at"`

	// Relationships (no FK constraint to avoid mig issues)
	Booking     *RoomBooking `gorm:"foreignKey:BookingID" json:"booking,omitempty"`
	RoomBooking *RoomBooking `gorm:"foreignKey:RoomBookingID" json:"room_booking,omitempty"`
	CarBooking  *CarBooking  `gorm:"foreignKey:CarBookingID" json:"car_booking,omitempty"`
}

// TableName specifies table name
func (NotificationSchedule) TableName() string {
	return "notification_schedules"
}

// MarkAsSent marks notification schedule as sent
func (ns *NotificationSchedule) MarkAsSent() {
	now := time.Now()
	ns.IsSent = true
	ns.SentAt = &now
}
