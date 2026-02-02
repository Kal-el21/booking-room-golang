package services

import (
	"errors"
	"time"

	"github.com/Kal-el21/booking-room-golang/backend/internal/models"
	"github.com/Kal-el21/booking-room-golang/backend/internal/repositories"
)

type BookingService struct {
	bookingRepo      *repositories.BookingRepository
	requestRepo      *repositories.RequestRepository
	notificationRepo *repositories.NotificationRepository
	notificationSvc  *NotificationService
}

func NewBookingService(
	bookingRepo *repositories.BookingRepository,
	requestRepo *repositories.RequestRepository,
	notificationRepo *repositories.NotificationRepository,
) *BookingService {
	return &BookingService{
		bookingRepo:      bookingRepo,
		requestRepo:      requestRepo,
		notificationRepo: notificationRepo,
		notificationSvc:  NewNotificationService(notificationRepo),
	}
}

// GetBooking gets booking by ID
func (s *BookingService) GetBooking(id uint, userID uint, userRole models.UserRole) (*models.RoomBooking, error) {
	booking, err := s.bookingRepo.FindByID(id)
	if err != nil {
		return nil, err
	}

	// Check permission: user can only view their own bookings, GA can view all
	if userRole != models.RoleGA && booking.Request.UserID != userID {
		return nil, errors.New("you don't have permission to view this booking")
	}

	return booking, nil
}

// ListBookings lists bookings with pagination and filters
func (s *BookingService) ListBookings(page, pageSize int, userID uint, userRole models.UserRole, filters map[string]interface{}) ([]models.RoomBooking, int64, error) {
	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 100 {
		pageSize = 10
	}

	// Regular users can only see their own bookings
	if userRole == models.RoleUser {
		bookings, err := s.bookingRepo.GetUserBookings(userID)
		if err != nil {
			return nil, 0, err
		}
		return bookings, int64(len(bookings)), nil
	}

	return s.bookingRepo.List(page, pageSize, filters)
}

// GetUserBookings gets all bookings for current user
func (s *BookingService) GetUserBookings(userID uint) ([]models.RoomBooking, error) {
	return s.bookingRepo.GetUserBookings(userID)
}

// CancelBooking cancels a booking
func (s *BookingService) CancelBooking(id uint, userID uint, userRole models.UserRole) error {
	booking, err := s.bookingRepo.FindByID(id)
	if err != nil {
		return err
	}

	// Check permission
	if userRole != models.RoleGA && booking.Request.UserID != userID {
		return errors.New("you don't have permission to cancel this booking")
	}

	// Check if booking can be cancelled
	if !booking.CanBeCancelled() {
		return errors.New("booking cannot be cancelled")
	}

	// Update booking status
	booking.Status = models.BookingCancelled
	if err := s.bookingRepo.Update(booking); err != nil {
		return err
	}

	// Update request status
	request, err := s.requestRepo.FindByID(booking.RequestID)
	if err != nil {
		return err
	}
	request.Status = models.RequestCancelled
	if err := s.requestRepo.Update(request); err != nil {
		return err
	}

	// Send notification
	go s.notifyBookingCancelled(booking)

	return nil
}

// GetCalendar gets calendar view of bookings
func (s *BookingService) GetCalendar(startDate, endDate string, roomID *uint) ([]models.RoomBooking, error) {
	start, err := time.Parse("2006-01-02", startDate)
	if err != nil {
		return nil, errors.New("invalid start date format (use YYYY-MM-DD)")
	}

	end, err := time.Parse("2006-01-02", endDate)
	if err != nil {
		return nil, errors.New("invalid end date format (use YYYY-MM-DD)")
	}

	// Validate date range
	if end.Before(start) {
		return nil, errors.New("end date must be after start date")
	}

	// Get bookings from repository with date range
	return s.bookingRepo.GetCalendarBookings(start, end, roomID)
}

// notifyBookingCancelled sends cancellation notification (broadcasts to SSE)
func (s *BookingService) notifyBookingCancelled(booking *models.RoomBooking) {
	notification := &models.Notification{
		UserID:    booking.Request.UserID,
		BookingID: &booking.ID,
		Title:     "Booking Cancelled",
		Message:   "Your booking has been cancelled",
		Type:      models.NotifBookingCancelled,
		Channel:   models.ChannelBoth,
	}
	s.notificationSvc.CreateNotification(notification) // Broadcasts to SSE
}
