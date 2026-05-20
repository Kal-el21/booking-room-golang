package handlers

import (
	"strconv"

	"github.com/Kal-el21/booking-room-golang/backend/internal/middleware"
	"github.com/Kal-el21/booking-room-golang/backend/internal/services"
	"github.com/Kal-el21/booking-room-golang/backend/internal/utils"

	"github.com/gin-gonic/gin"
)

type CarRequestHandler struct {
	carRequestService *services.CarRequestService
}

func NewCarRequestHandler(carRequestService *services.CarRequestService) *CarRequestHandler {
	return &CarRequestHandler{
		carRequestService: carRequestService,
	}
}

// CreateCarRequest creates a new car request
// @route POST /api/v1/car-requests
func (h *CarRequestHandler) CreateCarRequest(c *gin.Context) {
	var input services.CreateCarRequestInput

	if err := c.ShouldBindJSON(&input); err != nil {
		utils.ValidationErrorResponse(c, err.Error())
		return
	}

	user, _ := middleware.GetCurrentUser(c)
	request, err := h.carRequestService.CreateCarRequest(input, user.ID)
	if err != nil {
		utils.ErrorResponse(c, 400, "Failed to create request", err.Error())
		return
	}

	utils.SuccessResponse(c, 201, "Request created successfully", request.ToResponse())
}

// GetCarRequest gets request by ID
// @route GET /api/v1/car-requests/:id
func (h *CarRequestHandler) GetCarRequest(c *gin.Context) {
	id, err := utils.ParseIDParam(c, "id")
	if err != nil {
		utils.ErrorResponse(c, 400, "Invalid request ID", err.Error())
		return
	}

	user, _ := middleware.GetCurrentUser(c)
	request, err := h.carRequestService.GetCarRequest(uint(id), user.ID, user.Role)
	if err != nil {
		utils.ErrorResponse(c, 404, "Request not found", err.Error())
		return
	}

	utils.SuccessResponse(c, 200, "Request retrieved successfully", request.ToResponse())
}

// ListCarRequests lists all car requests
// @route GET /api/v1/car-requests
func (h *CarRequestHandler) ListCarRequests(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "10"))

	filters := make(map[string]interface{})
	if status := c.Query("status"); status != "" {
		filters["status"] = status
	}

	user, _ := middleware.GetCurrentUser(c)
	requests, total, err := h.carRequestService.ListCarRequests(page, pageSize, user.ID, user.Role, filters)
	if err != nil {
		utils.ErrorResponse(c, 500, "Failed to retrieve requests", err.Error())
		return
	}

	// Convert to responses
	var responses []interface{}
	for _, req := range requests {
		responses = append(responses, req.ToResponse())
	}

	// Pagination meta
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

	utils.SuccessResponseWithMeta(c, 200, "Requests retrieved successfully", responses, meta)
}

// UpdateCarRequest updates request
// @route PUT /api/v1/car-requests/:id
func (h *CarRequestHandler) UpdateCarRequest(c *gin.Context) {
	id, err := utils.ParseIDParam(c, "id")
	if err != nil {
		utils.ErrorResponse(c, 400, "Invalid request ID", err.Error())
		return
	}

	var input services.CreateCarRequestInput
	if err := c.ShouldBindJSON(&input); err != nil {
		utils.ValidationErrorResponse(c, err.Error())
		return
	}

	user, _ := middleware.GetCurrentUser(c)
	request, err := h.carRequestService.UpdateCarRequest(uint(id), input, user.ID)
	if err != nil {
		utils.ErrorResponse(c, 400, "Failed to update request", err.Error())
		return
	}

	utils.SuccessResponse(c, 200, "Request updated successfully", request.ToResponse())
}

// DeleteCarRequest deletes request
// @route DELETE /api/v1/car-requests/:id
func (h *CarRequestHandler) DeleteCarRequest(c *gin.Context) {
	id, err := utils.ParseIDParam(c, "id")
	if err != nil {
		utils.ErrorResponse(c, 400, "Invalid request ID", err.Error())
		return
	}

	user, _ := middleware.GetCurrentUser(c)
	if err := h.carRequestService.DeleteCarRequest(uint(id), user.ID); err != nil {
		utils.ErrorResponse(c, 400, "Failed to delete request", err.Error())
		return
	}

	utils.SuccessResponse(c, 200, "Request deleted successfully", nil)
}

