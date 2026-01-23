package services

import (
	"errors"
	"fmt"
	"time"

	"github.com/Kal-el21/booking-room-golang/backend/internal/models"
	"github.com/Kal-el21/booking-room-golang/backend/internal/repositories"

	"gorm.io/gorm"
)

type RequestService struct {
	requestRepo      *repositories.RequestRepository
	bookingRepo      *repositories.BookingRepository
	roomRepo         *repositories.RoomRepository
	notificationRepo *repositories.NotificationRepository
	userRepo         *repositories.UserRepository
	db               *gorm.DB
}

func NewRequestService(
	requestRepo *repositories.RequestRepository,
	bookingRepo *repositories.BookingRepository,
	roomRepo *repositories.RoomRepository,
	notificationRepo *repositories.NotificationRepository,
	userRepo *repositories.UserRepository,
	db *gorm.DB,
) *RequestService {
	return &RequestService{
		requestRepo:      requestRepo,
		bookingRepo:      bookingRepo,
		roomRepo:         roomRepo,
		notificationRepo: notificationRepo,
		userRepo:         userRepo,
		db:               db,
	}
}

type CreateRequestInput struct {
	RequiredCapacity int     `json:"required_capacity" binding:"required,min=1"`
	Purpose          string  `json:"purpose" binding:"required"`
	Notes            *string `json:"notes"`
	BookingDate      string  `json:"booking_date" binding:"required"` // YYYY-MM-DD
	StartTime        string  `json:"start_time" binding:"required"`   // HH:MM
	EndTime          string  `json:"end_time" binding:"required"`     // HH:MM
}

type ApproveRequestInput struct {
	RoomID uint `json:"room_id" binding:"required"`
}

type RejectRequestInput struct {
	Reason string `json:"reason" binding:"required"`
}

// CreateRequest creates a new room request
func (s *RequestService) CreateRequest(input CreateRequestInput, userID uint) (*models.RoomRequest, error) {
	// Parse date and times
	bookingDate, err := time.Parse("2006-01-02", input.BookingDate)
	if err != nil {
		return nil, errors.New("invalid booking date format (use YYYY-MM-DD)")
	}

	startTime, err := time.Parse("15:04", input.StartTime)
	if err != nil {
		return nil, errors.New("invalid start time format (use HH:MM)")
	}

	endTime, err := time.Parse("15:04", input.EndTime)
	if err != nil {
		return nil, errors.New("invalid end time format (use HH:MM)")
	}

	// Validate date is not in the past
	if bookingDate.Before(time.Now().Truncate(24 * time.Hour)) {
		return nil, errors.New("booking date cannot be in the past")
	}

	// Validate time range
	if !endTime.After(startTime) {
		return nil, errors.New("end time must be after start time")
	}

	// Create request
	request := &models.RoomRequest{
		UserID:           userID,
		RequiredCapacity: input.RequiredCapacity,
		Purpose:          input.Purpose,
		Notes:            input.Notes,
		BookingDate:      bookingDate,
		StartTime:        startTime,
		EndTime:          endTime,
		Status:           models.RequestPending,
	}

	if err := s.requestRepo.Create(request); err != nil {
		return nil, err
	}

	// Send notification to all GA users
	go s.notifyGANewRequest(request)

	return s.requestRepo.FindByID(request.ID)
}

// GetRequest gets request by ID
func (s *RequestService) GetRequest(id uint, userID uint, userRole models.UserRole) (*models.RoomRequest, error) {
	request, err := s.requestRepo.FindByID(id)
	if err != nil {
		return nil, err
	}

	// Check permission: user can only view their own requests, GA can view all
	if userRole != models.RoleGA && request.UserID != userID {
		return nil, errors.New("you don't have permission to view this request")
	}

	return request, nil
}

// ListRequests lists requests with pagination and filters
func (s *RequestService) ListRequests(page, pageSize int, userID uint, userRole models.UserRole, filters map[string]interface{}) ([]models.RoomRequest, int64, error) {
	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 100 {
		pageSize = 10
	}

	// Regular users can only see their own requests
	if userRole == models.RoleUser {
		filters["user_id"] = userID
	}

	return s.requestRepo.List(page, pageSize, filters)
}

