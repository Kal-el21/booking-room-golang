package models

import (
	"time"

	"gorm.io/gorm"
)

type CarBookingStatus string

const (
	CarBookingConfirmed  CarBookingStatus = "confirmed"
	CarBookingPickedUp   CarBookingStatus = "picked_up"   // NEW
	CarBookingInUse      CarBookingStatus = "in_use"      // NEW
	CarBookingReturned   CarBookingStatus = "returned"    // NEW
	CarBookingLateReturn CarBookingStatus = "late_return" // NEW
	CarBookingCancelled  CarBookingStatus = "cancelled"
	CarBookingCompleted  CarBookingStatus = "completed"
)

type CarBooking struct {
	ID            uint       `gorm:"primaryKey;autoIncrement" json:"id"`
	RequestID     uint       `gorm:"not null;index" json:"request_id"`
	CarID         uint       `gorm:"not null;index" json:"car_id"`
	BookedBy      uint       `gorm:"not null" json:"booked_by"`
	DepartureDate time.Time  `gorm:"type:date;not null;index" json:"departure_date"`
	ReturnDate    *time.Time `gorm:"type:date" json:"return_date,omitempty"`
	StartTime     time.Time  `gorm:"type:time;not null" json:"start_time"`
	EndTime       time.Time  `gorm:"type:time;not null" json:"end_time"`

	// NEW: Driver & Snapshot
	DriverID            *uint   `gorm:"index" json:"driver_id,omitempty"`
	DriverNameSnapshot  *string `gorm:"type:varchar(255)" json:"driver_name_snapshot,omitempty"`
	PlateNumberSnapshot *string `gorm:"type:varchar(50)" json:"plate_number_snapshot,omitempty"`
	CarNameSnapshot     *string `gorm:"type:varchar(255)" json:"car_name_snapshot,omitempty"`

	// NEW: Pickup info
	PickupLocation *string    `gorm:"type:varchar(255)" json:"pickup_location,omitempty"`
	PickedUpAt     *time.Time `json:"picked_up_at,omitempty"`

	// NEW: Return info
	ReturnedAt      *time.Time `json:"returned_at,omitempty"`
	StartOdometer   *int       `json:"start_odometer,omitempty"`
	EndOdometer     *int       `json:"end_odometer,omitempty"`
	FuelLevelReturn *int       `gorm:"check:fuel_level_return BETWEEN 0 AND 100" json:"fuel_level_return,omitempty"`
	ReturnNotes     *string    `gorm:"type:text" json:"return_notes,omitempty"`

	Status    CarBookingStatus `gorm:"type:varchar(50);not null;default:'confirmed'" json:"status"`
	CreatedAt time.Time        `gorm:"autoCreateTime" json:"created_at"`
	UpdatedAt time.Time        `gorm:"autoUpdateTime" json:"updated_at"`
	DeletedAt gorm.DeletedAt   `gorm:"index" json:"-"`

	// Relationships
	Request               CarRequest             `gorm:"foreignKey:RequestID" json:"request,omitempty"`
	Car                   Car                    `gorm:"foreignKey:CarID" json:"car,omitempty"`
	BookedByUser          User                   `gorm:"foreignKey:BookedBy" json:"booked_by_user,omitempty"`
	Driver                *User                  `gorm:"foreignKey:DriverID" json:"driver,omitempty"`
	Notifications         []Notification         `gorm:"foreignKey:BookingID" json:"notifications,omitempty"`
	NotificationSchedules []NotificationSchedule `gorm:"foreignKey:CarBookingID" json:"notification_schedules,omitempty"`
}

// TableName specifies table name
func (CarBooking) TableName() string {
	return "car_bookings"
}

// IsConfirmed checks if booking is confirmed
func (b *CarBooking) IsConfirmed() bool {
	return b.Status == CarBookingConfirmed
}

// IsPickedUp checks if booking is picked up
func (b *CarBooking) IsPickedUp() bool {
	return b.Status == CarBookingPickedUp
}

// IsInUse checks if booking is in use
func (b *CarBooking) IsInUse() bool {
	return b.Status == CarBookingInUse
}

// IsReturned checks if booking is returned
func (b *CarBooking) IsReturned() bool {
	return b.Status == CarBookingReturned
}

// IsLateReturn checks if booking is late return
func (b *CarBooking) IsLateReturn() bool {
	return b.Status == CarBookingLateReturn
}

// IsCancelled checks if booking is cancelled
func (b *CarBooking) IsCancelled() bool {
	return b.Status == CarBookingCancelled
}

