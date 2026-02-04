package handlers

import (
	"strconv"

	"github.com/Kal-el21/booking-room-golang/backend/internal/middleware"
	"github.com/Kal-el21/booking-room-golang/backend/internal/services"
	"github.com/Kal-el21/booking-room-golang/backend/internal/utils"

	"github.com/gin-gonic/gin"
)

type BookingHandler struct {
	bookingService *services.BookingService
}

func NewBookingHandler(bookingService *services.BookingService) *BookingHandler {
	return &BookingHandler{
		bookingService: bookingService,
	}
}

// GetBooking gets booking by ID
// @route GET /api/v1/bookings/:id
func (h *BookingHandler) GetBooking(c *gin.Context) {
	id, err := utils.ParseIDParam(c, "id")
	if err != nil {
		utils.ErrorResponse(c, 400, "Invalid booking ID", err.Error())
		return
	}

	user, _ := middleware.GetCurrentUser(c)
	booking, err := h.bookingService.GetBooking(uint(id), user.ID, user.Role)
	if err != nil {
		utils.ErrorResponse(c, 404, "Booking not found", err.Error())
		return
	}

	utils.SuccessResponse(c, 200, "Booking retrieved successfully", booking.ToResponse())
}

// ListBookings lists all bookings
// @route GET /api/v1/bookings
func (h *BookingHandler) ListBookings(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "10"))

	filters := make(map[string]interface{})
	if roomID := c.Query("room_id"); roomID != "" {
		id, _ := strconv.ParseUint(roomID, 10, 32)
		filters["room_id"] = uint(id)
	}
	if status := c.Query("status"); status != "" {
		filters["status"] = status
	}
	if date := c.Query("booking_date"); date != "" {
		filters["booking_date"] = date
	}

	user, _ := middleware.GetCurrentUser(c)
	bookings, total, err := h.bookingService.ListBookings(page, pageSize, user.ID, user.Role, filters)
	if err != nil {
		utils.ErrorResponse(c, 500, "Failed to retrieve bookings", err.Error())
		return
	}

	var responses []interface{}
	for _, booking := range bookings {
		responses = append(responses, booking.ToResponse())
	}

	totalPages := int(total) / pageSize
	if int(total)%pageSize > 0 {
		totalPages++
	}

	meta := utils.PaginationMeta{
		CurrentPage: page,
		PerPage:     pageSize,
		Total:       total,
		TotalPages:  totalPages,
	}

	utils.SuccessResponseWithMeta(c, 200, "Bookings retrieved successfully", responses, meta)
}

// CancelBooking cancels a booking
// @route DELETE /api/v1/bookings/:id
func (h *BookingHandler) CancelBooking(c *gin.Context) {
	id, err := utils.ParseIDParam(c, "id")
	if err != nil {
		utils.ErrorResponse(c, 400, "Invalid booking ID", err.Error())
		return
	}

	user, _ := middleware.GetCurrentUser(c)
	if err := h.bookingService.CancelBooking(uint(id), user.ID, user.Role); err != nil {
		utils.ErrorResponse(c, 400, "Failed to cancel booking", err.Error())
		return
	}

	utils.SuccessResponse(c, 200, "Booking cancelled successfully", nil)
}

// GetCalendar gets calendar view of bookings
// @route GET /api/v1/calendar
func (h *BookingHandler) GetCalendar(c *gin.Context) {
	startDate := c.Query("start_date")
	endDate := c.Query("end_date")
	roomIDStr := c.Query("room_id")

	// Validate required parameters
	if startDate == "" || endDate == "" {
		utils.ErrorResponse(c, 400, "start_date and end_date are required", nil)
		return
	}

	var roomID *uint
	if roomIDStr != "" {
		id, err := strconv.ParseUint(roomIDStr, 10, 32)
		if err != nil {
			utils.ErrorResponse(c, 400, "Invalid room_id", err.Error())
			return
		}
		roomIDUint := uint(id)
		roomID = &roomIDUint
	}

	bookings, requests, err := h.bookingService.GetCalendar(startDate, endDate, roomID)
	if err != nil {
		utils.ErrorResponse(c, 400, "Failed to get calendar", err.Error())
		return
	}

	var responses []interface{}

	// Add bookings
	for _, booking := range bookings {
		// Convert EndDate and RecurringEndDate to strings or nil
		var endDateStr *string
		if booking.Request.EndDate != nil {
			s := booking.Request.EndDate.Format("2006-01-02")
			endDateStr = &s
		}

		var recurringEndDateStr *string
		if booking.Request.RecurringEndDate != nil {
			s := booking.Request.RecurringEndDate.Format("2006-01-02")
			recurringEndDateStr = &s
		}

		responses = append(responses, map[string]interface{}{
			"id":                 booking.ID,
			"type":               "booking",
			"title":              booking.Request.Purpose,
			"start":              booking.BookingDate.Format("2006-01-02") + "T" + booking.StartTime.Format("15:04:05"),
			"end":                booking.BookingDate.Format("2006-01-02") + "T" + booking.EndTime.Format("15:04:05"),
			"room_id":            booking.RoomID,
			"room_name":          booking.Room.RoomName,
			"status":             string(booking.Status),
			"user_name":          booking.Request.User.Name,
			"purpose":            booking.Request.Purpose,
			"end_date":           endDateStr,
			"is_recurring":       booking.Request.IsRecurring,
			"recurring_type":     booking.Request.RecurringType,
			"recurring_days":     booking.Request.RecurringDays,
			"recurring_end_date": recurringEndDateStr,
		})
	}

	// Add pending requests
	for _, request := range requests {
		// Convert EndDate and RecurringEndDate to strings or nil
		var endDateStr *string
		if request.EndDate != nil {
			s := request.EndDate.Format("2006-01-02")
			endDateStr = &s
		}

		var recurringEndDateStr *string
		if request.RecurringEndDate != nil {
			s := request.RecurringEndDate.Format("2006-01-02")
			recurringEndDateStr = &s
		}

		responses = append(responses, map[string]interface{}{
			"id":                 request.ID,
			"type":               "request",
			"title":              request.Purpose,
			"start":              request.BookingDate.Format("2006-01-02") + "T" + request.StartTime.Format("15:04:05"),
			"end":                request.BookingDate.Format("2006-01-02") + "T" + request.EndTime.Format("15:04:05"),
			"room_id":            0,
			"room_name":          "",
			"status":             string(request.Status),
			"user_name":          request.User.Name,
			"purpose":            request.Purpose,
			"end_date":           endDateStr,
			"is_recurring":       request.IsRecurring,
			"recurring_type":     request.RecurringType,
			"recurring_days":     request.RecurringDays,
			"recurring_end_date": recurringEndDateStr,
		})
	}

	utils.SuccessResponse(c, 200, "Calendar retrieved successfully", responses)
}
