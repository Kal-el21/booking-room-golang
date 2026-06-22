package handlers

import (
	"strconv"

	"github.com/Kal-el21/booking-room-golang/backend/internal/middleware"
	"github.com/Kal-el21/booking-room-golang/backend/internal/models"
	"github.com/Kal-el21/booking-room-golang/backend/internal/services"
	"github.com/Kal-el21/booking-room-golang/backend/internal/utils"

	"github.com/gin-gonic/gin"
)

type CarBookingHandler struct {
	bookingService *services.CarBookingService
}

func NewCarBookingHandler(bookingService *services.CarBookingService) *CarBookingHandler {
	return &CarBookingHandler{
		bookingService: bookingService,
	}
}

// PickUpBooking records the pickup of a car booking
// @route POST /api/v1/car-bookings/:id/pickup
func (h *CarBookingHandler) PickUpBooking(c *gin.Context) {
	id, err := utils.ParseIDParam(c, "id")
	if err != nil {
		utils.ErrorResponse(c, 400, "Invalid booking ID", err.Error())
		return
	}

	var input struct {
		DriverID       *uint   `json:"driver_id"`
		PickupLocation *string `json:"pickup_location"`
		StartOdometer  int     `json:"start_odometer" binding:"required"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		utils.ValidationErrorResponse(c, err.Error())
		return
	}

	user, _ := middleware.GetCurrentUser(c)
	booking, err := h.bookingService.PickUpBooking(uint(id), input.DriverID, input.PickupLocation, input.StartOdometer, user.ID)
	if err != nil {
		utils.ErrorResponse(c, 400, "Failed to record pickup", err.Error())
		return
	}

	utils.SuccessResponse(c, 200, "Pickup recorded successfully", booking.ToResponse())
}

// ReturnBooking records the return of a car booking
// @route POST /api/v1/car-bookings/:id/return
func (h *CarBookingHandler) ReturnBooking(c *gin.Context) {
	id, err := utils.ParseIDParam(c, "id")
	if err != nil {
		utils.ErrorResponse(c, 400, "Invalid booking ID", err.Error())
		return
	}

	var input struct {
		EndOdometer     int     `json:"end_odometer" binding:"required"`
		FuelLevelReturn int     `json:"fuel_level_return" binding:"required,min=0,max=100"`
		ReturnNotes     *string `json:"return_notes"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		utils.ValidationErrorResponse(c, err.Error())
		return
	}

	user, _ := middleware.GetCurrentUser(c)
	booking, err := h.bookingService.ReturnBooking(
		uint(id),
		input.EndOdometer,
		input.FuelLevelReturn,
		input.ReturnNotes,
		user.ID,
	)
	if err != nil {
		utils.ErrorResponse(c, 400, "Failed to record return", err.Error())
		return
	}

	utils.SuccessResponse(c, 200, "Return recorded successfully", booking.ToResponse())
}

// GetDriverBookings gets bookings assigned to the logged-in driver
// @route GET /api/v1/driver/bookings
func (h *CarBookingHandler) GetDriverBookings(c *gin.Context) {
	user, _ := middleware.GetCurrentUser(c)

	if !user.IsDriver() {
		utils.ErrorResponse(c, 403, "Only drivers can access this endpoint", nil)
		return
	}

	filters := make(map[string]interface{})
	if status := c.Query("status"); status != "" {
		filters["status"] = status
	}
	if carID := c.Query("car_id"); carID != "" {
		filters["car_id"] = carID
	}
	if bookingDate := c.Query("booking_date"); bookingDate != "" {
		filters["booking_date"] = bookingDate
	}

	bookings, err := h.bookingService.GetDriverBookings(user.ID, filters)
	if err != nil {
		utils.ErrorResponse(c, 500, "Failed to retrieve driver bookings", err.Error())
		return
	}

	responses := services.ToCarBookingResponseList(bookings)
	utils.SuccessResponse(c, 200, "Driver bookings retrieved successfully", responses)
}

// GetCarBooking gets car booking by ID
// @route GET /api/v1/car-bookings/:id
func (h *CarBookingHandler) GetCarBooking(c *gin.Context) {
	id, err := utils.ParseIDParam(c, "id")
	if err != nil {
		utils.ErrorResponse(c, 400, "Invalid booking ID", err.Error())
		return
	}

	user, _ := middleware.GetCurrentUser(c)
	booking, err := h.bookingService.GetCarBooking(uint(id))
	if err != nil {
		utils.ErrorResponse(c, 404, "Booking not found", err.Error())
		return
	}

	if !canViewCarBooking(user, booking) {
		utils.ErrorResponse(c, 403, "You don't have permission to view this booking", nil)
		return
	}

	utils.SuccessResponse(c, 200, "Booking retrieved successfully", booking.ToResponse())
}

func canViewCarBooking(user *models.User, booking *models.CarBooking) bool {
	if user.IsGA() {
		return true
	}
	if booking.BookedBy == user.ID || booking.Request.UserID == user.ID {
		return true
	}
	if booking.DriverID != nil && *booking.DriverID == user.ID {
		return true
	}
	return false
}

