package services

import (
	"errors"
	"fmt"
	"time"

	"github.com/Kal-el21/booking-room-golang/backend/internal/models"
	"github.com/Kal-el21/booking-room-golang/backend/internal/repositories"
	"gorm.io/gorm"
)

// CarBookingService handles car booking lifecycle operations
type CarBookingService struct {
	bookingRepo      *repositories.CarBookingRepository
	requestRepo      *repositories.CarRequestRepository
	carRepo          *repositories.CarRepository
	notificationRepo *repositories.NotificationRepository
	notificationSvc  *NotificationService
	userRepo         *repositories.UserRepository
	db               *gorm.DB
}

func NewCarBookingService(
	bookingRepo *repositories.CarBookingRepository,
	requestRepo *repositories.CarRequestRepository,
	carRepo *repositories.CarRepository,
	notificationRepo *repositories.NotificationRepository,
	notificationSvc *NotificationService,
	userRepo *repositories.UserRepository,
	db *gorm.DB,
) *CarBookingService {
	return &CarBookingService{
		bookingRepo:      bookingRepo,
		requestRepo:      requestRepo,
		carRepo:          carRepo,
		notificationRepo: notificationRepo,
		notificationSvc:  notificationSvc,
		userRepo:         userRepo,
		db:               db,
	}
}

// PickUpBooking records the pickup of a confirmed booking
func (s *CarBookingService) PickUpBooking(bookingID uint, driverID *uint, pickupLocation *string, startOdometer int, actorID uint) (*models.CarBooking, error) {
	booking, err := s.bookingRepo.FindByID(bookingID)
	if err != nil {
		return nil, errors.New("booking not found")
	}

	if !booking.CanTransitionTo(models.CarBookingPickedUp) {
		return nil, errors.New("booking cannot be picked up in current status")
	}

	// If driver is assigned, verify they are indeed a driver
	if driverID != nil {
		user, err := s.userRepo.FindByID(*driverID)
		if err != nil {
			return nil, errors.New("driver not found")
		}
		if !user.IsDriver() {
			return nil, errors.New("assigned user is not a driver")
		}
		booking.DriverID = driverID
		booking.DriverNameSnapshot = &user.Name
	}

	// Snapshot car info at pickup time
	booking.PlateNumberSnapshot = booking.Car.PlateNumber
	booking.CarNameSnapshot = &booking.Car.CarName

	booking.PickupLocation = pickupLocation
	booking.PickedUpAt = &time.Time{}
	*booking.PickedUpAt = time.Now().Local()
	booking.StartOdometer = &startOdometer
	booking.Status = models.CarBookingPickedUp

	if err := s.bookingRepo.Update(booking); err != nil {
		return nil, fmt.Errorf("failed to update booking: %w", err)
	}

	// Reload with all relations
	reloaded, err := s.bookingRepo.FindByID(bookingID)
	if err != nil {
		return nil, err
	}

	// Notify GA of pickup
	go s.notifyGABookingPickedUp(reloaded)

	return reloaded, nil
}

// ReturnBooking records the return of a picked-up or in-use booking
func (s *CarBookingService) ReturnBooking(bookingID uint, endOdometer int, fuelLevelReturn int, returnNotes *string, actorID uint) (*models.CarBooking, error) {
	booking, err := s.bookingRepo.FindByID(bookingID)
	if err != nil {
		return nil, errors.New("booking not found")
	}

	if !booking.CanTransitionTo(models.CarBookingReturned) {
		return nil, errors.New("booking cannot be returned in current status")
	}

	now := time.Now().Local()
	booking.ReturnedAt = &now
	booking.EndOdometer = &endOdometer
	booking.FuelLevelReturn = &fuelLevelReturn
	booking.ReturnNotes = returnNotes

	// Determine if late return
	isLate := s.isLateReturn(booking)
	if isLate {
		booking.Status = models.CarBookingLateReturn
	} else {
		booking.Status = models.CarBookingReturned
	}

	if err := s.bookingRepo.Update(booking); err != nil {
		return nil, fmt.Errorf("failed to update booking: %w", err)
	}

	// Update car odometer if end odometer is greater than current
	if endOdometer > booking.Car.CurrentOdometer {
		car, err := s.carRepo.FindByID(booking.CarID)
		if err == nil {
			car.CurrentOdometer = endOdometer
			if err := s.carRepo.Update(car); err != nil {
				fmt.Printf("Warning: failed to update car odometer: %v\n", err)
			}
		}
	}

	// Reload
	reloaded, err := s.bookingRepo.FindByID(bookingID)
	if err != nil {
		return nil, err
	}

	if isLate {
		go s.notifyGALateReturn(reloaded)
	}

	return reloaded, nil
}

