package services

import (
	"errors"
	"os"
	"time"

	"github.com/Kal-el21/booking-room-golang/backend/internal/models"
	"github.com/Kal-el21/booking-room-golang/backend/internal/repositories"
)

type RoomService struct {
	roomRepo *repositories.RoomRepository
}

func NewRoomService(roomRepo *repositories.RoomRepository) *RoomService {
	return &RoomService{
		roomRepo: roomRepo,
	}
}

type CreateRoomInput struct {
	RoomName    string            `json:"room_name" binding:"required"`
	Capacity    int               `json:"capacity" binding:"required,min=1"`
	Location    string            `json:"location" binding:"required"`
	Description *string           `json:"description"`
	Status      models.RoomStatus `json:"status"`
}

type UpdateRoomInput struct {
	RoomName    *string            `json:"room_name"`
	Capacity    *int               `json:"capacity" binding:"omitempty,min=1"`
	Location    *string            `json:"location"`
	Description *string            `json:"description"`
	Status      *models.RoomStatus `json:"status"`
	IsActive    *bool              `json:"is_active"`
}

type CheckAvailabilityInput struct {
	BookingDate string `json:"booking_date" binding:"required"` // YYYY-MM-DD
	StartTime   string `json:"start_time" binding:"required"`   // HH:MM
	EndTime     string `json:"end_time" binding:"required"`     // HH:MM
}

// CreateRoom creates a new room
func (s *RoomService) CreateRoom(input CreateRoomInput, createdBy uint) (*models.Room, error) {
	// Set default status if not provided
	status := input.Status
	if status == "" {
		status = models.RoomAvailable
	}

	room := &models.Room{
		RoomName:    input.RoomName,
		Capacity:    input.Capacity,
		Location:    input.Location,
		Description: input.Description,
		Status:      status,
		IsActive:    true,
		CreatedBy:   createdBy,
	}

	if err := s.roomRepo.Create(room); err != nil {
		return nil, err
	}

	return s.roomRepo.FindByID(room.ID)
}

// GetRoom gets room by ID
func (s *RoomService) GetRoom(id uint) (*models.Room, error) {
	return s.roomRepo.FindByID(id)
}

// UpdateRoom updates room
func (s *RoomService) UpdateRoom(id uint, input UpdateRoomInput) (*models.Room, error) {
	room, err := s.roomRepo.FindByID(id)
	if err != nil {
		return nil, err
	}

	// Update fields if provided
	if input.RoomName != nil {
		room.RoomName = *input.RoomName
	}
	if input.Capacity != nil {
		room.Capacity = *input.Capacity
	}
	if input.Location != nil {
		room.Location = *input.Location
	}
	if input.Description != nil {
		room.Description = input.Description
	}
	if input.Status != nil {
		room.Status = *input.Status
	}
	if input.IsActive != nil {
		room.IsActive = *input.IsActive
	}

	if err := s.roomRepo.Update(room); err != nil {
		return nil, err
	}

	return s.roomRepo.FindByID(id)
}

// DeleteRoom deletes room (soft delete) and removes image file
func (s *RoomService) DeleteRoom(id uint) error {
	// Get room first to find image path
	room, err := s.roomRepo.FindByID(id)
	if err != nil {
		return err
	}

	// Delete image file if exists
	// ImageURL is like /uploads/rooms/filename.jpg
	// Local path is ./internal/uploads/rooms/filename.jpg
	if room.ImageURL != nil && *room.ImageURL != "" {
		localPath := "." + *room.ImageURL
		_ = os.Remove(localPath)
	}

	return s.roomRepo.Delete(id)
}

// ListRooms lists all rooms with pagination and filters
func (s *RoomService) ListRooms(page, pageSize int, filters map[string]interface{}) ([]models.Room, int64, error) {
	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 100 {
		pageSize = 10
	}

	return s.roomRepo.List(page, pageSize, filters)
}

// CheckAvailability checks if room is available for booking
func (s *RoomService) CheckAvailability(roomID uint, input CheckAvailabilityInput) (bool, error) {
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

	// Check if room exists
	room, err := s.roomRepo.FindByID(roomID)
	if err != nil {
		return false, err
	}

	// Check if room is active and available
	if !room.IsAvailable() {
		return false, errors.New("room is not available")
	}

	// Check availability
	return s.roomRepo.CheckAvailability(roomID, bookingDate, startTime, endTime, nil)
}

// GetAvailableRooms gets available rooms for specific criteria
func (s *RoomService) GetAvailableRooms(capacity int, bookingDate, startTime, endTime string) ([]models.Room, error) {
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

	return s.roomRepo.GetAvailableRooms(capacity, date, start, end)
}

// UpdateRoomImage updates room image URL in database
func (s *RoomService) UpdateRoomImage(id uint, imageURL string) (*models.Room, error) {
	room, err := s.roomRepo.FindByID(id)
	if err != nil {
		return nil, err
	}

	room.ImageURL = &imageURL
	if err := s.roomRepo.Update(room); err != nil {
		return nil, err
	}

	return s.roomRepo.FindByID(id)
}
