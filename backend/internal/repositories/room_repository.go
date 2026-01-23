package repositories

import (
	"time"

	"github.com/Kal-el21/booking-room-golang/backend/internal/models"

	"gorm.io/gorm"
)

type RoomRepository struct {
	db *gorm.DB
}

func NewRoomRepository(db *gorm.DB) *RoomRepository {
	return &RoomRepository{db: db}
}

// Create creates a new room
func (r *RoomRepository) Create(room *models.Room) error {
	return r.db.Create(room).Error
}

// FindByID finds room by ID
func (r *RoomRepository) FindByID(id uint) (*models.Room, error) {
	var room models.Room
	err := r.db.Preload("Creator").First(&room, id).Error
	return &room, err
}

// Update updates room
func (r *RoomRepository) Update(room *models.Room) error {
	return r.db.Save(room).Error
}

// Delete soft deletes room
func (r *RoomRepository) Delete(id uint) error {
	return r.db.Delete(&models.Room{}, id).Error
}

// List gets all rooms with pagination and filters
func (r *RoomRepository) List(page, pageSize int, filters map[string]interface{}) ([]models.Room, int64, error) {
	var rooms []models.Room
	var total int64

	offset := (page - 1) * pageSize
	query := r.db.Model(&models.Room{})

	// Apply filters
	if status, ok := filters["status"]; ok {
		query = query.Where("status = ?", status)
	}
	if isActive, ok := filters["is_active"]; ok {
		query = query.Where("is_active = ?", isActive)
	}
	if minCapacity, ok := filters["min_capacity"]; ok {
		query = query.Where("capacity >= ?", minCapacity)
	}
	if location, ok := filters["location"]; ok {
		query = query.Where("location ILIKE ?", "%"+location.(string)+"%")
	}

	// Count total
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	// Get paginated results
	err := query.Preload("Creator").Offset(offset).Limit(pageSize).Find(&rooms).Error
	return rooms, total, err
}

// GetAvailableRooms gets rooms available for booking on specific date and time
func (r *RoomRepository) GetAvailableRooms(capacity int, bookingDate time.Time, startTime, endTime time.Time) ([]models.Room, error) {
	var rooms []models.Room

	// Subquery to find rooms that are already booked at the requested time
	subQuery := r.db.Model(&models.RoomBooking{}).
		Select("room_id").
		Where("booking_date = ?", bookingDate).
		Where("status = ?", models.BookingConfirmed).
		Where("(start_time < ? AND end_time > ?) OR (start_time < ? AND end_time > ?) OR (start_time >= ? AND end_time <= ?)",
			endTime, startTime,
			endTime, endTime,
			startTime, endTime,
		)

	// Find available rooms
	err := r.db.
		Where("capacity >= ?", capacity).
		Where("status = ?", models.RoomAvailable).
		Where("is_active = ?", true).
		Where("id NOT IN (?)", subQuery).
		Preload("Creator").
		Find(&rooms).Error

	return rooms, err
}

// CheckAvailability checks if room is available at specific date and time
func (r *RoomRepository) CheckAvailability(roomID uint, bookingDate time.Time, startTime, endTime time.Time, excludeBookingID *uint) (bool, error) {
	var count int64

	query := r.db.Model(&models.RoomBooking{}).
		Where("room_id = ?", roomID).
		Where("booking_date = ?", bookingDate).
		Where("status = ?", models.BookingConfirmed).
		Where("(start_time < ? AND end_time > ?) OR (start_time < ? AND end_time > ?) OR (start_time >= ? AND end_time <= ?)",
			endTime, startTime,
			endTime, endTime,
			startTime, endTime,
		)

	// Exclude specific booking (for updates)
	if excludeBookingID != nil {
		query = query.Where("id != ?", *excludeBookingID)
	}

	err := query.Count(&count).Error
	return count == 0, err
}
