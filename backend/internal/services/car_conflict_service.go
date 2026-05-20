package services

import (
	"fmt"
	"time"

	"github.com/Kal-el21/booking-room-golang/backend/internal/models"
	"gorm.io/gorm"
)

// CarConflictService detects booking conflicts when managing car booking requests
type CarConflictService struct {
	db *gorm.DB
}

func NewCarConflictService(db *gorm.DB) *CarConflictService {
	return &CarConflictService{db: db}
}

// ConflictInfo holds information about a detected conflict
type ConflictInfo struct {
	BookingID        uint       `json:"booking_id"`
	CarID            uint       `json:"car_id"`
	CarName          string     `json:"car_name"`
	PlateNumber      string     `json:"plate_number"`
	Status           string     `json:"status"`
	DepartureDate    string     `json:"departure_date"`
	StartTime        string     `json:"start_time"`
	EndTime          string     `json:"end_time"`
	BookedByUserName string     `json:"booked_by_user_name"`
}

// ConflictResult holds results for all conflicting bookings
type ConflictResult struct {
	HasConflicts   bool           `json:"has_conflicts"`
	ConflictCount  int            `json:"conflict_count"`
	Conflicts      []ConflictInfo `json:"conflicts"`
}

// FindConflictingCarBookings finds all bookings that overlap with a given date/time range for a specific car
func (s *CarConflictService) FindConflictingCarBookings(carID uint, bookingDate time.Time, startTime, endTime time.Time, excludeStatuses ...models.CarBookingStatus) (*ConflictResult, error) {
	blockedStatuses := []models.CarBookingStatus{
		models.CarBookingConfirmed,
		models.CarBookingPickedUp,
		models.CarBookingInUse,
	}

	if len(excludeStatuses) > 0 {
		blockedStatuses = excludeStatuses
	}

	var bookings []models.CarBooking
	err := s.db.
		Where("car_id = ?", carID).
		Where("departure_date = ?", bookingDate).
		Where("status IN ?", blockedStatuses).
		Where("(start_time < ? AND end_time > ?) OR (start_time < ? AND end_time > ?) OR (start_time >= ? AND end_time <= ?)",
			endTime, startTime,
			endTime, endTime,
			startTime, endTime,
		).
		Preload("Car").
		Preload("BookedByUser").
		Find(&bookings).Error

	if err != nil {
		return nil, fmt.Errorf("failed to find conflicting bookings: %w", err)
	}

	result := &ConflictResult{
		HasConflicts:  len(bookings) > 0,
		ConflictCount: len(bookings),
		Conflicts:     make([]ConflictInfo, len(bookings)),
	}

	for i, b := range bookings {
		result.Conflicts[i] = ConflictInfo{
			BookingID:        b.ID,
			CarID:            b.CarID,
			CarName:          b.Car.CarName,
			PlateNumber:      b.GetPlateNumber(),
			Status:           string(b.Status),
			DepartureDate:    b.DepartureDate.Format("2006-01-02"),
			StartTime:        b.StartTime.Format("15:04"),
			EndTime:          b.EndTime.Format("15:04"),
			BookedByUserName: b.BookedByUser.Name,
		}
	}

	return result, nil
}

// FindConflictingCarRequests finds all car requests that overlap with a given date/time range for a specific car
// (scheduled for future use — no caller yet)
func (s *CarConflictService) FindConflictingCarRequests(carID uint, bookingDate time.Time, startTime, endTime time.Time) (*ConflictResult, error) {
	var results []struct {
		ID       uint   `gorm:"column:id"`
		UserID   uint   `gorm:"column:user_id"`
		Name     string `gorm:"column:name"`
		Status   string `gorm:"column:status"`
		CarID    uint   `gorm:"column:car_id"`
		CarName  string `gorm:"column:car_name"`
		PlateNum string `gorm:"column:plate_num"`
		Date     string `gorm:"column:date"`
		STime    string `gorm:"column:start_time"`
		ETime    string `gorm:"column:end_time"`
	}

	err := s.db.
		Table("car_bookings").
		Select(`
			car_bookings.id,
			car_bookings.status,
			car_bookings.departure_date,
			car_bookings.start_time,
			car_bookings.end_time,
			users.id as user_id,
			users.name,
			cars.id as car_id,
			cars.car_name,
			cars.plate_number as plate_num
		`).
		Joins("JOIN car_requests ON car_bookings.request_id = car_requests.id").
		Joins("JOIN users ON car_requests.user_id = users.id").
		Joins("JOIN cars ON car_bookings.car_id = cars.id").
		Where("car_bookings.car_id = ?", carID).
		Where("car_bookings.departure_date = ?", bookingDate).
		Where("car_bookings.status IN ?", []models.CarBookingStatus{models.CarBookingConfirmed, models.CarBookingPickedUp, models.CarBookingInUse}).
		Where("(car_bookings.start_time < ? AND car_bookings.end_time > ?) OR (car_bookings.start_time < ? AND car_bookings.end_time > ?) OR (car_bookings.start_time >= ? AND car_bookings.end_time <= ?)",
			endTime, startTime,
			endTime, endTime,
			startTime, endTime,
		).
		Scan(&results).Error

	if err != nil {
		return nil, fmt.Errorf("failed to find conflicting requests: %w", err)
	}

	conflictInfo := make([]ConflictInfo, len(results))
	for i, r := range results {
		conflictInfo[i] = ConflictInfo{
			BookingID:        r.ID,
			CarID:            r.CarID,
			CarName:          r.CarName,
			PlateNumber:      r.PlateNum,
			Status:           r.Status,
			DepartureDate:    r.Date,
			StartTime:        r.STime,
			EndTime:          r.ETime,
			BookedByUserName: r.Name,
		}
	}

	return &ConflictResult{
		HasConflicts:  len(results) > 0,
		ConflictCount: len(results),
		Conflicts:     conflictInfo,
	}, nil
}
