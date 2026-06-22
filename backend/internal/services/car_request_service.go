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

type CarRequestService struct {
	requestRepo      *repositories.CarRequestRepository
	bookingRepo      *repositories.CarBookingRepository
	carRepo          *repositories.CarRepository
	notificationRepo *repositories.NotificationRepository
	notificationSvc  *NotificationService
	userRepo         *repositories.UserRepository
	db               *gorm.DB
}

func NewCarRequestService(
	requestRepo *repositories.CarRequestRepository,
	bookingRepo *repositories.CarBookingRepository,
	carRepo *repositories.CarRepository,
	notificationRepo *repositories.NotificationRepository,
	notificationSvc *NotificationService,
	userRepo *repositories.UserRepository,
	db *gorm.DB,
) *CarRequestService {
	return &CarRequestService{
		requestRepo:      requestRepo,
		bookingRepo:      bookingRepo,
		carRepo:          carRepo,
		notificationRepo: notificationRepo,
		notificationSvc:  notificationSvc,
		userRepo:         userRepo,
		db:               db,
	}
}

type CreateCarRequestInput struct {
	RequiredCapacity int     `json:"required_capacity" binding:"required,min=1"`
	Purpose          string  `json:"purpose" binding:"required"`
	Notes            *string `json:"notes"`

	// Travel information
	Destination            *string `json:"destination"`
	PickupLocation         *string `json:"pickup_location"`
	DriverRequired         bool    `json:"driver_required"`
	EstimatedDistanceKM    *int    `json:"estimated_distance_km" binding:"omitempty,min=0"`
	PassengerCount         *int    `json:"passenger_count" binding:"omitempty,min=1"`
	NeedsFuelReimbursement bool    `json:"needs_fuel_reimbursement"`
	FuelNote               *string `json:"fuel_note"`

	// Consumption
	HasConsumption  bool    `json:"has_consumption"`
	ConsumptionNote *string `json:"consumption_note"`

	// Single or multi-day
	BookingDate   string  `json:"booking_date"`                  // YYYY-MM-DD
	DepartureDate string  `json:"departure_date"`                // Backward-compatible alias for booking_date
	EndDate       *string `json:"end_date"`                      // YYYY-MM-DD (optional, for multi-day)
	StartTime     string  `json:"start_time" binding:"required"` // HH:MM
	EndTime       string  `json:"end_time" binding:"required"`   // HH:MM

	// Recurring
	IsRecurring      bool    `json:"is_recurring"`
	RecurringType    *string `json:"recurring_type"`     // "daily", "weekly", "monthly"
	RecurringDays    *string `json:"recurring_days"`     // "1,3,5" for Mon,Wed,Fri (weekly only)
	RecurringEndDate *string `json:"recurring_end_date"` // YYYY-MM-DD
}

func (input CreateCarRequestInput) normalizedBookingDate() string {
	if strings.TrimSpace(input.BookingDate) != "" {
		return input.BookingDate
	}
	return input.DepartureDate
}

type ApproveCarRequestInput struct {
	CarID             uint    `json:"car_id" binding:"required"`
	GAConsumptionNote *string `json:"ga_consumption_note"`
	DriverID          *uint   `json:"driver_id"`
}

type RejectCarRequestInput struct {
	Reason string `json:"reason" binding:"required"`
}