// isLateReturn checks whether the return happened after the booking end time
// For single-day bookings: compare end time; for multi-day: compare last day's end time
func (s *CarBookingService) isLateReturn(booking *models.CarBooking) bool {
	bookingEnd := time.Date(
		booking.DepartureDate.Year(),
		booking.DepartureDate.Month(),
		booking.DepartureDate.Day(),
		booking.EndTime.Hour(),
		booking.EndTime.Minute(),
		0, 0,
		booking.DepartureDate.Location(),
	)
	// GA can manually override by setting status = returned instead of late_return
	return time.Now().Local().After(bookingEnd)
}

// GetDriverBookings gets all confirmed/picked-up/in-use car bookings assigned to a driver
func (s *CarBookingService) GetDriverBookings(driverID uint) ([]models.CarBooking, error) {
	var bookings []models.CarBooking
	err := s.db.
		Where("driver_id = ?", driverID).
		Where("status IN ?", []models.CarBookingStatus{
			models.CarBookingConfirmed,
			models.CarBookingPickedUp,
			models.CarBookingInUse,
		}).
		Preload("Car").
		Preload("Car.Creator").
		Preload("Request").
		Preload("Request.User").
		Order("departure_date ASC, start_time ASC").
		Find(&bookings).Error

	return bookings, err
}

// GetCarBooking gets a single booking by ID
func (s *CarBookingService) GetCarBooking(bookingID uint) (*models.CarBooking, error) {
	return s.bookingRepo.FindByID(bookingID)
}

// AssignDriver assigns a driver to a car booking (GA only)
func (s *CarBookingService) AssignDriver(bookingID uint, driverID uint, actorID uint) (*models.CarBooking, error) {
	booking, err := s.bookingRepo.FindByID(bookingID)
	if err != nil {
		return nil, errors.New("booking not found")
	}

	user, err := s.userRepo.FindByID(driverID)
	if err != nil {
		return nil, errors.New("driver not found")
	}
	if !user.IsDriver() {
		return nil, errors.New("assigned user is not a driver")
	}

	booking.DriverID = &driverID
	booking.DriverNameSnapshot = &user.Name

	if err := s.bookingRepo.Update(booking); err != nil {
		return nil, fmt.Errorf("failed to assign driver: %w", err)
	}

	reloaded, err := s.bookingRepo.FindByID(bookingID)
	if err != nil {
		return nil, err
	}

	go s.notifyDriverAssigned(reloaded, user.Name)

	return reloaded, nil
}

// UnassignDriver removes driver assignment from a car booking (GA only)
func (s *CarBookingService) UnassignDriver(bookingID uint, actorID uint) (*models.CarBooking, error) {
	booking, err := s.bookingRepo.FindByID(bookingID)
	if err != nil {
		return nil, errors.New("booking not found")
	}

	if booking.DriverID == nil {
		return nil, errors.New("booking has no assigned driver")
	}

	booking.DriverID = nil
	booking.DriverNameSnapshot = nil

	if err := s.bookingRepo.Update(booking); err != nil {
		return nil, fmt.Errorf("failed to unassign driver: %w", err)
	}

	reloaded, err := s.bookingRepo.FindByID(bookingID)
	if err != nil {
		return nil, err
	}

	return reloaded, nil
}