// UpdateRequest updates request (only if pending)
func (s *RequestService) UpdateRequest(id uint, input CreateRequestInput, userID uint) (*models.RoomRequest, error) {
	request, err := s.requestRepo.FindByID(id)
	if err != nil {
		return nil, err
	}

	// Check permission
	if request.UserID != userID {
		return nil, errors.New("you don't have permission to update this request")
	}

	// Can only update pending requests
	if !request.CanBeModified() {
		return nil, errors.New("only pending requests can be modified")
	}

	// Parse and validate dates
	bookingDate, err := time.Parse("2006-01-02", input.BookingDate)
	if err != nil {
		return nil, errors.New("invalid booking date format")
	}

	startTime, err := time.Parse("15:04", input.StartTime)
	if err != nil {
		return nil, errors.New("invalid start time format")
	}

	endTime, err := time.Parse("15:04", input.EndTime)
	if err != nil {
		return nil, errors.New("invalid end time format")
	}

	if !endTime.After(startTime) {
		return nil, errors.New("end time must be after start time")
	}

	// Update request
	request.RequiredCapacity = input.RequiredCapacity
	request.Purpose = input.Purpose
	request.Notes = input.Notes
	request.BookingDate = bookingDate
	request.StartTime = startTime
	request.EndTime = endTime

	if err := s.requestRepo.Update(request); err != nil {
		return nil, err
	}

	return s.requestRepo.FindByID(id)
}

// DeleteRequest deletes request (only if pending)
func (s *RequestService) DeleteRequest(id uint, userID uint) error {
	request, err := s.requestRepo.FindByID(id)
	if err != nil {
		return err
	}

	// Check permission
	if request.UserID != userID {
		return errors.New("you don't have permission to delete this request")
	}

	// Can only delete pending requests
	if !request.CanBeModified() {
		return errors.New("only pending requests can be deleted")
	}

	return s.requestRepo.Delete(id)
}

// ApproveRequest approves request and creates booking (GA only)
func (s *RequestService) ApproveRequest(id uint, input ApproveRequestInput, approverID uint) (*models.RoomBooking, error) {
	// Start transaction
	tx := s.db.Begin()
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	// Get request
	request, err := s.requestRepo.FindByID(id)
	if err != nil {
		tx.Rollback()
		return nil, err
	}

	// Check if request is pending
	if !request.IsPending() {
		tx.Rollback()
		return nil, errors.New("only pending requests can be approved")
	}

	// Check if room exists and available
	room, err := s.roomRepo.FindByID(input.RoomID)
	if err != nil {
		tx.Rollback()
		return nil, errors.New("room not found")
	}

	if !room.IsAvailable() {
		tx.Rollback()
		return nil, errors.New("room is not available")
	}

	// Check room capacity
	if room.Capacity < request.RequiredCapacity {
		tx.Rollback()
		return nil, fmt.Errorf("room capacity (%d) is less than required (%d)", room.Capacity, request.RequiredCapacity)
	}

	// Check room availability for the requested time
	available, err := s.roomRepo.CheckAvailability(input.RoomID, request.BookingDate, request.StartTime, request.EndTime, nil)
	if err != nil {
		tx.Rollback()
		return nil, err
	}

	if !available {
		tx.Rollback()
		return nil, errors.New("room is already booked for the requested time")
	}

	// Update request status
	request.Status = models.RequestApproved
	request.AssignedBy = &approverID
	if err := tx.Save(request).Error; err != nil {
		tx.Rollback()
		return nil, err
	}

	// Create booking
	booking := &models.RoomBooking{
		RequestID:   request.ID,
		RoomID:      input.RoomID,
		BookedBy:    approverID,
		BookingDate: request.BookingDate,
		StartTime:   request.StartTime,
		EndTime:     request.EndTime,
		Status:      models.BookingConfirmed,
	}

	if err := tx.Create(booking).Error; err != nil {
		tx.Rollback()
		return nil, err
	}

	// Commit transaction
	if err := tx.Commit().Error; err != nil {
		return nil, err
	}

	// Send notification to user
	go s.notifyUserRequestApproved(request, booking)

	// Create notification schedules (24h, 3h, 30m before)
	go s.createNotificationSchedules(booking)

	// Reload booking with relations
	return s.bookingRepo.FindByID(booking.ID)
}