// ApproveCarRequest approves request and creates booking (GA only)
// @route POST /api/v1/car-requests/:id/approve
func (h *CarRequestHandler) ApproveCarRequest(c *gin.Context) {
	id, err := utils.ParseIDParam(c, "id")
	if err != nil {
		utils.ErrorResponse(c, 400, "Invalid request ID", err.Error())
		return
	}

	var input services.ApproveCarRequestInput
	if err := c.ShouldBindJSON(&input); err != nil {
		utils.ValidationErrorResponse(c, err.Error())
		return
	}

	user, _ := middleware.GetCurrentUser(c)
	booking, err := h.carRequestService.ApproveCarRequest(uint(id), input, user.ID)
	if err != nil {
		utils.ErrorResponse(c, 400, "Failed to approve request", err.Error())
		return
	}

	utils.SuccessResponse(c, 200, "Request approved successfully", booking.ToResponse())
}

// RejectCarRequest rejects request (GA only)
// @route POST /api/v1/car-requests/:id/reject
func (h *CarRequestHandler) RejectCarRequest(c *gin.Context) {
	id, err := utils.ParseIDParam(c, "id")
	if err != nil {
		utils.ErrorResponse(c, 400, "Invalid request ID", err.Error())
		return
	}

	var input services.RejectCarRequestInput
	if err := c.ShouldBindJSON(&input); err != nil {
		utils.ValidationErrorResponse(c, err.Error())
		return
	}

	user, _ := middleware.GetCurrentUser(c)
	request, err := h.carRequestService.RejectCarRequest(uint(id), input, user.ID)
	if err != nil {
		utils.ErrorResponse(c, 400, "Failed to reject request", err.Error())
		return
	}

	utils.SuccessResponse(c, 200, "Request rejected successfully", request.ToResponse())
}

// GetAvailableCars gets available cars for a request (GA only)
// @route GET /api/v1/car-requests/:id/available-cars
func (h *CarRequestHandler) GetAvailableCars(c *gin.Context) {
	id, err := utils.ParseIDParam(c, "id")
	if err != nil {
		utils.ErrorResponse(c, 400, "Invalid request ID", err.Error())
		return
	}

	cars, err := h.carRequestService.GetAvailableCarsForRequest(uint(id))
	if err != nil {
		utils.ErrorResponse(c, 400, "Failed to get available cars", err.Error())
		return
	}

	// Convert to responses
	var responses []interface{}
	for _, car := range cars {
		responses = append(responses, car.ToResponse())
	}

	utils.SuccessResponse(c, 200, "Available cars retrieved successfully", responses)
}

// GetCalendarCarRequests gets calendar view of car bookings and requests
// @route GET /api/v1/car-calendar
func (h *CarRequestHandler) GetCalendarCarRequests(c *gin.Context) {
	startDate := c.Query("start_date")
	endDate := c.Query("end_date")
	carIDStr := c.Query("car_id")

	// Validate required parameters
	if startDate == "" || endDate == "" {
		utils.ErrorResponse(c, 400, "start_date and end_date are required", nil)
		return
	}

	var carID *uint
	if carIDStr != "" {
		id, err := strconv.ParseUint(carIDStr, 10, 32)
		if err != nil {
			utils.ErrorResponse(c, 400, "Invalid car_id", err.Error())
			return
		}
		carIDUint := uint(id)
		carID = &carIDUint
	}

	bookings, requests, err := h.carRequestService.GetCalendarCarRequests(startDate, endDate, carID)
	if err != nil {
		utils.ErrorResponse(c, 400, "Failed to get car calendar", err.Error())
		return
	}

	responses := make([]interface{}, 0)

	// Add confirmed bookings
	for _, booking := range bookings {
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
			"type":               "car_booking",
			"title":              booking.Car.CarName,
			"start":              booking.DepartureDate.Format("2006-01-02") + "T" + booking.StartTime.Format("15:04:05"),
			"end":                booking.DepartureDate.Format("2006-01-02") + "T" + booking.EndTime.Format("15:04:05"),
			"car_id":             booking.CarID,
			"car_name":           booking.Car.CarName,
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
			"type":               "car_request",
			"title":              request.Purpose,
			"start":              request.BookingDate.Format("2006-01-02") + "T" + request.StartTime.Format("15:04:05"),
			"end":                request.BookingDate.Format("2006-01-02") + "T" + request.EndTime.Format("15:04:05"),
			"car_id":             0,
			"car_name":           "",
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

	utils.SuccessResponse(c, 200, "Car calendar retrieved successfully", responses)
}