// ListMyCarBookings lists car bookings owned by the logged-in user
// @route GET /api/v1/my-car-bookings
func (h *CarBookingHandler) ListMyCarBookings(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "10"))
	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 100 {
		pageSize = 10
	}

	filters := make(map[string]interface{})
	if status := c.Query("status"); status != "" {
		filters["status"] = status
	}
	if carID := c.Query("car_id"); carID != "" {
		filters["car_id"] = carID
	}
	if bookingDate := c.Query("booking_date"); bookingDate != "" {
		filters["booking_date"] = bookingDate
	}

	user, _ := middleware.GetCurrentUser(c)
	bookings, total, err := h.bookingService.ListUserBookings(page, pageSize, user.ID, filters)
	if err != nil {
		utils.ErrorResponse(c, 500, "Failed to retrieve your car bookings", err.Error())
		return
	}

	responses := services.ToCarBookingResponseList(bookings)

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

	utils.SuccessResponseWithMeta(c, 200, "Your car bookings retrieved successfully", responses, meta)
}

// UpdateBookingStatus allows GA to manually override booking status
// @route PUT /api/v1/car-bookings/:id/status
func (h *CarBookingHandler) UpdateBookingStatus(c *gin.Context) {
	id, err := utils.ParseIDParam(c, "id")
	if err != nil {
		utils.ErrorResponse(c, 400, "Invalid booking ID", err.Error())
		return
	}

	var input struct {
		Status string `json:"status" binding:"required"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		utils.ValidationErrorResponse(c, err.Error())
		return
	}

	newStatus := models.CarBookingStatus(input.Status)

	// Only GA can override status
	user, _ := middleware.GetCurrentUser(c)
	if !user.IsGA() {
		utils.ErrorResponse(c, 403, "Only GA can override booking status", nil)
		return
	}

	booking, err := h.bookingService.UpdateBookingStatus(uint(id), newStatus, user.ID)
	if err != nil {
		utils.ErrorResponse(c, 400, "Failed to update status", err.Error())
		return
	}

	utils.SuccessResponse(c, 200, "Booking status updated successfully", booking.ToResponse())
}

// ListAllCarBookings lists all car bookings (GA only)
// @route GET /api/v1/car-bookings
func (h *CarBookingHandler) ListAllCarBookings(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "10"))

	filters := make(map[string]interface{})
	if status := c.Query("status"); status != "" {
		filters["status"] = status
	}
	if carID := c.Query("car_id"); carID != "" {
		filters["car_id"] = carID
	}
	if bookingDate := c.Query("booking_date"); bookingDate != "" {
		filters["booking_date"] = bookingDate
	}

	bookings, total, err := h.bookingService.ListBookings(page, pageSize, filters)
	if err != nil {
		utils.ErrorResponse(c, 500, "Failed to retrieve car bookings", err.Error())
		return
	}

	responses := services.ToCarBookingResponseList(bookings)

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

	utils.SuccessResponseWithMeta(c, 200, "Car bookings retrieved successfully", responses, meta)
}

// GetFleetStatus returns fleet-wide status overview for GA dashboard
// @route GET /api/v1/admin/car-fleet-status
func (h *CarBookingHandler) GetFleetStatus(c *gin.Context) {
	user, _ := middleware.GetCurrentUser(c)
	if !user.IsGA() {
		utils.ErrorResponse(c, 403, "Only GA can access this endpoint", nil)
		return
	}

	status, err := h.bookingService.GetFleetStatus()
	if err != nil {
		utils.ErrorResponse(c, 500, "Failed to retrieve fleet status", err.Error())
		return
	}

	utils.SuccessResponse(c, 200, "Fleet status retrieved successfully", status)
}

// AssignDriver assigns a driver to a car booking
// @route PUT /api/v1/car-bookings/:id/driver
func (h *CarBookingHandler) AssignDriver(c *gin.Context) {
	id, err := utils.ParseIDParam(c, "id")
	if err != nil {
		utils.ErrorResponse(c, 400, "Invalid booking ID", err.Error())
		return
	}

	var input struct {
		DriverID uint `json:"driver_id" binding:"required"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		utils.ValidationErrorResponse(c, err.Error())
		return
	}

	user, _ := middleware.GetCurrentUser(c)
	booking, err := h.bookingService.AssignDriver(uint(id), input.DriverID, user.ID)
	if err != nil {
		utils.ErrorResponse(c, 400, "Failed to assign driver", err.Error())
		return
	}

	utils.SuccessResponse(c, 200, "Driver assigned successfully", booking.ToResponse())
}

// UnassignDriver removes the driver from a car booking
// @route DELETE /api/v1/car-bookings/:id/driver
func (h *CarBookingHandler) UnassignDriver(c *gin.Context) {
	id, err := utils.ParseIDParam(c, "id")
	if err != nil {
		utils.ErrorResponse(c, 400, "Invalid booking ID", err.Error())
		return
	}

	user, _ := middleware.GetCurrentUser(c)
	booking, err := h.bookingService.UnassignDriver(uint(id), user.ID)
	if err != nil {
		utils.ErrorResponse(c, 400, "Failed to unassign driver", err.Error())
		return
	}

	utils.SuccessResponse(c, 200, "Driver unassigned successfully", booking.ToResponse())
}

// CancelBooking cancels a car booking (GA only)
// @route DELETE /api/v1/car-bookings/:id
func (h *CarBookingHandler) CancelBooking(c *gin.Context) {
	id, err := utils.ParseIDParam(c, "id")
	if err != nil {
		utils.ErrorResponse(c, 400, "Invalid booking ID", err.Error())
		return
	}

	user, _ := middleware.GetCurrentUser(c)
	if !user.IsGA() {
		utils.ErrorResponse(c, 403, "Only GA can cancel car bookings", nil)
		return
	}

	booking, err := h.bookingService.CancelBooking(uint(id), user.ID)
	if err != nil {
		utils.ErrorResponse(c, 400, "Failed to cancel booking", err.Error())
		return
	}

	utils.SuccessResponse(c, 200, "Booking cancelled successfully", booking.ToResponse())
}
