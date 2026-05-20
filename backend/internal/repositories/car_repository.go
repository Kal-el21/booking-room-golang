package repositories

import (
	"time"

	"github.com/Kal-el21/booking-room-golang/backend/internal/models"
	"gorm.io/gorm"
)

type CarRepository struct {
	db *gorm.DB
}

func NewCarRepository(db *gorm.DB) *CarRepository {
	return &CarRepository{db: db}
}

// Create creates a new car
func (r *CarRepository) Create(car *models.Car) error {
	return r.db.Create(car).Error
}

// FindByID finds car by ID
func (r *CarRepository) FindByID(id uint) (*models.Car, error) {
	var car models.Car
	err := r.db.Preload("Creator").First(&car, id).Error
	return &car, err
}

// Update updates car
func (r *CarRepository) Update(car *models.Car) error {
	return r.db.Save(car).Error
}

// Delete soft deletes car
func (r *CarRepository) Delete(id uint) error {
	return r.db.Delete(&models.Car{}, id).Error
}

// List gets all cars with pagination and filters
func (r *CarRepository) List(page, pageSize int, filters map[string]interface{}) ([]models.Car, int64, error) {
	var cars []models.Car
	var total int64

	offset := (page - 1) * pageSize
	query := r.db.Model(&models.Car{})

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
		query = query.Where("garage_location ILIKE ?", "%"+location.(string)+"%")
	}

	// Count total
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	// Get paginated results
	err := query.Preload("Creator").Offset(offset).Limit(pageSize).Find(&cars).Error
	return cars, total, err
}

// GetAvailableCars gets cars available for booking on specific date and time
func (r *CarRepository) GetAvailableCars(capacity int, bookingDate time.Time, startTime, endTime time.Time) ([]models.Car, error) {
	var cars []models.Car

	blockedStatuses := []models.CarBookingStatus{models.CarBookingConfirmed, models.CarBookingPickedUp, models.CarBookingInUse}

	// Subquery to find cars that are already booked at the requested time
	subQuery := r.db.Model(&models.CarBooking{}).
		Select("car_id").
		Where("departure_date = ?", bookingDate).
		Where("status IN ?", blockedStatuses).
		Where("(start_time < ? AND end_time > ?) OR (start_time < ? AND end_time > ?) OR (start_time >= ? AND end_time <= ?)",
			endTime, startTime,
			endTime, endTime,
			startTime, endTime,
		)

	// Find available cars
	err := r.db.
		Where("capacity >= ?", capacity).
		Where("status = ?", models.CarAvailable).
		Where("is_active = ?", true).
		Where("id NOT IN (?)", subQuery).
		Preload("Creator").
		Find(&cars).Error

	return cars, err
}

// CheckAvailability checks if car is available at specific date and time
func (r *CarRepository) CheckAvailability(carID uint, bookingDate time.Time, startTime, endTime time.Time, excludeBookingID *uint) (bool, error) {
	var count int64

	// Cars with confirmed, picked_up, or in_use status block availability
	blockedStatuses := []models.CarBookingStatus{
		models.CarBookingConfirmed,
		models.CarBookingPickedUp,
		models.CarBookingInUse,
	}

	query := r.db.Model(&models.CarBooking{}).
		Where("car_id = ?", carID).
		Where("departure_date = ?", bookingDate).
		Where("status IN ?", blockedStatuses).
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