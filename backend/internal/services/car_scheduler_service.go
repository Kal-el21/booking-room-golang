package services

import (
	"log"
	"time"

	"github.com/Kal-el21/booking-room-golang/backend/internal/models"
	"github.com/Kal-el21/booking-room-golang/backend/internal/repositories"
	"gorm.io/gorm"
)

// CarSchedulerService handles automated car booking lifecycle checks
type CarSchedulerService struct {
	bookingRepo      *repositories.CarBookingRepository
	carRepo          *repositories.CarRepository
	notificationRepo *repositories.NotificationRepository
	notificationSvc  *NotificationService
	userRepo         *repositories.UserRepository
	db               *gorm.DB
}

func NewCarSchedulerService(
	bookingRepo *repositories.CarBookingRepository,
	carRepo *repositories.CarRepository,
	notificationRepo *repositories.NotificationRepository,
	notificationSvc *NotificationService,
	userRepo *repositories.UserRepository,
	db *gorm.DB,
) *CarSchedulerService {
	return &CarSchedulerService{
		bookingRepo:      bookingRepo,
		carRepo:          carRepo,
		notificationRepo: notificationRepo,
		notificationSvc:  notificationSvc,
		userRepo:         userRepo,
		db:               db,
	}
}

// RunOverdueCheck scans confirmed bookings that have passed their departure date and start time
// and transitions them to picked_up with zero odometer (driver did not pick up)
func (s *CarSchedulerService) RunOverdueCheck() {
	now := time.Now().Local()
	today := now.Truncate(24 * time.Hour)

	// Find confirmed bookings whose departure_date + start_time has already passed
	var bookings []models.CarBooking
	err := s.db.
		Where("status = ?", models.CarBookingConfirmed).
		Where("departure_date < ? OR (departure_date = ? AND TIME(start_time) <= TIME(?))",
			today, today, now.Format("15:04:05")).
		Preload("Car").
		Preload("Request").
		Preload("Request.User").
		Find(&bookings).Error

	if err != nil {
		log.Printf("[CarScheduler] Error fetching overdue bookings: %v", err)
		return
	}

	if len(bookings) == 0 {
		return
	}

	log.Printf("[CarScheduler] Found %d overdue confirmed bookings to process", len(bookings))

	for _, booking := range bookings {
		endDateTime := time.Date(
			booking.DepartureDate.Year(),
			booking.DepartureDate.Month(),
			booking.DepartureDate.Day(),
			booking.EndTime.Hour(),
			booking.EndTime.Minute(),
			0, 0,
			booking.DepartureDate.Location(),
		)

		if now.After(endDateTime) {
			// Entire booking window passed — mark as late_return
			booking.Status = models.CarBookingLateReturn
			zeroOdometer := 0
			booking.StartOdometer = &zeroOdometer
			booking.EndOdometer = &zeroOdometer
			fuelLevelReturn := 0
			booking.FuelLevelReturn = &fuelLevelReturn
			booking.PlateNumberSnapshot = booking.Car.PlateNumber
			carNameSnapshot := booking.Car.CarName
			booking.CarNameSnapshot = &carNameSnapshot
			note := "Auto-marked as late_return: booking window passed without pickup"
			booking.ReturnNotes = &note

			if err := s.bookingRepo.Update(&booking); err != nil {
				log.Printf("[CarScheduler] Failed to mark booking %d as late_return: %v", booking.ID, err)
				continue
			}

			s.notifyGAAutoLateReturn(&booking)
			log.Printf("[CarScheduler] Booking %d marked as late_return (window passed)", booking.ID)
		} else {
			// Start time passed but end time not yet — auto-pickup
			booking.Status = models.CarBookingPickedUp
			pickedUpAt := time.Now()
			booking.PickedUpAt = &pickedUpAt
			booking.PlateNumberSnapshot = booking.Car.PlateNumber
			carNameSnapshot := booking.Car.CarName
			booking.CarNameSnapshot = &carNameSnapshot

			if err := s.bookingRepo.Update(&booking); err != nil {
				log.Printf("[CarScheduler] Failed to auto-pickup booking %d: %v", booking.ID, err)
				continue
			}

			s.notifyGAAutoPickup(&booking)
			log.Printf("[CarScheduler] Booking %d auto-picked up (start time passed)", booking.ID)
		}
	}
}

// StartCarScheduler runs car scheduler loop every 5 minutes
func StartCarScheduler(svc *CarSchedulerService) {
	log.Println("⏰ Car scheduler started — checking overdue bookings every 5 minutes")

	ticker := time.NewTicker(5 * time.Minute)
	defer ticker.Stop()

	for range ticker.C {
		log.Println("[CarScheduler] Running overdue check...")
		svc.RunOverdueCheck()
	}
}

// Notifications
func (s *CarSchedulerService) notifyGAAutoPickup(booking *models.CarBooking) {
	gaUsers, _, _ := s.userRepo.List(1, 100)
	for _, user := range gaUsers {
		if user.Role == models.RoleGA {
			note := &models.Notification{
				UserID:    user.ID,
				BookingID: &booking.ID,
				Title:     "Booking Auto-Picked Up",
				Message:   "Car booking was auto-marked as picked up because the start time passed without manual pickup.",
				Type:      models.NotifCarBookingConfirmed,
				Channel:   models.ChannelInApp,
			}
			s.notificationSvc.CreateNotification(note)
		}
	}
}

func (s *CarSchedulerService) notifyGAAutoLateReturn(booking *models.CarBooking) {
	gaUsers, _, _ := s.userRepo.List(1, 100)
	for _, user := range gaUsers {
		if user.Role == models.RoleGA {
			note := &models.Notification{
				UserID:    user.ID,
				BookingID: &booking.ID,
				Title:     "Booking Auto-Marked as Late Return",
				Message:   "Car booking was auto-marked as late_return because the booking window passed without pickup.",
				Type:      models.NotifCarBookingRejected,
				Channel:   models.ChannelBoth,
			}
			s.notificationSvc.CreateNotification(note)
		}
	}
}
