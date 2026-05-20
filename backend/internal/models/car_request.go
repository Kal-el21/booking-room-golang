package models

import (
	"time"

	"gorm.io/gorm"
)

type CarRequestStatus string

const (
	CarRequestPending   CarRequestStatus = "pending"
	CarRequestApproved  CarRequestStatus = "approved"
	CarRequestRejected  CarRequestStatus = "rejected"
	CarRequestCancelled CarRequestStatus = "cancelled"
)

type CarRequest struct {
	ID               uint    `gorm:"primaryKey;autoIncrement" json:"id"`
	UserID           uint    `gorm:"not null" json:"user_id"`
	RequiredCapacity int     `gorm:"not null" json:"required_capacity" binding:"required,min=1"`
	Purpose          string  `gorm:"type:text;not null" json:"purpose" binding:"required"`
	Notes            *string `gorm:"type:text" json:"notes"`

	// Travel information (NEW)
	Destination           *string `gorm:"type:varchar(255)" json:"destination,omitempty"`
	PickupLocation        *string `gorm:"type:varchar(255)" json:"pickup_location,omitempty"`
	DriverRequired        bool    `gorm:"default:false" json:"driver_required"`
	EstimatedDistanceKM   *int    `gorm:"type:integer" json:"estimated_distance_km,omitempty"`
	PassengerCount        *int    `json:"passenger_count,omitempty"`
	NeedsFuelReimbursement bool  `gorm:"default:false" json:"needs_fuel_reimbursement"`
	FuelNote             *string `gorm:"type:text" json:"fuel_note,omitempty"`

	// Consumption fields
	HasConsumption  bool    `gorm:"default:false" json:"has_consumption"`
	ConsumptionNote *string `gorm:"type:text" json:"consumption_note"`

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

	Status         CarRequestStatus  `gorm:"type:varchar(50);not null;default:'pending'" json:"status"`
	AssignedBy     *uint             `gorm:"index" json:"assigned_by"` // GA who approved/rejected
	RejectedReason *string           `gorm:"type:text" json:"rejected_reason"`
	CreatedAt      time.Time         `gorm:"autoCreateTime" json:"created_at"`
	UpdatedAt      time.Time         `gorm:"autoUpdateTime" json:"updated_at"`
	DeletedAt      gorm.DeletedAt    `gorm:"index" json:"-"`

	// Relationships
	User     User          `gorm:"foreignKey:UserID" json:"user,omitempty"`
	Assigner *User         `gorm:"foreignKey:AssignedBy" json:"assigner,omitempty"`
	Bookings []CarBooking  `gorm:"foreignKey:RequestID;constraint:OnDelete:CASCADE" json:"bookings,omitempty"` // Multiple bookings for recurring/multi-day
}

// TableName specifies table name
func (CarRequest) TableName() string {
	return "car_requests"
}

// IsPending checks if request is pending
func (r *CarRequest) IsPending() bool {
	return r.Status == CarRequestPending
}

// IsApproved checks if request is approved
func (r *CarRequest) IsApproved() bool {
	return r.Status == CarRequestApproved
}

// IsRejected checks if request is rejected
func (r *CarRequest) IsRejected() bool {
	return r.Status == CarRequestRejected
}

// IsCancelled checks if request is cancelled
func (r *CarRequest) IsCancelled() bool {
	return r.Status == CarRequestCancelled
}

// CanBeModified checks if request can be modified
func (r *CarRequest) CanBeModified() bool {
	return r.Status == CarRequestPending
}

// CanBeCancelled checks if request can be cancelled
func (r *CarRequest) CanBeCancelled() bool {
	return r.Status == CarRequestPending || r.Status == CarRequestApproved
}

// IsMultiDay checks if request is multi-day
func (r *CarRequest) IsMultiDay() bool {
	return r.EndDate != nil
}

// GetDuration returns number of days for booking
func (r *CarRequest) GetDuration() int {
	if !r.IsMultiDay() {
		return 1
	}
	duration := r.EndDate.Sub(r.BookingDate).Hours() / 24
	return int(duration) + 1 // Include both start and end date
}

// CarRequestResponse for API responses
type CarRequestResponse struct {
	ID               uint                  `json:"id"`
	UserID           uint                  `json:"user_id"`
	UserName         string                `json:"user_name"`
	User             *UserResponse         `json:"user,omitempty"`
	RequiredCapacity int                   `json:"required_capacity"`
	Purpose          string                `json:"purpose"`
	Destination       *string               `json:"destination,omitempty"`           // ← NEW
	PickupLocation    *string               `json:"pickup_location,omitempty"`       // ← NEW
	DriverRequired    bool                  `json:"driver_required"`                  // ← NEW
	EstimatedDistanceKM *int                `json:"estimated_distance_km,omitempty"` // ← NEW
	PassengerCount    *int                  `json:"passenger_count,omitempty"`        // ← NEW
	NeedsFuelReimbursement bool             `json:"needs_fuel_reimbursement"`        // ← NEW
	FuelNote         *string               `json:"fuel_note,omitempty"`             // ← NEW
	Notes            *string               `json:"notes"`
	HasConsumption   bool                  `json:"has_consumption"`
	ConsumptionNote  *string               `json:"consumption_note"`
	BookingDate      string                `json:"booking_date"` // Format: YYYY-MM-DD
	EndDate          *string               `json:"end_date"`     // Format: YYYY-MM-DD for multi-day
	StartTime        string                `json:"start_time"`   // Format: HH:MM
	EndTime          string                `json:"end_time"`     // Format: HH:MM
	IsRecurring      bool                  `json:"is_recurring"`
	RecurringType    *string               `json:"recurring_type"`
	RecurringDays    *string               `json:"recurring_days"`
	RecurringEndDate *string               `json:"recurring_end_date"` // Format: YYYY-MM-DD
	Status           CarRequestStatus      `json:"status"`
	AssignedBy       *uint                 `json:"assigned_by"`
	Assigner         *UserResponse         `json:"assigner,omitempty"`
	RejectedReason   *string               `json:"rejected_reason"`
	Bookings         []CarBookingResponse  `json:"bookings,omitempty"`
	CreatedAt        time.Time             `json:"created_at"`
	UpdatedAt        time.Time             `json:"updated_at"`
}

// ToResponse converts CarRequest to CarRequestResponse
func (r *CarRequest) ToResponse() CarRequestResponse {
	response := CarRequestResponse{
		ID:               r.ID,
		UserID:           r.UserID,
		UserName:         r.User.Name,
		RequiredCapacity: r.RequiredCapacity,
		Purpose:          r.Purpose,
		Destination:       r.Destination,
		PickupLocation:    r.PickupLocation,
		DriverRequired:    r.DriverRequired,
		EstimatedDistanceKM: r.EstimatedDistanceKM,
		PassengerCount:    r.PassengerCount,
		NeedsFuelReimbursement: r.NeedsFuelReimbursement,
		FuelNote:          r.FuelNote,
		Notes:            r.Notes,
		HasConsumption:   r.HasConsumption,
		ConsumptionNote:  r.ConsumptionNote,
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
		var bookingResponses []CarBookingResponse
		for _, booking := range r.Bookings {
			bookingResponses = append(bookingResponses, booking.ToResponse())
		}
		response.Bookings = bookingResponses
	}

	return response
}