// CreateCarRequest creates a new car request
func (s *CarRequestService) CreateCarRequest(input CreateCarRequestInput, userID uint) (*models.CarRequest, error) {
	// Parse booking date
	bookingDateInput := input.normalizedBookingDate()
	if strings.TrimSpace(bookingDateInput) == "" {
		return nil, errors.New("booking_date is required")
	}

	bookingDate, err := time.Parse("2006-01-02", bookingDateInput)
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

	if err := validateCarTravelFields(input.RequiredCapacity, input.PassengerCount, input.EstimatedDistanceKM); err != nil {
		return nil, err
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
			if err := validateCarRecurringDays(input.RecurringDays); err != nil {
				return nil, err
			}
		}
	}

	// Create request
	request := &models.CarRequest{
		UserID:                 userID,
		RequiredCapacity:       input.RequiredCapacity,
		Purpose:                input.Purpose,
		Notes:                  input.Notes,
		Destination:            input.Destination,
		PickupLocation:         input.PickupLocation,
		DriverRequired:         input.DriverRequired,
		EstimatedDistanceKM:    input.EstimatedDistanceKM,
		PassengerCount:         input.PassengerCount,
		NeedsFuelReimbursement: input.NeedsFuelReimbursement,
		FuelNote:               input.FuelNote,
		HasConsumption:         input.HasConsumption,
		ConsumptionNote:        input.ConsumptionNote,
		BookingDate:            bookingDate,
		EndDate:                endDate,
		StartTime:              startTime,
		EndTime:                endTime,
		IsRecurring:            input.IsRecurring,
		RecurringType:          input.RecurringType,
		RecurringDays:          input.RecurringDays,
		RecurringEndDate:       recurringEndDate,
		Status:                 models.CarRequestPending,
	}

	if err := s.requestRepo.Create(request); err != nil {
		return nil, err
	}

	createdRequest, err := s.requestRepo.FindByID(request.ID)
	if err != nil {
		return nil, err
	}

	// Send notification to all GA users
	go s.notifyGANewCarRequest(createdRequest)

	return createdRequest, nil
}

