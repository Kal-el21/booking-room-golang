package repositories

import (
	"time"

	"github.com/Kal-el21/booking-room-golang/backend/internal/models"

	"gorm.io/gorm"
)

type RequestRepository struct {
	db *gorm.DB
}

func NewRequestRepository(db *gorm.DB) *RequestRepository {
	return &RequestRepository{db: db}
}

// Create creates a new request
func (r *RequestRepository) Create(request *models.RoomRequest) error {
	return r.db.Create(request).Error
}

// FindByID finds request by ID
func (r *RequestRepository) FindByID(id uint) (*models.RoomRequest, error) {
	var request models.RoomRequest
	err := r.db.
		Preload("User").
		Preload("Assigner").
		Preload("Bookings.Room").         // Load bookings with room info
		Preload("Bookings.BookedByUser"). // Load who booked it
		First(&request, id).Error
	return &request, err
}

// Update updates request
func (r *RequestRepository) Update(request *models.RoomRequest) error {
	return r.db.Save(request).Error
}

// Delete soft deletes request
func (r *RequestRepository) Delete(id uint) error {
	return r.db.Delete(&models.RoomRequest{}, id).Error
}

// List gets all requests with pagination and filters
func (r *RequestRepository) List(page, pageSize int, filters map[string]interface{}) ([]models.RoomRequest, int64, error) {
	var requests []models.RoomRequest
	var total int64

	offset := (page - 1) * pageSize
	query := r.db.Model(&models.RoomRequest{})

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
		Preload("Bookings").      // Changed from Booking to Bookings
		Preload("Bookings.Room"). // Preload room info for each booking
		Order("created_at DESC").
		Offset(offset).
		Limit(pageSize).
		Find(&requests).Error

	return requests, total, err
}

// GetPendingRequests gets all pending requests
func (r *RequestRepository) GetPendingRequests() ([]models.RoomRequest, error) {
	var requests []models.RoomRequest
	err := r.db.
		Where("status = ?", models.RequestPending).
		Preload("User").
		Preload("Bookings").      // Changed from Booking to Bookings
		Preload("Bookings.Room"). // Preload room info
		Order("created_at ASC").
		Find(&requests).Error
	return requests, err
}

// BookingRepository handles booking data access
type BookingRepository struct {
	db *gorm.DB
}

func NewBookingRepository(db *gorm.DB) *BookingRepository {
	return &BookingRepository{db: db}
}

// Create creates a new booking
func (r *BookingRepository) Create(booking *models.RoomBooking) error {
	return r.db.Create(booking).Error
}

// FindByID finds booking by ID
func (r *BookingRepository) FindByID(id uint) (*models.RoomBooking, error) {
	var booking models.RoomBooking
	err := r.db.
		Preload("Request").
		Preload("Request.User").
		Preload("Room").
		Preload("BookedByUser").
		First(&booking, id).Error
	return &booking, err
}

// FindByRequestID finds all bookings by request ID (for multi-day/recurring)
func (r *BookingRepository) FindByRequestID(requestID uint) ([]models.RoomBooking, error) {
	var bookings []models.RoomBooking
	err := r.db.
		Where("request_id = ?", requestID).
		Preload("Room").
		Preload("Request").
		Preload("Request.User").
		Order("booking_date ASC").
		Find(&bookings).Error
	return bookings, err
}

// Update updates booking
func (r *BookingRepository) Update(booking *models.RoomBooking) error {
	return r.db.Save(booking).Error
}

// Delete soft deletes booking
func (r *BookingRepository) Delete(id uint) error {
	return r.db.Delete(&models.RoomBooking{}, id).Error
}

// List gets all bookings with pagination and filters
func (r *BookingRepository) List(page, pageSize int, filters map[string]interface{}) ([]models.RoomBooking, int64, error) {
	var bookings []models.RoomBooking
	var total int64

	offset := (page - 1) * pageSize
	query := r.db.Model(&models.RoomBooking{})

	// Apply filters
	if roomID, ok := filters["room_id"]; ok {
		query = query.Where("room_id = ?", roomID)
	}
	if status, ok := filters["status"]; ok {
		query = query.Where("status = ?", status)
	}
	if bookingDate, ok := filters["booking_date"]; ok {
		query = query.Where("booking_date = ?", bookingDate)
	}

	// Count total
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	// Get paginated results
	err := query.
		Preload("Request").
		Preload("Request.User").
		Preload("Room").
		Preload("BookedByUser").
		Order("booking_date DESC, start_time ASC").
		Offset(offset).
		Limit(pageSize).
		Find(&bookings).Error

	return bookings, total, err
}

// GetUserBookings gets all bookings for a specific user
func (r *BookingRepository) GetUserBookings(userID uint) ([]models.RoomBooking, error) {
	var bookings []models.RoomBooking
	err := r.db.
		Joins("JOIN room_requests ON room_bookings.request_id = room_requests.id").
		Where("room_requests.user_id = ?", userID).
		Preload("Request").
		Preload("Room").
		Order("booking_date DESC, start_time ASC").
		Find(&bookings).Error
	return bookings, err
}

// GetCalendarBookings gets bookings for calendar view within date range
func (r *BookingRepository) GetCalendarBookings(startDate, endDate time.Time, roomID *uint) ([]models.RoomBooking, error) {
	var bookings []models.RoomBooking

	query := r.db.Model(&models.RoomBooking{}).
		Where("booking_date >= ? AND booking_date <= ?", startDate, endDate).
		Where("status IN ?", []models.BookingStatus{models.BookingConfirmed, models.BookingCompleted})

	// Filter by room if specified
	if roomID != nil {
		query = query.Where("room_id = ?", *roomID)
	}

	err := query.
		Preload("Request").
		Preload("Request.User").
		Preload("Room").
		Preload("BookedByUser").
		Order("booking_date ASC, start_time ASC").
		Find(&bookings).Error

	return bookings, err
}

// GetCalendarRequests gets pending requests for calendar view within date range
func (r *RequestRepository) GetCalendarRequests(startDate, endDate time.Time, roomID *uint) ([]models.RoomRequest, error) {
	var requests []models.RoomRequest

	// Query to fetch pending requests that overlap with the calendar date range
	// Logic: request starts before calendar ends AND (request ends after calendar starts OR (no end date and starts after calendar starts))
	query := r.db.Model(&models.RoomRequest{}).
		Where("status = ?", models.RequestPending).
		Where("booking_date <= ?", endDate).
		Where("(end_date IS NOT NULL AND end_date >= ?) OR (end_date IS NULL AND booking_date >= ?)", startDate, startDate)

	err := query.
		Preload("User").
		Order("booking_date ASC, start_time ASC").
		Find(&requests).Error

	return requests, err
}

// GetOldBookings gets all confirmed bookings with booking_date before the given date
func (r *BookingRepository) GetOldBookings(beforeDate time.Time) ([]*models.RoomBooking, error) {
	var bookings []*models.RoomBooking
	err := r.db.
		Where("booking_date < ? AND status = ?", beforeDate, models.BookingConfirmed).
		Preload("Room").
		Preload("Request").
		Find(&bookings).Error
	return bookings, err
}