// IsCompleted checks if booking is completed
func (b *CarBooking) IsCompleted() bool {
	return b.Status == CarBookingCompleted
}

// IsActive checks if booking is currently active (picked up or in use)
func (b *CarBooking) IsActive() bool {
	return b.Status == CarBookingPickedUp || b.Status == CarBookingInUse
}

// CanTransitionTo validates state machine transitions
func (b *CarBooking) CanTransitionTo(newStatus CarBookingStatus) bool {
	switch b.Status {
	case CarBookingConfirmed:
		return newStatus == CarBookingPickedUp || newStatus == CarBookingCancelled
	case CarBookingPickedUp:
		return newStatus == CarBookingInUse || newStatus == CarBookingReturned || newStatus == CarBookingLateReturn
	case CarBookingInUse:
		return newStatus == CarBookingReturned || newStatus == CarBookingLateReturn
	case CarBookingReturned, CarBookingLateReturn, CarBookingCancelled:
		return false // Terminal states
	}
	return false
}

// CanBeCancelled checks if booking can be cancelled
func (b *CarBooking) CanBeCancelled() bool {
	bookingDateTime := time.Date(
		b.DepartureDate.Year(),
		b.DepartureDate.Month(),
		b.DepartureDate.Day(),
		b.StartTime.Hour(),
		b.StartTime.Minute(),
		0, 0,
		b.DepartureDate.Location(),
	)
	return b.Status == CarBookingConfirmed && time.Now().Before(bookingDateTime)
}

// IsUpcoming checks if booking is in the future
func (b *CarBooking) IsUpcoming() bool {
	now := time.Now()
	bookingDateTime := time.Date(
		b.DepartureDate.Year(),
		b.DepartureDate.Month(),
		b.DepartureDate.Day(),
		b.StartTime.Hour(),
		b.StartTime.Minute(),
		0, 0,
		b.DepartureDate.Location(),
	)
	return bookingDateTime.After(now)
}

// IsOngoing checks if booking is currently happening
func (b *CarBooking) IsOngoing() bool {
	now := time.Now()
	startDateTime := time.Date(
		b.DepartureDate.Year(),
		b.DepartureDate.Month(),
		b.DepartureDate.Day(),
		b.StartTime.Hour(),
		b.StartTime.Minute(),
		0, 0,
		b.DepartureDate.Location(),
	)
	endDateTime := time.Date(
		b.DepartureDate.Year(),
		b.DepartureDate.Month(),
		b.DepartureDate.Day(),
		b.EndTime.Hour(),
		b.EndTime.Minute(),
		0, 0,
		b.DepartureDate.Location(),
	)
	return now.After(startDateTime) && now.Before(endDateTime)
}

// Helper methods for snapshot data
// GetDriverName returns driver name from snapshot or relationship
func (b *CarBooking) GetDriverName() string {
	if b.DriverNameSnapshot != nil && *b.DriverNameSnapshot != "" {
		return *b.DriverNameSnapshot
	}
	if b.Driver != nil && b.Driver.ID != 0 {
		return b.Driver.Name
	}
	return ""
}

// GetPlateNumber returns plate number from snapshot or car
func (b *CarBooking) GetPlateNumber() string {
	if b.PlateNumberSnapshot != nil && *b.PlateNumberSnapshot != "" {
		return *b.PlateNumberSnapshot
	}
	if b.Car.PlateNumber != nil && *b.Car.PlateNumber != "" {
		return *b.Car.PlateNumber
	}
	return ""
}

// GetCarName returns car name from snapshot or relationship
func (b *CarBooking) GetCarName() string {
	if b.CarNameSnapshot != nil && *b.CarNameSnapshot != "" {
		return *b.CarNameSnapshot
	}
	if b.Car.CarName != "" {
		return b.Car.CarName
	}
	return ""
}