// GetCarRequest gets request by ID
func (s *CarRequestService) GetCarRequest(id uint, userID uint, userRole models.UserRole) (*models.CarRequest, error) {
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

// ListCarRequests lists requests with pagination and filters
func (s *CarRequestService) ListCarRequests(page, pageSize int, userID uint, userRole models.UserRole, filters map[string]interface{}) ([]models.CarRequest, int64, error) {
	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 1000 {
		pageSize = 100
	}
	if filters == nil {
		filters = make(map[string]interface{})
	}

	// Only GA can see every car request. Other authenticated roles see their own.
	if userRole != models.RoleGA {
		filters["user_id"] = userID
	}

	return s.requestRepo.List(page, pageSize, filters)
}

// UpdateCarRequest updates request (only if pending)
func (s *CarRequestService) UpdateCarRequest(id uint, input CreateCarRequestInput, userID uint) (*models.CarRequest, error) {
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
	bookingDateInput := input.normalizedBookingDate()
	if strings.TrimSpace(bookingDateInput) == "" {
		return nil, errors.New("booking_date is required")
	}

	bookingDate, err := time.Parse("2006-01-02", bookingDateInput)
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

	// Validate date is not in the past
	if bookingDate.Before(time.Now().Truncate(24 * time.Hour)) {
		return nil, errors.New("booking date cannot be in the past")
	}

	if err := validateCarTravelFields(input.RequiredCapacity, input.PassengerCount, input.EstimatedDistanceKM); err != nil {
		return nil, err
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

		validTypes := map[string]bool{"daily": true, "weekly": true, "monthly": true}
		if !validTypes[*input.RecurringType] {
			return nil, errors.New("recurring_type must be: daily, weekly, or monthly")
		}

		parsed, err := time.Parse("2006-01-02", *input.RecurringEndDate)
		if err != nil {
			return nil, errors.New("invalid recurring_end_date format (use YYYY-MM-DD)")
		}
		if parsed.Before(bookingDate) {
			return nil, errors.New("recurring_end_date must be after booking_date")
		}

		duration := parsed.Sub(bookingDate).Hours() / 24
		if duration > 180 {
			return nil, errors.New("recurring booking cannot exceed 6 months")
		}

		recurringEndDate = &parsed

		if *input.RecurringType == "weekly" {
			if input.RecurringDays == nil || *input.RecurringDays == "" {
				return nil, errors.New("recurring_days is required for weekly recurring (e.g., '1,3,5' for Mon,Wed,Fri)")
			}
			if err := validateCarRecurringDays(input.RecurringDays); err != nil {
				return nil, err
			}
		}
	}

	// Update request
	request.RequiredCapacity = input.RequiredCapacity
	request.Purpose = input.Purpose
	request.Notes = input.Notes
	request.Destination = input.Destination
	request.PickupLocation = input.PickupLocation
	request.DriverRequired = input.DriverRequired
	request.EstimatedDistanceKM = input.EstimatedDistanceKM
	request.PassengerCount = input.PassengerCount
	request.NeedsFuelReimbursement = input.NeedsFuelReimbursement
	request.FuelNote = input.FuelNote
	request.HasConsumption = input.HasConsumption
	request.ConsumptionNote = input.ConsumptionNote
	request.BookingDate = bookingDate
	request.EndDate = endDate
	request.StartTime = startTime
	request.EndTime = endTime
	request.IsRecurring = input.IsRecurring
	request.RecurringType = input.RecurringType
	request.RecurringDays = input.RecurringDays
	request.RecurringEndDate = recurringEndDate

	if err := s.requestRepo.Update(request); err != nil {
		return nil, err
	}

	return s.requestRepo.FindByID(id)
}

// DeleteCarRequest deletes request (only if pending)
func (s *CarRequestService) DeleteCarRequest(id uint, userID uint) error {
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

// ApproveCarRequest approves request and creates booking(s) (GA only)
func (s *CarRequestService) ApproveCarRequest(id uint, input ApproveCarRequestInput, approverID uint) (*models.CarBooking, error) {
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

	// Check if car exists and available
	car, err := s.carRepo.FindByID(input.CarID)
	if err != nil {
		tx.Rollback()
		return nil, errors.New("car not found")
	}

	if !car.IsAvailable() {
		tx.Rollback()
		return nil, errors.New("car is not available")
	}

	// Check car capacity
	if car.SeatCapacity < request.RequiredCapacity {
		tx.Rollback()
		return nil, fmt.Errorf("car capacity (%d) is less than required (%d)", car.SeatCapacity, request.RequiredCapacity)
	}

	// Validate driver if request requires driver
	if request.DriverRequired {
		if input.DriverID == nil || *input.DriverID == 0 {
			tx.Rollback()
			return nil, errors.New("driver is required for this request")
		}
		driver, err := s.userRepo.FindByID(*input.DriverID)
		if err != nil {
			tx.Rollback()
			return nil, errors.New("driver not found")
		}
		if driver.Role != models.RoleDriver {
			tx.Rollback()
			return nil, errors.New("selected user is not a driver")
		}
	}

	// Generate booking dates
	bookingDates := s.generateCarBookingDates(request)
	if len(bookingDates) == 0 {
		tx.Rollback()
		return nil, errors.New("request does not produce any booking dates")
	}

	// Check availability for all dates
	for _, date := range bookingDates {
		available, err := s.carRepo.CheckAvailability(input.CarID, date, request.StartTime, request.EndTime, nil)
		if err != nil {
			tx.Rollback()
			return nil, err
		}
		if !available {
			tx.Rollback()
			return nil, fmt.Errorf("car is not available on %s", date.Format("2006-01-02"))
		}
	}

	// Update request status and consumption note
	request.Status = models.CarRequestApproved
	request.AssignedBy = &approverID
	if input.GAConsumptionNote != nil && *input.GAConsumptionNote != "" {
		request.GAConsumptionNote = input.GAConsumptionNote
	}

	if err := tx.Save(request).Error; err != nil {
		tx.Rollback()
		return nil, err
	}

	// Create bookings for all dates
	var firstBooking *models.CarBooking
	var driverID *uint
	if input.DriverID != nil && *input.DriverID > 0 {
		driverID = input.DriverID
	}
	for _, date := range bookingDates {
		plateSnapshot := car.PlateNumber
		carNameSnapshot := car.CarName
		booking := &models.CarBooking{
			RequestID:           request.ID,
			CarID:               input.CarID,
			BookedBy:            request.UserID,
			DriverID:            driverID,
			DepartureDate:       date,
			StartTime:           request.StartTime,
			EndTime:             request.EndTime,
			Status:              models.CarBookingConfirmed,
			PlateNumberSnapshot: plateSnapshot,
			CarNameSnapshot:     &carNameSnapshot,
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
		go s.createCarNotificationSchedules(booking)
	}

	// Commit transaction
	if err := tx.Commit().Error; err != nil {
		return nil, err
	}

	reloadedBooking, err := s.bookingRepo.FindByID(firstBooking.ID)
	if err != nil {
		return nil, err
	}

	// Send notification to user
	go s.notifyUserCarRequestApproved(request, reloadedBooking)

	// Reload booking with relations
	return reloadedBooking, nil
}

// generateCarBookingDates generates all dates for multi-day and recurring bookings
func (s *CarRequestService) generateCarBookingDates(request *models.CarRequest) []time.Time {
	var dates []time.Time

	if request.IsRecurring {
		// Handle recurring bookings
		dates = s.generateCarRecurringDates(request)
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

// generateCarRecurringDates generates dates for recurring bookings
func (s *CarRequestService) generateCarRecurringDates(request *models.CarRequest) []time.Time {
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
		weekdays := parseCarWeekdays(request.RecurringDays)

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

// parseCarWeekdays parses weekday string "1,3,5" to []int{1,3,5}
func parseCarWeekdays(daysStr *string) []int {
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

func validateCarTravelFields(requiredCapacity int, passengerCount, estimatedDistanceKM *int) error {
	if passengerCount != nil && *passengerCount > requiredCapacity {
		return errors.New("passenger_count cannot exceed required_capacity")
	}
	if estimatedDistanceKM != nil && *estimatedDistanceKM < 0 {
		return errors.New("estimated_distance_km cannot be negative")
	}
	return nil
}

func validateCarRecurringDays(daysStr *string) error {
	if daysStr == nil || strings.TrimSpace(*daysStr) == "" {
		return errors.New("recurring_days is required for weekly recurring")
	}

	for _, dayStr := range strings.Split(*daysStr, ",") {
		dayStr = strings.TrimSpace(dayStr)
		day, err := strconv.Atoi(dayStr)
		if err != nil || day < 1 || day > 7 {
			return errors.New("recurring_days must contain numbers from 1 to 7")
		}
	}

	if len(parseCarWeekdays(daysStr)) == 0 {
		return errors.New("recurring_days must contain at least one valid day")
	}

	return nil
}

// RejectCarRequest rejects request (GA only)
func (s *CarRequestService) RejectCarRequest(id uint, input RejectCarRequestInput, rejecterID uint) (*models.CarRequest, error) {
	request, err := s.requestRepo.FindByID(id)
	if err != nil {
		return nil, err
	}

	// Check if request is pending
	if !request.IsPending() {
		return nil, errors.New("only pending requests can be rejected")
	}

	// Check if rejecting would cause conflicts (if there are approved bookings for overlapping dates)
	conflictSvc := NewCarConflictService(s.db)
	_ = conflictSvc

	// Update request
	request.Status = models.CarRequestRejected
	request.AssignedBy = &rejecterID
	request.RejectedReason = &input.Reason

	if err := s.requestRepo.Update(request); err != nil {
		return nil, err
	}

	// Send notification to user
	go s.notifyUserCarRequestRejected(request)

	return s.requestRepo.FindByID(id)
}

// GetAvailableCarsForRequest gets available cars for a request
func (s *CarRequestService) GetAvailableCarsForRequest(requestID uint) ([]models.Car, error) {
	request, err := s.requestRepo.FindByID(requestID)
	if err != nil {
		return nil, err
	}

	bookingDates := s.generateCarBookingDates(request)
	if len(bookingDates) == 0 {
		return nil, errors.New("request does not produce any booking dates")
	}

	cars, err := s.carRepo.GetAvailableCarsForDates(
		request.RequiredCapacity,
		bookingDates,
		request.StartTime,
		request.EndTime,
	)
	if err != nil {
		return nil, err
	}

	return cars, nil
}

// GetCalendarCarRequests gets calendar view of car bookings and requests
func (s *CarRequestService) GetCalendarCarRequests(startDate, endDate string, carID *uint) ([]models.CarBooking, []models.CarRequest, error) {
	start, err := time.Parse("2006-01-02", startDate)
	if err != nil {
		return nil, nil, errors.New("invalid start date format (use YYYY-MM-DD)")
	}

	end, err := time.Parse("2006-01-02", endDate)
	if err != nil {
		return nil, nil, errors.New("invalid end date format (use YYYY-MM-DD)")
	}

	// Validate date range
	if end.Before(start) {
		return nil, nil, errors.New("end date must be after start date")
	}

	// Get confirmed car bookings from repository with date range
	bookings, err := s.bookingRepo.GetCalendarCarBookings(start, end, carID)
	if err != nil {
		return nil, nil, err
	}

	// Get pending car requests from repository with date range
	requests, err := s.requestRepo.GetCalendarCarRequests(start, end, carID)
	if err != nil {
		return nil, nil, err
	}

	return bookings, requests, nil
}

// Notification helpers (broadcasts to SSE automatically)
func (s *CarRequestService) notifyGANewCarRequest(request *models.CarRequest) {
	// Get all GA users
	gaUsers, _, _ := s.userRepo.List(1, 100)

	for _, user := range gaUsers {
		if user.Role == models.RoleGA {
			notification := &models.Notification{
				UserID:  user.ID,
				Title:   "New Car Request",
				Message: fmt.Sprintf("New car request from %s for %s", request.User.Name, request.Purpose),
				Type:    models.NotifNewCarRequest,
				Channel: models.ChannelInApp,
			}
			s.notificationSvc.CreateNotification(notification) // Broadcasts to SSE
		}
	}
}

func (s *CarRequestService) notifyUserCarRequestApproved(request *models.CarRequest, booking *models.CarBooking) {
	notification := &models.Notification{
		UserID:    request.UserID,
		BookingID: &booking.ID,
		Title:     "Car Request Approved",
		Message:   fmt.Sprintf("Your car request has been approved. Car: %s", booking.Car.CarName),
		Type:      models.NotifCarBookingConfirmed,
		Channel:   models.ChannelBoth,
	}
	s.notificationSvc.CreateNotification(notification) // Broadcasts to SSE
}

func (s *CarRequestService) notifyUserCarRequestRejected(request *models.CarRequest) {
	notification := &models.Notification{
		UserID:  request.UserID,
		Title:   "Car Request Rejected",
		Message: fmt.Sprintf("Your car request has been rejected. Reason: %s", *request.RejectedReason),
		Type:    models.NotifCarBookingRejected,
		Channel: models.ChannelBoth,
	}
	s.notificationSvc.CreateNotification(notification) // Broadcasts to SSE
}

func (s *CarRequestService) createCarNotificationSchedules(booking *models.CarBooking) {
	bookingDateTime := time.Date(
		booking.DepartureDate.Year(),
		booking.DepartureDate.Month(),
		booking.DepartureDate.Day(),
		booking.StartTime.Hour(),
		booking.StartTime.Minute(),
		0, 0,
		booking.DepartureDate.Location(),
	)

	// 24h before
	bookingID := booking.ID
	schedule24h := &models.NotificationSchedule{
		CarBookingID: &bookingID,
		NotifyType:   "24h_before",
		NotifyAt:     bookingDateTime.Add(-24 * time.Hour),
		Channel:      models.ChannelBoth,
	}
	s.notificationRepo.CreateSchedule(schedule24h)

	// 3h before
	schedule3h := &models.NotificationSchedule{
		CarBookingID: &bookingID,
		NotifyType:   "3h_before",
		NotifyAt:     bookingDateTime.Add(-3 * time.Hour),
		Channel:      models.ChannelBoth,
	}
	s.notificationRepo.CreateSchedule(schedule3h)

	// 30m before
	schedule30m := &models.NotificationSchedule{
		CarBookingID: &bookingID,
		NotifyType:   "30m_before",
		NotifyAt:     bookingDateTime.Add(-30 * time.Minute),
		Channel:      models.ChannelInApp,
	}
	s.notificationRepo.CreateSchedule(schedule30m)
}