// UpdateBookingStatus allows GA to manually override booking status (overrides state machine)
func (s *CarBookingService) UpdateBookingStatus(bookingID uint, newStatus models.CarBookingStatus, actorID uint) (*models.CarBooking, error) {
	booking, err := s.bookingRepo.FindByID(bookingID)
	if err != nil {
		return nil, errors.New("booking not found")
	}

	currentStatus := booking.Status

	// Allowed GA override transitions
	// - late_return → returned (excuse the driver)
	// - confirmed → cancelled (GA manually cancels)
	// - picked_up → confirmed (reset pickup)
	// - in_use → confirmed (reset in-use)
	allowedOverrides := map[models.CarBookingStatus]models.CarBookingStatus{
		models.CarBookingLateReturn: models.CarBookingReturned,
		models.CarBookingConfirmed:  models.CarBookingCancelled,
		models.CarBookingPickedUp:   models.CarBookingConfirmed,
		models.CarBookingInUse:      models.CarBookingConfirmed,
	}

	if expected, ok := allowedOverrides[currentStatus]; ok && newStatus == expected {
		booking.Status = newStatus
	} else if !booking.CanTransitionTo(newStatus) {
		return nil, fmt.Errorf("cannot transition booking from %s to %s", currentStatus, newStatus)
	} else {
		booking.Status = newStatus
	}

	if err := s.bookingRepo.Update(booking); err != nil {
		return nil, fmt.Errorf("failed to update booking status: %w", err)
	}

	reloaded, err := s.bookingRepo.FindByID(bookingID)
	if err != nil {
		return nil, err
	}

	// Notify driver when status is changed by GA
	if currentStatus != newStatus {
		go s.notifyDriverStatusChange(reloaded, string(currentStatus), string(newStatus))
	}

	return reloaded, nil
}

// CanManageCarBookings checks if user can manage car bookings (GA)
func CanManageCarBookings(role models.UserRole) bool {
	return role == models.RoleGA
}

// ListBookings lists all car bookings with pagination and filters
func (s *CarBookingService) ListBookings(page, pageSize int, filters map[string]interface{}) ([]models.CarBooking, int64, error) {
	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 100 {
		pageSize = 10
	}
	return s.bookingRepo.List(page, pageSize, filters)
}

// ToCarBookingResponseList converts car booking list to response list
func ToCarBookingResponseList(bookings []models.CarBooking) []models.CarBookingResponse {
	var responses []models.CarBookingResponse
	for _, booking := range bookings {
		responses = append(responses, booking.ToResponse())
	}
	return responses
}

// FleetStatusItem represents the lifecycle status of a single car
type FleetStatusItem struct {
	CarID      uint   `json:"car_id"`
	CarName    string `json:"car_name"`
	PlateNum   string `json:"plate_num"`
	Status     string `json:"car_status"`      // available / occupied / maintenance
	BookingID  *uint  `json:"current_booking_id"`
	BookingStatus string `json:"current_booking_status"`
}

// FleetStatusSummary holds aggregate counts for the GA dashboard
type FleetStatusSummary struct {
	TotalCars       int `json:"total_cars"`
	AvailableCars   int `json:"available_cars"`
	OccupiedCars    int `json:"occupied_cars"`
	MaintenanceCars int `json:"maintenance_cars"`
	// Active bookings by lifecycle phase
	ConfirmedBookings int `json:"confirmed_bookings"`
	PickedUpBookings  int `json:"picked_up_bookings"`
	InUseBookings     int `json:"in_use_bookings"`
}

// FleetStatusResponse is the full fleet + activity dashboard payload
type FleetStatusResponse struct {
	Summary   FleetStatusSummary `json:"summary"`
	CarStatus []FleetStatusItem  `json:"car_status"`
}

