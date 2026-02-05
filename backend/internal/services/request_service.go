package services

import (
	"errors"
	"fmt"
	"strconv"
	"strings"
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
	notificationSvc  *NotificationService
	userRepo         *repositories.UserRepository
	db               *gorm.DB
}

func NewRequestService(
	requestRepo *repositories.RequestRepository,
	bookingRepo *repositories.BookingRepository,
	roomRepo *repositories.RoomRepository,
	notificationRepo *repositories.NotificationRepository,
	notificationSvc *NotificationService,
	userRepo *repositories.UserRepository,
	db *gorm.DB,
) *RequestService {
	return &RequestService{
		requestRepo:      requestRepo,
		bookingRepo:      bookingRepo,
		roomRepo:         roomRepo,
		notificationRepo: notificationRepo,
		notificationSvc:  notificationSvc,
		userRepo:         userRepo,
		db:               db,
	}
}

type CreateRequestInput struct {
	RequiredCapacity int     `json:"required_capacity" binding:"required,min=1"`
	Purpose          string  `json:"purpose" binding:"required"`
	Notes            *string `json:"notes"`

	// Single or multi-day
	BookingDate string  `json:"booking_date" binding:"required"` // YYYY-MM-DD
	EndDate     *string `json:"end_date"`                        // YYYY-MM-DD (optional, for multi-day)
	StartTime   string  `json:"start_time" binding:"required"`   // HH:MM
	EndTime     string  `json:"end_time" binding:"required"`     // HH:MM

	// Recurring
	IsRecurring      bool    `json:"is_recurring"`
	RecurringType    *string `json:"recurring_type"`     // "daily", "weekly", "monthly"
	RecurringDays    *string `json:"recurring_days"`     // "1,3,5" for Mon,Wed,Fri (weekly only)
	RecurringEndDate *string `json:"recurring_end_date"` // YYYY-MM-DD
}

type ApproveRequestInput struct {
	RoomID uint `json:"room_id" binding:"required"`
}

type RejectRequestInput struct {
	Reason string `json:"reason" binding:"required"`
}

