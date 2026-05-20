package services

import (
	"errors"
	"os"
	"time"

	"github.com/Kal-el21/booking-room-golang/backend/internal/models"
	"github.com/Kal-el21/booking-room-golang/backend/internal/repositories"
)

type CarService struct {
	carRepo *repositories.CarRepository
}

func NewCarService(carRepo *repositories.CarRepository) *CarService {
	return &CarService{
		carRepo: carRepo,
	}
}

type CreateCarInput struct {
	CarName    string            `json:"car_name" binding:"required"`
	Capacity   int               `json:"capacity" binding:"required,min=1"`
	Location   string            `json:"location" binding:"required"`
	Description *string           `json:"description"`
	Status     models.CarStatus  `json:"status"`
}

type UpdateCarInput struct {
	CarName    *string            `json:"car_name"`
	Capacity   *int               `json:"capacity" binding:"omitempty,min=1"`
	Location   *string            `json:"location"`
	Description *string            `json:"description"`
	Status     *models.CarStatus  `json:"status"`
	IsActive   *bool              `json:"is_active"`
}

type CarCheckAvailabilityInput struct {
	BookingDate string `json:"booking_date" binding:"required"` // YYYY-MM-DD
	StartTime   string `json:"start_time" binding:"required"`   // HH:MM
	EndTime     string `json:"end_time" binding:"required"`     // HH:MM
}

// CreateCar creates a new car
func (s *CarService) CreateCar(input CreateCarInput, createdBy uint) (*models.Car, error) {
	// Set default status if not provided
	status := input.Status
	if status == "" {
		status = models.CarAvailable
	}

	car := &models.Car{
		CarName:        input.CarName,
		SeatCapacity:   input.Capacity,
		GarageLocation: input.Location,
		Description:    input.Description,
		Status:         status,
		IsActive:       true,
		CreatedBy:      createdBy,
	}

	if err := s.carRepo.Create(car); err != nil {
		return nil, err
	}

	return s.carRepo.FindByID(car.ID)
}

// GetCar gets car by ID
func (s *CarService) GetCar(id uint) (*models.Car, error) {
	return s.carRepo.FindByID(id)
}

// UpdateCar updates car
func (s *CarService) UpdateCar(id uint, input UpdateCarInput) (*models.Car, error) {
	car, err := s.carRepo.FindByID(id)
	if err != nil {
		return nil, err
	}

	// Update fields if provided
	if input.CarName != nil {
		car.CarName = *input.CarName
	}
	if input.Capacity != nil {
		car.SeatCapacity = *input.Capacity
	}
	if input.Location != nil {
		car.GarageLocation = *input.Location
	}
	if input.Description != nil {
		car.Description = input.Description
	}
	if input.Status != nil {
		car.Status = *input.Status
	}
	if input.IsActive != nil {
		car.IsActive = *input.IsActive
	}

	if err := s.carRepo.Update(car); err != nil {
		return nil, err
	}

	return s.carRepo.FindByID(id)
}

// DeleteCar deletes car (soft delete) and removes image file
func (s *CarService) DeleteCar(id uint) error {
	// Get car first to find image path
	car, err := s.carRepo.FindByID(id)
	if err != nil {
		return err
	}

	// Delete image file if exists
	// ImageURL is like /uploads/cars/filename.jpg
	// Local path is ./internal/uploads/cars/filename.jpg
	if car.ImageURL != nil && *car.ImageURL != "" {
		localPath := "." + *car.ImageURL
		_ = os.Remove(localPath)
	}

	return s.carRepo.Delete(id)
}

// ListCars lists all cars with pagination and filters
func (s *CarService) ListCars(page, pageSize int, filters map[string]interface{}) ([]models.Car, int64, error) {
	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 100 {
		pageSize = 10
	}

	return s.carRepo.List(page, pageSize, filters)
}

// CheckAvailability checks if car is available for booking
func (s *CarService) CheckAvailability(carID uint, input CarCheckAvailabilityInput) (bool, error) {
	// Parse date and times
	bookingDate, err := time.Parse("2006-01-02", input.BookingDate)
	if err != nil {
		return false, errors.New("invalid booking date format")
	}

	startTime, err := time.Parse("15:04", input.StartTime)
	if err != nil {
		return false, errors.New("invalid start time format")
	}

	endTime, err := time.Parse("15:04", input.EndTime)
	if err != nil {
		return false, errors.New("invalid end time format")
	}

	// Validate time range
	if !endTime.After(startTime) {
		return false, errors.New("end time must be after start time")
	}

	// Check if car exists
	car, err := s.carRepo.FindByID(carID)
	if err != nil {
		return false, err
	}

	// Check if car is active and available
	if !car.IsAvailable() {
		return false, errors.New("car is not available")
	}

	// Check availability
	return s.carRepo.CheckAvailability(carID, bookingDate, startTime, endTime, nil)
}

// GetAvailableCars gets available cars for specific criteria
func (s *CarService) GetAvailableCars(capacity int, bookingDate, startTime, endTime string) ([]models.Car, error) {
	// Parse date and times
	date, err := time.Parse("2006-01-02", bookingDate)
	if err != nil {
		return nil, errors.New("invalid booking date format")
	}

	start, err := time.Parse("15:04", startTime)
	if err != nil {
		return nil, errors.New("invalid start time format")
	}

	end, err := time.Parse("15:04", endTime)
	if err != nil {
		return nil, errors.New("invalid end time format")
	}

	// Validate time range
	if !end.After(start) {
		return nil, errors.New("end time must be after start time")
	}

	return s.carRepo.GetAvailableCars(capacity, date, start, end)
}

// UpdateCarImage updates car image URL in database
func (s *CarService) UpdateCarImage(id uint, imageURL string) (*models.Car, error) {
	car, err := s.carRepo.FindByID(id)
	if err != nil {
		return nil, err
	}

	car.ImageURL = &imageURL
	if err := s.carRepo.Update(car); err != nil {
		return nil, err
	}

	return s.carRepo.FindByID(id)
}