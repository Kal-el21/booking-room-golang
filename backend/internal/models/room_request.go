package models

import (
	"time"

	"gorm.io/gorm"
)

type RequestStatus string

const (
	RequestPending   RequestStatus = "pending"
	RequestApproved  RequestStatus = "approved"
	RequestRejected  RequestStatus = "rejected"
	RequestCancelled RequestStatus = "cancelled"
)

type RoomRequest struct {
	ID               uint    `gorm:"primaryKey;autoIncrement" json:"id"`
	UserID           uint    `gorm:"not null" json:"user_id"`
	RequiredCapacity int     `gorm:"not null" json:"required_capacity" binding:"required,min=1"`
	Purpose          string  `gorm:"type:text;not null" json:"purpose" binding:"required"`
	Notes            *string `gorm:"type:text" json:"notes"`

	// Single day or multi-day booking
	BookingDate time.Time  `gorm:"type:date;not null" json:"booking_date" binding:"required"`
	EndDate     *time.Time `gorm:"type:date" json:"end_date"` // NULL for single day, set for multi-day
	StartTime   time.Time  `gorm:"type:time;not null" json:"start_time" binding:"required"`
	EndTime     time.Time  `gorm:"type:time;not null" json:"end_time" binding:"required"`

	// Recurring booking
	IsRecurring      bool       `gorm:"default:false" json:"is_recurring"`
	RecurringType    *string    `gorm:"type:varchar(50)" json:"recurring_type"`  // daily, weekly, monthly
	RecurringDays    *string    `gorm:"type:varchar(255)" json:"recurring_days"` // For weekly: "1,3,5" (Mon,Wed,Fri)
	RecurringEndDate *time.Time `gorm:"type:date" json:"recurring_end_date"`     // When recurring stops

	Status         RequestStatus  `gorm:"type:varchar(50);not null;default:'pending'" json:"status"`
	AssignedBy     *uint          `gorm:"index" json:"assigned_by"` // GA who approved/rejected
	RejectedReason *string        `gorm:"type:text" json:"rejected_reason"`
	CreatedAt      time.Time      `gorm:"autoCreateTime" json:"created_at"`
	UpdatedAt      time.Time      `gorm:"autoUpdateTime" json:"updated_at"`
	DeletedAt      gorm.DeletedAt `gorm:"index" json:"-"`

	// Relationships
	User     User          `gorm:"foreignKey:UserID" json:"user,omitempty"`
	Assigner *User         `gorm:"foreignKey:AssignedBy" json:"assigner,omitempty"`
	Bookings []RoomBooking `gorm:"foreignKey:RequestID;constraint:OnDelete:CASCADE" json:"bookings,omitempty"` // Multiple bookings for recurring/multi-day
}

// TableName specifies table name
func (RoomRequest) TableName() string {
	return "room_requests"
}

// IsPending checks if request is pending
func (r *RoomRequest) IsPending() bool {
	return r.Status == RequestPending
}

// IsApproved checks if request is approved
func (r *RoomRequest) IsApproved() bool {
	return r.Status == RequestApproved
}

// IsRejected checks if request is rejected
func (r *RoomRequest) IsRejected() bool {
	return r.Status == RequestRejected
}

// IsCancelled checks if request is cancelled
func (r *RoomRequest) IsCancelled() bool {
	return r.Status == RequestCancelled
}

// CanBeModified checks if request can be modified
func (r *RoomRequest) CanBeModified() bool {
	return r.Status == RequestPending
}

// CanBeCancelled checks if request can be cancelled
func (r *RoomRequest) CanBeCancelled() bool {
	return r.Status == RequestPending || r.Status == RequestApproved
}

// IsMultiDay checks if request is multi-day
func (r *RoomRequest) IsMultiDay() bool {
	return r.EndDate != nil
}

// GetDuration returns number of days for booking
func (r *RoomRequest) GetDuration() int {
	if !r.IsMultiDay() {
		return 1
	}
	duration := r.EndDate.Sub(r.BookingDate).Hours() / 24
	return int(duration) + 1 // Include both start and end date
}

// RoomRequestResponse for API responses
type RoomRequestResponse struct {
	ID               uint                  `json:"id"`
	UserID           uint                  `json:"user_id"`
	UserName         string                `json:"user_name"`
	User             *UserResponse         `json:"user,omitempty"`
	RequiredCapacity int                   `json:"required_capacity"`
	Purpose          string                `json:"purpose"`
	Notes            *string               `json:"notes"`
	BookingDate      string                `json:"booking_date"` // Format: YYYY-MM-DD
	EndDate          *string               `json:"end_date"`     // Format: YYYY-MM-DD for multi-day
	StartTime        string                `json:"start_time"`   // Format: HH:MM
	EndTime          string                `json:"end_time"`     // Format: HH:MM
	IsRecurring      bool                  `json:"is_recurring"`
	RecurringType    *string               `json:"recurring_type"`
	RecurringDays    *string               `json:"recurring_days"`
	RecurringEndDate *string               `json:"recurring_end_date"` // Format: YYYY-MM-DD
	Status           RequestStatus         `json:"status"`
	AssignedBy       *uint                 `json:"assigned_by"`
	Assigner         *UserResponse         `json:"assigner,omitempty"`
	RejectedReason   *string               `json:"rejected_reason"`
	Bookings         []RoomBookingResponse `json:"bookings,omitempty"`
	CreatedAt        time.Time             `json:"created_at"`
	UpdatedAt        time.Time             `json:"updated_at"`
}

// ToResponse converts RoomRequest to RoomRequestResponse
func (r *RoomRequest) ToResponse() RoomRequestResponse {
	response := RoomRequestResponse{
		ID:               r.ID,
		UserID:           r.UserID,
		UserName:         r.User.Name,
		RequiredCapacity: r.RequiredCapacity,
		Purpose:          r.Purpose,
		Notes:            r.Notes,
		BookingDate:      r.BookingDate.Format("2006-01-02"),
		StartTime:        r.StartTime.Format("15:04"),
		EndTime:          r.EndTime.Format("15:04"),
		IsRecurring:      r.IsRecurring,
		RecurringType:    r.RecurringType,
		RecurringDays:    r.RecurringDays,
		Status:           r.Status,
		AssignedBy:       r.AssignedBy,
		RejectedReason:   r.RejectedReason,
		CreatedAt:        r.CreatedAt,
		UpdatedAt:        r.UpdatedAt,
	}

	// Handle multi-day
	if r.EndDate != nil {
		endDateStr := r.EndDate.Format("2006-01-02")
		response.EndDate = &endDateStr
	}

	// Handle recurring end date
	if r.RecurringEndDate != nil {
		recurEndStr := r.RecurringEndDate.Format("2006-01-02")
		response.RecurringEndDate = &recurEndStr
	}

	if r.User.ID != 0 {
		userResp := r.User.ToResponse()
		response.User = &userResp
	}

	if r.Assigner != nil && r.Assigner.ID != 0 {
		assignerResp := r.Assigner.ToResponse()
		response.Assigner = &assignerResp
	}

	// Include bookings for recurring/multi-day
	if len(r.Bookings) > 0 {
		var bookingResponses []RoomBookingResponse
		for _, booking := range r.Bookings {
			bookingResponses = append(bookingResponses, booking.ToResponse())
		}
		response.Bookings = bookingResponses
	}

	return response
}