// GetFleetStatus returns fleet-wide status overview for GA dashboard
func (s *CarBookingService) GetFleetStatus() (*FleetStatusResponse, error) {
	response := &FleetStatusResponse{
		Summary:   FleetStatusSummary{},
		CarStatus: []FleetStatusItem{},
	}

	// Count cars by status
	var totalCars int64
	if err := s.db.Model(&models.Car{}).Count(&totalCars).Error; err != nil {
		return nil, fmt.Errorf("failed to count cars: %w", err)
	}
	response.Summary.TotalCars = int(totalCars)

	if response.Summary.TotalCars > 0 {
		var availableCount int64
		if err := s.db.Model(&models.Car{}).Where("status = ? AND is_active = ?", models.CarAvailable, true).Count(&availableCount).Error; err == nil {
			response.Summary.AvailableCars = int(availableCount)
		}
		var occupiedCount int64
		if err := s.db.Model(&models.Car{}).Where("status = ?", models.CarOccupied).Count(&occupiedCount).Error; err == nil {
			response.Summary.OccupiedCars = int(occupiedCount)
		}
		var maintenanceCount int64
		if err := s.db.Model(&models.Car{}).Where("status = ?", models.CarMaintenance).Count(&maintenanceCount).Error; err == nil {
			response.Summary.MaintenanceCars = int(maintenanceCount)
		}
	}

	// Per-car status list
	var cars []models.Car
	if err := s.db.Where("is_active = ?", true).Order("car_name ASC").Find(&cars).Error; err != nil {
		return nil, fmt.Errorf("failed to list cars for fleet status: %w", err)
	}

	for _, car := range cars {
		item := FleetStatusItem{
			CarID:   car.ID,
			CarName: car.CarName,
			PlateNum: func() string {
				if car.PlateNumber != nil {
					return *car.PlateNumber
				}
				return ""
			}(),
			Status: string(car.Status),
		}

		// Check if there's an active (non-terminal) booking for this car
		var activeBooking models.CarBooking
		err := s.db.
			Where("car_id = ?", car.ID).
			Where("status NOT IN ?", []models.CarBookingStatus{
				models.CarBookingReturned, models.CarBookingLateReturn, models.CarBookingCancelled,
			}).
			Order("departure_date DESC, start_time DESC").
			First(&activeBooking).Error

		if err == nil {
			item.BookingID = &activeBooking.ID
			item.BookingStatus = string(activeBooking.Status)
		}

		response.CarStatus = append(response.CarStatus, item)
	}

	return response, nil
}

// Notification helpers

func (s *CarBookingService) notifyGABookingPickedUp(booking *models.CarBooking) {
	gaUsers, _, _ := s.userRepo.List(1, 100)
	for _, user := range gaUsers {
		if user.Role == models.RoleGA {
			notification := &models.Notification{
				UserID:    user.ID,
				BookingID: &booking.ID,
				Title:     "Car Picked Up",
				Message:   fmt.Sprintf("Car %s has been picked up by %s", booking.GetPlateNumber(), booking.GetDriverName()),
				Type:      models.NotifCarBookingConfirmed,
				Channel:   models.ChannelInApp,
			}
			s.notificationSvc.CreateNotification(notification)
		}
	}
}

func (s *CarBookingService) notifyGALateReturn(booking *models.CarBooking) {
	gaUsers, _, _ := s.userRepo.List(1, 100)
	for _, user := range gaUsers {
		if user.Role == models.RoleGA {
			notification := &models.Notification{
				UserID:    user.ID,
				BookingID: &booking.ID,
				Title:     "Late Return Alert",
				Message:   fmt.Sprintf("Car %s returned late by %s", booking.GetPlateNumber(), booking.GetDriverName()),
				Type:      models.NotifCarBookingRejected,
				Channel:   models.ChannelBoth,
			}
			s.notificationSvc.CreateNotification(notification)
		}
	}
}

func (s *CarBookingService) notifyDriverStatusChange(booking *models.CarBooking, oldStatus, newStatus string) {
	if booking.DriverID == nil {
		return
	}
	driverID := *booking.DriverID
	notification := &models.Notification{
		UserID:    driverID,
		BookingID: &booking.ID,
		Title:     "Booking Status Updated",
		Message:   fmt.Sprintf("Your car booking status changed from %s to %s", oldStatus, newStatus),
		Type:      models.NotifCarBookingConfirmed,
		Channel:   models.ChannelInApp,
	}
	s.notificationSvc.CreateNotification(notification)
}

func (s *CarBookingService) notifyDriverAssigned(booking *models.CarBooking, driverName string) {
	if booking.DriverID == nil {
		return
	}
	driverID := *booking.DriverID
	notification := &models.Notification{
		UserID:    driverID,
		BookingID: &booking.ID,
		Title:     "Driver Assigned to Booking",
		Message:   fmt.Sprintf("You have been assigned as driver for booking %s", booking.GetPlateNumber()),
		Type:      models.NotifCarBookingConfirmed,
		Channel:   models.ChannelInApp,
	}
	s.notificationSvc.CreateNotification(notification)
}
