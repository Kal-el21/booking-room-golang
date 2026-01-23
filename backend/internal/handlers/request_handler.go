package handlers

import (
	"strconv"

	"github.com/Kal-el21/booking-room-golang/backend/internal/middleware"
	"github.com/Kal-el21/booking-room-golang/backend/internal/services"
	"github.com/Kal-el21/booking-room-golang/backend/internal/utils"

	"github.com/gin-gonic/gin"
)

type RequestHandler struct {
	requestService *services.RequestService
}

func NewRequestHandler(requestService *services.RequestService) *RequestHandler {
	return &RequestHandler{
		requestService: requestService,
	}
}

// CreateRequest creates a new room request
// @route POST /api/v1/room-requests
func (h *RequestHandler) CreateRequest(c *gin.Context) {
	var input services.CreateRequestInput

	if err := c.ShouldBindJSON(&input); err != nil {
		utils.ValidationErrorResponse(c, err.Error())
		return
	}

	user, _ := middleware.GetCurrentUser(c)
	request, err := h.requestService.CreateRequest(input, user.ID)
	if err != nil {
		utils.ErrorResponse(c, 400, "Failed to create request", err.Error())
		return
	}

	utils.SuccessResponse(c, 201, "Request created successfully", request.ToResponse())
}

// GetRequest gets request by ID
// @route GET /api/v1/room-requests/:id
func (h *RequestHandler) GetRequest(c *gin.Context) {
	id, err := utils.ParseIDParam(c, "id")
	if err != nil {
		utils.ErrorResponse(c, 400, "Invalid request ID", err.Error())
		return
	}

	user, _ := middleware.GetCurrentUser(c)
	request, err := h.requestService.GetRequest(uint(id), user.ID, user.Role)
	if err != nil {
		utils.ErrorResponse(c, 404, "Request not found", err.Error())
		return
	}

	utils.SuccessResponse(c, 200, "Request retrieved successfully", request.ToResponse())
}

// ListRequests lists all requests
// @route GET /api/v1/room-requests
func (h *RequestHandler) ListRequests(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "10"))

	filters := make(map[string]interface{})
	if status := c.Query("status"); status != "" {
		filters["status"] = status
	}

	user, _ := middleware.GetCurrentUser(c)
	requests, total, err := h.requestService.ListRequests(page, pageSize, user.ID, user.Role, filters)
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

// UpdateRequest updates request
// @route PUT /api/v1/room-requests/:id
func (h *RequestHandler) UpdateRequest(c *gin.Context) {
	id, err := utils.ParseIDParam(c, "id")
	if err != nil {
		utils.ErrorResponse(c, 400, "Invalid request ID", err.Error())
		return
	}

	var input services.CreateRequestInput
	if err := c.ShouldBindJSON(&input); err != nil {
		utils.ValidationErrorResponse(c, err.Error())
		return
	}

	user, _ := middleware.GetCurrentUser(c)
	request, err := h.requestService.UpdateRequest(uint(id), input, user.ID)
	if err != nil {
		utils.ErrorResponse(c, 400, "Failed to update request", err.Error())
		return
	}

	utils.SuccessResponse(c, 200, "Request updated successfully", request.ToResponse())
}

// DeleteRequest deletes request
// @route DELETE /api/v1/room-requests/:id
func (h *RequestHandler) DeleteRequest(c *gin.Context) {
	id, err := utils.ParseIDParam(c, "id")
	if err != nil {
		utils.ErrorResponse(c, 400, "Invalid request ID", err.Error())
		return
	}

	user, _ := middleware.GetCurrentUser(c)
	if err := h.requestService.DeleteRequest(uint(id), user.ID); err != nil {
		utils.ErrorResponse(c, 400, "Failed to delete request", err.Error())
		return
	}

	utils.SuccessResponse(c, 200, "Request deleted successfully", nil)
}

// ApproveRequest approves request and creates booking (GA only)
// @route POST /api/v1/room-requests/:id/approve
func (h *RequestHandler) ApproveRequest(c *gin.Context) {
	id, err := utils.ParseIDParam(c, "id")
	if err != nil {
		utils.ErrorResponse(c, 400, "Invalid request ID", err.Error())
		return
	}

	var input services.ApproveRequestInput
	if err := c.ShouldBindJSON(&input); err != nil {
		utils.ValidationErrorResponse(c, err.Error())
		return
	}

	user, _ := middleware.GetCurrentUser(c)
	booking, err := h.requestService.ApproveRequest(uint(id), input, user.ID)
	if err != nil {
		utils.ErrorResponse(c, 400, "Failed to approve request", err.Error())
		return
	}

	utils.SuccessResponse(c, 200, "Request approved successfully", booking.ToResponse())
}

// RejectRequest rejects request (GA only)
// @route POST /api/v1/room-requests/:id/reject
func (h *RequestHandler) RejectRequest(c *gin.Context) {
	id, err := utils.ParseIDParam(c, "id")
	if err != nil {
		utils.ErrorResponse(c, 400, "Invalid request ID", err.Error())
		return
	}

	var input services.RejectRequestInput
	if err := c.ShouldBindJSON(&input); err != nil {
		utils.ValidationErrorResponse(c, err.Error())
		return
	}

	user, _ := middleware.GetCurrentUser(c)
	request, err := h.requestService.RejectRequest(uint(id), input, user.ID)
	if err != nil {
		utils.ErrorResponse(c, 400, "Failed to reject request", err.Error())
		return
	}

	utils.SuccessResponse(c, 200, "Request rejected successfully", request.ToResponse())
}

// GetAvailableRooms gets available rooms for a request (GA only)
// @route GET /api/v1/room-requests/:id/available-rooms
func (h *RequestHandler) GetAvailableRooms(c *gin.Context) {
	id, err := utils.ParseIDParam(c, "id")
	if err != nil {
		utils.ErrorResponse(c, 400, "Invalid request ID", err.Error())
		return
	}

	rooms, err := h.requestService.GetAvailableRoomsForRequest(uint(id))
	if err != nil {
		utils.ErrorResponse(c, 400, "Failed to get available rooms", err.Error())
		return
	}

	// Convert to responses
	var responses []interface{}
	for _, room := range rooms {
		responses = append(responses, room.ToResponse())
	}

	utils.SuccessResponse(c, 200, "Available rooms retrieved successfully", responses)
}