// CarBookingResponse for API responses
type CarBookingResponse struct {
	ID                      uint                `json:"id"`
	RequestID               uint                `json:"request_id"`
	Request                 *CarRequestResponse `json:"request,omitempty"`
	CarID                   uint                `json:"car_id"`
	CarName                 string              `json:"car_name"`
	CarNameSnapshot         *string             `json:"car_name_snapshot,omitempty"`
	Car                     *CarResponse        `json:"car,omitempty"`
	DriverID                *uint               `json:"driver_id,omitempty"`
	DriverName              string              `json:"driver_name,omitempty"`
	Driver                  *UserResponse       `json:"driver,omitempty"`
	PlateNumber             string              `json:"plate_number,omitempty"`
	PlateNumberSnapshot     *string             `json:"plate_number_snapshot,omitempty"`
	DepartureDate           string              `json:"departure_date"`
	EndDate                 *string             `json:"end_date,omitempty"`
	RequestBookingDate      string              `json:"request_booking_date,omitempty"`
	RequestEndDate          *string             `json:"request_end_date,omitempty"`
	RequestIsRecurring      bool                `json:"request_is_recurring,omitempty"`
	RequestRecurringEndDate *string             `json:"request_recurring_end_date,omitempty"`
	RequestDuration         int                 `json:"request_duration,omitempty"`
	ReturnDate              *string             `json:"return_date,omitempty"`
	PickupLocation          *string             `json:"pickup_location,omitempty"`
	PickedUpAt              *time.Time          `json:"picked_up_at,omitempty"`
	ReturnedAt              *time.Time          `json:"returned_at,omitempty"`
	StartOdometer           *int                `json:"start_odometer,omitempty"`
	EndOdometer             *int                `json:"end_odometer,omitempty"`
	FuelLevelReturn         *int                `json:"fuel_level_return,omitempty"`
	ReturnNotes             *string             `json:"return_notes,omitempty"`
	BookedBy                uint                `json:"booked_by"`
	BookedByUser            *UserResponse       `json:"booked_by_user,omitempty"`
	StartTime               string              `json:"start_time"`
	EndTime                 string              `json:"end_time"`
	Status                  CarBookingStatus    `json:"status"`
	CreatedAt               time.Time           `json:"created_at"`
	UpdatedAt               time.Time           `json:"updated_at"`
}

// ToResponse converts CarBooking to CarBookingResponse
func (b *CarBooking) ToResponse() CarBookingResponse {
	requestBookingDate := ""
	var endDateStr *string
	if !b.Request.BookingDate.IsZero() {
		requestBookingDate = b.Request.BookingDate.Format("2006-01-02")
	}
	if b.Request.EndDate != nil {
		s := b.Request.EndDate.Format("2006-01-02")
		endDateStr = &s
	}

	var recurringEndDateStr *string
	if b.Request.RecurringEndDate != nil {
		s := b.Request.RecurringEndDate.Format("2006-01-02")
		recurringEndDateStr = &s
	}

	requestDuration := 1
	if b.Request.EndDate != nil {
		requestDuration = int(b.Request.EndDate.Sub(b.Request.BookingDate).Hours()/24) + 1
	}

	var returnDateStr *string
	if b.ReturnDate != nil {
		s := b.ReturnDate.Format("2006-01-02")
		returnDateStr = &s
	}

	response := CarBookingResponse{
		ID:                      b.ID,
		RequestID:               b.RequestID,
		CarID:                   b.CarID,
		CarName:                 b.GetCarName(),
		CarNameSnapshot:         b.CarNameSnapshot,
		DriverID:                b.DriverID,
		DriverName:              b.GetDriverName(),
		PlateNumber:             b.GetPlateNumber(),
		PlateNumberSnapshot:     b.PlateNumberSnapshot,
		DepartureDate:           b.DepartureDate.Format("2006-01-02"),
		EndDate:                 endDateStr,
		RequestBookingDate:      requestBookingDate,
		RequestEndDate:          endDateStr,
		RequestIsRecurring:      b.Request.IsRecurring,
		RequestRecurringEndDate: recurringEndDateStr,
		RequestDuration:         requestDuration,
		ReturnDate:              returnDateStr,
		PickupLocation:          b.PickupLocation,
		PickedUpAt:              b.PickedUpAt,
		ReturnedAt:              b.ReturnedAt,
		StartOdometer:           b.StartOdometer,
		EndOdometer:             b.EndOdometer,
		FuelLevelReturn:         b.FuelLevelReturn,
		ReturnNotes:             b.ReturnNotes,
		BookedBy:                b.BookedBy,
		StartTime:               b.StartTime.Format("15:04"),
		EndTime:                 b.EndTime.Format("15:04"),
		Status:                  b.Status,
		CreatedAt:               b.CreatedAt,
		UpdatedAt:               b.UpdatedAt,
	}

	if b.Car.ID != 0 {
		carResp := b.Car.ToResponse()
		response.Car = &carResp
	}

	if b.Request.ID != 0 {
		requestResp := b.Request.ToResponse()
		requestResp.Bookings = nil
		response.Request = &requestResp
	}

	if b.BookedByUser.ID != 0 {
		userResp := b.BookedByUser.ToResponse()
		response.BookedByUser = &userResp
	}

	if b.Driver != nil && b.Driver.ID != 0 {
		driverResp := b.Driver.ToResponse()
		response.Driver = &driverResp
	}

	return response
}