// CreateRequest creates a new room request
func (s *RequestService) CreateRequest(input CreateRequestInput, userID uint) (*models.RoomRequest, error) {
	// Parse booking date
	bookingDate, err := time.Parse("2006-01-02", input.BookingDate)
	if err != nil {
		return nil, errors.New("invalid booking date format (use YYYY-MM-DD)")
	}

	// Parse times - parse as local time to avoid timezone conversion issues
	// Format: "2006-01-02T15:04-07:00" (without seconds)
	startTimeStr := "2006-01-02T" + input.StartTime + "+07:00"
	startTime, err := time.Parse("2006-01-02T15:04-07:00", startTimeStr)
	if err != nil {
		return nil, errors.New("invalid start time format (use HH:MM)")
	}

	endTimeStr := "2006-01-02T" + input.EndTime + "+07:00"
	endTime, err := time.Parse("2006-01-02T15:04-07:00", endTimeStr)
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

	// Parse end date for multi-day
	var endDate *time.Time
	if input.EndDate != nil && *input.EndDate != "" {
		parsed, err := time.Parse("2006-01-02", *input.EndDate)
		if err != nil {
			return nil, errors.New("invalid end date format (use YYYY-MM-DD)")
		}
		if parsed.Before(bookingDate) {
			return nil, errors.New("end date must be after or equal to booking date")
		}
		// Limit multi-day to 30 days
		duration := parsed.Sub(bookingDate).Hours() / 24
		if duration > 30 {
			return nil, errors.New("multi-day booking cannot exceed 30 days")
		}
		endDate = &parsed
	}

	// Parse recurring end date
	var recurringEndDate *time.Time
	if input.IsRecurring {
		if input.RecurringEndDate == nil || *input.RecurringEndDate == "" {
			return nil, errors.New("recurring_end_date is required for recurring bookings")
		}
		if input.RecurringType == nil || *input.RecurringType == "" {
			return nil, errors.New("recurring_type is required for recurring bookings")
		}

		// Validate recurring type
		validTypes := map[string]bool{"daily": true, "weekly": true, "monthly": true}
		if !validTypes[*input.RecurringType] {
			return nil, errors.New("recurring_type must be: daily, weekly, or monthly")
		}

		// Parse recurring end date
		parsed, err := time.Parse("2006-01-02", *input.RecurringEndDate)
		if err != nil {
			return nil, errors.New("invalid recurring_end_date format (use YYYY-MM-DD)")
		}
		if parsed.Before(bookingDate) {
			return nil, errors.New("recurring_end_date must be after booking_date")
		}

		// Limit recurring to 6 months
		duration := parsed.Sub(bookingDate).Hours() / 24
		if duration > 180 {
			return nil, errors.New("recurring booking cannot exceed 6 months")
		}

		recurringEndDate = &parsed

		// Validate weekly recurring days
		if *input.RecurringType == "weekly" {
			if input.RecurringDays == nil || *input.RecurringDays == "" {
				return nil, errors.New("recurring_days is required for weekly recurring (e.g., '1,3,5' for Mon,Wed,Fri)")
			}
		}
	}

	// Create request
	request := &models.RoomRequest{
		UserID:           userID,
		RequiredCapacity: input.RequiredCapacity,
		Purpose:          input.Purpose,
		Notes:            input.Notes,
		BookingDate:      bookingDate,
		EndDate:          endDate,
		StartTime:        startTime,
		EndTime:          endTime,
		IsRecurring:      input.IsRecurring,
		RecurringType:    input.RecurringType,
		RecurringDays:    input.RecurringDays,
		RecurringEndDate: recurringEndDate,
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

	startTimeStr := "2006-01-02T" + input.StartTime + "+07:00"
	startTime, err := time.Parse("2006-01-02T15:04-07:00", startTimeStr)
	if err != nil {
		return nil, errors.New("invalid start time format")
	}

	endTimeStr := "2006-01-02T" + input.EndTime + "+07:00"
	endTime, err := time.Parse("2006-01-02T15:04-07:00", endTimeStr)
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

// ApproveRequest approves request and creates booking(s) (GA only)
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

	// Generate booking dates
	bookingDates := s.generateBookingDates(request)

	// Check availability for all dates
	for _, date := range bookingDates {
		available, err := s.roomRepo.CheckAvailability(input.RoomID, date, request.StartTime, request.EndTime, nil)
		if err != nil {
			tx.Rollback()
			return nil, err
		}
		if !available {
			tx.Rollback()
			return nil, fmt.Errorf("room is not available on %s", date.Format("2006-01-02"))
		}
	}

	// Update request status
	request.Status = models.RequestApproved
	request.AssignedBy = &approverID
	if err := tx.Save(request).Error; err != nil {
		tx.Rollback()
		return nil, err
	}

	// Create bookings for all dates
	var firstBooking *models.RoomBooking
	for _, date := range bookingDates {
		booking := &models.RoomBooking{
			RequestID:   request.ID,
			RoomID:      input.RoomID,
			BookedBy:    approverID,
			BookingDate: date,
			StartTime:   request.StartTime,
			EndTime:     request.EndTime,
			Status:      models.BookingConfirmed,
		}

		if err := tx.Create(booking).Error; err != nil {
			tx.Rollback()
			return nil, err
		}

		// Save first booking to return
		if firstBooking == nil {
			firstBooking = booking
		}

		// Create notification schedules for each booking
		go s.createNotificationSchedules(booking)
	}

	// Commit transaction
	if err := tx.Commit().Error; err != nil {
		return nil, err
	}

	// Send notification to user
	go s.notifyUserRequestApproved(request, firstBooking)

	// Reload booking with relations
	return s.bookingRepo.FindByID(firstBooking.ID)
}

// generateBookingDates generates all dates for multi-day and recurring bookings
func (s *RequestService) generateBookingDates(request *models.RoomRequest) []time.Time {
	var dates []time.Time

	if request.IsRecurring {
		// Handle recurring bookings
		dates = s.generateRecurringDates(request)
	} else if request.EndDate != nil {
		// Handle multi-day bookings
		currentDate := request.BookingDate
		for !currentDate.After(*request.EndDate) {
			dates = append(dates, currentDate)
			currentDate = currentDate.AddDate(0, 0, 1)
		}
	} else {
		// Single day booking
		dates = []time.Time{request.BookingDate}
	}

	return dates
}

// generateRecurringDates generates dates for recurring bookings
func (s *RequestService) generateRecurringDates(request *models.RoomRequest) []time.Time {
	var dates []time.Time
	currentDate := request.BookingDate

	switch *request.RecurringType {
	case "daily":
		// Every day until recurring_end_date
		for !currentDate.After(*request.RecurringEndDate) {
			dates = append(dates, currentDate)
			currentDate = currentDate.AddDate(0, 0, 1)
		}

	case "weekly":
		// Parse weekdays
		weekdays := parseWeekdays(request.RecurringDays)

		// Generate dates for specified weekdays
		for !currentDate.After(*request.RecurringEndDate) {
			weekday := int(currentDate.Weekday())
			if weekday == 0 {
				weekday = 7 // Sunday = 7
			}

			// Check if current weekday is in the list
			for _, day := range weekdays {
				if day == weekday {
					dates = append(dates, currentDate)
					break
				}
			}
			currentDate = currentDate.AddDate(0, 0, 1)
		}

	case "monthly":
		// Same day each month
		dayOfMonth := currentDate.Day()
		for !currentDate.After(*request.RecurringEndDate) {
			// Adjust for months with fewer days
			lastDayOfMonth := time.Date(currentDate.Year(), currentDate.Month()+1, 0, 0, 0, 0, 0, time.UTC).Day()
			day := dayOfMonth
			if day > lastDayOfMonth {
				day = lastDayOfMonth
			}

			bookingDate := time.Date(currentDate.Year(), currentDate.Month(), day, 0, 0, 0, 0, currentDate.Location())
			if !bookingDate.Before(request.BookingDate) && !bookingDate.After(*request.RecurringEndDate) {
				dates = append(dates, bookingDate)
			}

			currentDate = currentDate.AddDate(0, 1, 0) // Next month
		}
	}

	return dates
}

// parseWeekdays parses weekday string "1,3,5" to []int{1,3,5}
func parseWeekdays(daysStr *string) []int {
	if daysStr == nil || *daysStr == "" {
		return []int{}
	}

	var weekdays []int
	for _, dayStr := range strings.Split(*daysStr, ",") {
		dayStr = strings.TrimSpace(dayStr)
		if day, err := strconv.Atoi(dayStr); err == nil && day >= 1 && day <= 7 {
			weekdays = append(weekdays, day)
		}
	}
	return weekdays
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

// Notification helpers (broadcasts to SSE automatically)
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
			s.notificationSvc.CreateNotification(notification) // Broadcasts to SSE
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
	s.notificationSvc.CreateNotification(notification) // Broadcasts to SSE
}

func (s *RequestService) notifyUserRequestRejected(request *models.RoomRequest) {
	notification := &models.Notification{
		UserID:  request.UserID,
		Title:   "Request Rejected",
		Message: fmt.Sprintf("Your room request has been rejected. Reason: %s", *request.RejectedReason),
		Type:    models.NotifBookingRejected,
		Channel: models.ChannelBoth,
	}
	s.notificationSvc.CreateNotification(notification) // Broadcasts to SSE
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
