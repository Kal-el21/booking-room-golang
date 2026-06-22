package repositories

import (
	"time"

	"github.com/Kal-el21/booking-room-golang/backend/internal/models"

	"gorm.io/gorm"
)

type CarRequestRepository struct {
	db *gorm.DB
}

func NewCarRequestRepository(db *gorm.DB) *CarRequestRepository {
	return &CarRequestRepository{db: db}
}

// GetDB returns the underlying *gorm.DB
func (r *CarRequestRepository) GetDB() *gorm.DB {
	return r.db
}

// Create creates a new car request
func (r *CarRequestRepository) Create(request *models.CarRequest) error {
	return r.db.Create(request).Error
}

// FindByID finds car request by ID
func (r *CarRequestRepository) FindByID(id uint) (*models.CarRequest, error) {
	var request models.CarRequest
	err := r.db.
		Preload("User").
		Preload("Assigner").
		Preload("Bookings.Car").          // Load bookings with car info
		Preload("Bookings.BookedByUser"). // Load who booked it
		First(&request, id).Error
	return &request, err
}

// Update updates car request
func (r *CarRequestRepository) Update(request *models.CarRequest) error {
	return r.db.Save(request).Error
}

// Delete soft deletes car request
func (r *CarRequestRepository) Delete(id uint) error {
	return r.db.Delete(&models.CarRequest{}, id).Error
}

// List gets all car requests with pagination and filters
func (r *CarRequestRepository) List(page, pageSize int, filters map[string]interface{}) ([]models.CarRequest, int64, error) {
	var requests []models.CarRequest
	var total int64

	offset := (page - 1) * pageSize
	query := r.db.Model(&models.CarRequest{})

	// Apply filters
	if userID, ok := filters["user_id"]; ok {
		query = query.Where("user_id = ?", userID)
	}
	if status, ok := filters["status"]; ok {
		query = query.Where("status = ?", status)
	}

	// Count total
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	// Get paginated results - Preload Bookings (plural)
	err := query.
		Preload("User").
		Preload("Assigner").
		Preload("Bookings").     // Changed from Booking to Bookings
		Preload("Bookings.Car"). // Preload car info for each booking
		Order("created_at DESC").
		Offset(offset).
		Limit(pageSize).
		Find(&requests).Error

	return requests, total, err
}

// GetPendingRequests gets all pending car requests
func (r *CarRequestRepository) GetPendingRequests() ([]models.CarRequest, error) {
	var requests []models.CarRequest
	err := r.db.
		Where("status = ?", models.CarRequestPending).
		Preload("User").
		Preload("Bookings").     // Changed from Booking to Bookings
		Preload("Bookings.Car"). // Preload car info
		Order("created_at ASC").
		Find(&requests).Error
	return requests, err
}

// CarBookingRepository handles car booking data access
type CarBookingRepository struct {
	db *gorm.DB
}

func NewCarBookingRepository(db *gorm.DB) *CarBookingRepository {
	return &CarBookingRepository{db: db}
}

// GetDB returns the underlying *gorm.DB for raw queries
func (r *CarBookingRepository) GetDB() *gorm.DB {
	return r.db
}

// Create creates a new car booking
func (r *CarBookingRepository) Create(booking *models.CarBooking) error {
	return r.db.Create(booking).Error
}

// FindByID finds car booking by ID
func (r *CarBookingRepository) FindByID(id uint) (*models.CarBooking, error) {
	var booking models.CarBooking
	err := r.db.
		Preload("Request").
		Preload("Request.User").
		Preload("Car").
		Preload("BookedByUser").
		First(&booking, id).Error
	return &booking, err
}

// FindByRequestID finds all car bookings by request ID (for multi-day/recurring)
func (r *CarBookingRepository) FindByRequestID(requestID uint) ([]models.CarBooking, error) {
	var bookings []models.CarBooking
	err := r.db.
		Where("request_id = ?", requestID).
		Preload("Car").
		Preload("Request").
		Preload("Request.User").
		Order("departure_date ASC").
		Find(&bookings).Error
	return bookings, err
}

// Update updates car booking
func (r *CarBookingRepository) Update(booking *models.CarBooking) error {
	return r.db.Save(booking).Error
}

// Delete soft deletes car booking
func (r *CarBookingRepository) Delete(id uint) error {
	return r.db.Delete(&models.CarBooking{}, id).Error
}