// RejectRequest rejects request (GA only)
func (s *RequestService) RejectRequest(id uint, input RejectRequestInput, rejecterID uint) (*models.RoomRequest, error) {
	request, err := s.requestRepo.FindByID(id)
	if err != nil {
		return nil, err
	}

	// Check if request is pending
	if !request.IsPending() {
		return nil, errors.New("only pending requests can be rejected")
	}

	// Update request
	request.Status = models.RequestRejected
	request.AssignedBy = &rejecterID
	request.RejectedReason = &input.Reason

	if err := s.requestRepo.Update(request); err != nil {
		return nil, err
	}

	// Send notification to user
	go s.notifyUserRequestRejected(request)

	return s.requestRepo.FindByID(id)
}

// GetAvailableRoomsForRequest gets available rooms for a request
func (s *RequestService) GetAvailableRoomsForRequest(requestID uint) ([]models.Room, error) {
	request, err := s.requestRepo.FindByID(requestID)
	if err != nil {
		return nil, err
	}

	return s.roomRepo.GetAvailableRooms(
		request.RequiredCapacity,
		request.BookingDate,
		request.StartTime,
		request.EndTime,
	)
}

// Notification helpers (will be implemented in notification service)
func (s *RequestService) notifyGANewRequest(request *models.RoomRequest) {
	// Get all GA users
	gaUsers, _, _ := s.userRepo.List(1, 100)

	for _, user := range gaUsers {
		if user.Role == models.RoleGA {
			notification := &models.Notification{
				UserID:  user.ID,
				Title:   "New Room Request",
				Message: fmt.Sprintf("New room request from %s for %s", request.User.Name, request.Purpose),
				Type:    models.NotifNewRequest,
				Channel: models.ChannelInApp,
			}
			s.notificationRepo.Create(notification)
		}
	}
}

func (s *RequestService) notifyUserRequestApproved(request *models.RoomRequest, booking *models.RoomBooking) {
	notification := &models.Notification{
		UserID:    request.UserID,
		BookingID: &booking.ID,
		Title:     "Request Approved",
		Message:   fmt.Sprintf("Your room request has been approved. Room: %s", booking.Room.RoomName),
		Type:      models.NotifBookingConfirmed,
		Channel:   models.ChannelBoth,
	}
	s.notificationRepo.Create(notification)
}

func (s *RequestService) notifyUserRequestRejected(request *models.RoomRequest) {
	notification := &models.Notification{
		UserID:  request.UserID,
		Title:   "Request Rejected",
		Message: fmt.Sprintf("Your room request has been rejected. Reason: %s", *request.RejectedReason),
		Type:    models.NotifBookingRejected,
		Channel: models.ChannelBoth,
	}
	s.notificationRepo.Create(notification)
}

func (s *RequestService) createNotificationSchedules(booking *models.RoomBooking) {
	bookingDateTime := time.Date(
		booking.BookingDate.Year(),
		booking.BookingDate.Month(),
		booking.BookingDate.Day(),
		booking.StartTime.Hour(),
		booking.StartTime.Minute(),
		0, 0,
		booking.BookingDate.Location(),
	)

	// 24h before
	schedule24h := &models.NotificationSchedule{
		BookingID:  booking.ID,
		NotifyType: "24h_before",
		NotifyAt:   bookingDateTime.Add(-24 * time.Hour),
		Channel:    models.ChannelBoth,
	}
	s.notificationRepo.CreateSchedule(schedule24h)

	// 3h before
	schedule3h := &models.NotificationSchedule{
		BookingID:  booking.ID,
		NotifyType: "3h_before",
		NotifyAt:   bookingDateTime.Add(-3 * time.Hour),
		Channel:    models.ChannelBoth,
	}
	s.notificationRepo.CreateSchedule(schedule3h)

	// 30m before
	schedule30m := &models.NotificationSchedule{
		BookingID:  booking.ID,
		NotifyType: "30m_before",
		NotifyAt:   bookingDateTime.Add(-30 * time.Minute),
		Channel:    models.ChannelInApp,
	}
	s.notificationRepo.CreateSchedule(schedule30m)
}