// List gets all car bookings with pagination and filters
func (r *CarBookingRepository) List(page, pageSize int, filters map[string]interface{}) ([]models.CarBooking, int64, error) {
	var bookings []models.CarBooking
	var total int64

	offset := (page - 1) * pageSize
	query := r.db.Model(&models.CarBooking{})

	// Apply filters
	if carID, ok := filters["car_id"]; ok {
		query = query.Where("car_id = ?", carID)
	}
	if status, ok := filters["status"]; ok {
		query = query.Where("status = ?", status)
	}
	if bookingDate, ok := filters["booking_date"]; ok {
		query = query.Where("departure_date = ?", bookingDate)
	}

	// Count total
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	// Get paginated results
	err := query.
		Preload("Request").
		Preload("Request.User").
		Preload("Car").
		Preload("BookedByUser").
		Order("departure_date DESC, start_time ASC").
		Offset(offset).
		Limit(pageSize).
		Find(&bookings).Error

	return bookings, total, err
}

// GetUserCarBookings gets all car bookings for a specific user
func (r *CarBookingRepository) GetUserCarBookings(userID uint) ([]models.CarBooking, error) {
	var bookings []models.CarBooking
	err := r.db.
		Joins("JOIN car_requests ON car_bookings.request_id = car_requests.id").
		Where("car_requests.user_id = ?", userID).
		Preload("Request").
		Preload("Request.User").
		Preload("Car").
		Preload("BookedByUser").
		Order("departure_date DESC, start_time ASC").
		Find(&bookings).Error
	return bookings, err
}

// ListForUser gets paginated car bookings for a specific request owner.
func (r *CarBookingRepository) ListForUser(page, pageSize int, userID uint, filters map[string]interface{}) ([]models.CarBooking, int64, error) {
	var bookings []models.CarBooking
	var total int64

	offset := (page - 1) * pageSize
	query := r.db.Model(&models.CarBooking{}).
		Joins("JOIN car_requests ON car_bookings.request_id = car_requests.id").
		Where("car_requests.user_id = ?", userID).
		Where("car_requests.deleted_at IS NULL")

	if carID, ok := filters["car_id"]; ok {
		query = query.Where("car_bookings.car_id = ?", carID)
	}
	if status, ok := filters["status"]; ok {
		query = query.Where("car_bookings.status = ?", status)
	}
	if bookingDate, ok := filters["booking_date"]; ok {
		query = query.Where("car_bookings.departure_date = ?", bookingDate)
	}

	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	err := query.
		Preload("Request").
		Preload("Request.User").
		Preload("Car").
		Preload("BookedByUser").
		Order("car_bookings.departure_date DESC, car_bookings.start_time ASC").
		Offset(offset).
		Limit(pageSize).
		Find(&bookings).Error

	return bookings, total, err
}

// GetCalendarCarBookings gets car bookings for calendar view within date range
func (r *CarBookingRepository) GetCalendarCarBookings(startDate, endDate time.Time, carID *uint) ([]models.CarBooking, error) {
	var bookings []models.CarBooking

	query := r.db.Model(&models.CarBooking{}).
		Where("departure_date >= ? AND departure_date <= ?", startDate, endDate).
		Where("status IN ?", []models.CarBookingStatus{
			models.CarBookingConfirmed,
			models.CarBookingPickedUp,
			models.CarBookingInUse,
			models.CarBookingReturned,
			models.CarBookingLateReturn,
			models.CarBookingCompleted,
		})

	// Filter by car if specified
	if carID != nil {
		query = query.Where("car_id = ?", *carID)
	}

	err := query.
		Preload("Request").
		Preload("Request.User").
		Preload("Car").
		Preload("BookedByUser").
		Order("departure_date ASC, start_time ASC").
		Find(&bookings).Error

	return bookings, err
}

// GetCalendarCarRequests gets pending car requests for calendar view within date range
func (r *CarRequestRepository) GetCalendarCarRequests(startDate, endDate time.Time, carID *uint) ([]models.CarRequest, error) {
	var requests []models.CarRequest

	// Query to fetch pending requests that overlap with the calendar date range
	// Logic: request starts before calendar ends AND (request ends after calendar starts OR (no end date and starts after calendar starts))
	query := r.db.Model(&models.CarRequest{}).
		Where("status = ?", models.CarRequestPending).
		Where("booking_date <= ?", endDate).
		Where("(end_date IS NOT NULL AND end_date >= ?) OR (end_date IS NULL AND booking_date >= ?)", startDate, startDate)

	err := query.
		Preload("User").
		Order("booking_date ASC, start_time ASC").
		Find(&requests).Error

	return requests, err
}

// GetOldCarBookings gets all old car bookings (departure_date before given date) in non-terminal statuses
func (r *CarBookingRepository) GetOldCarBookings(beforeDate time.Time) ([]*models.CarBooking, error) {
	var bookings []*models.CarBooking
	err := r.db.
		Where("departure_date < ? AND status NOT IN ?", beforeDate, []models.CarBookingStatus{
			models.CarBookingReturned,
			models.CarBookingLateReturn,
			models.CarBookingCancelled,
		}).
		Preload("Car").
		Preload("Request").
		Find(&bookings).Error
	return bookings, err
}
