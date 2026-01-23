package handlers

import (
	"strconv"

	"github.com/Kal-el21/booking-room-golang/backend/internal/middleware"
	"github.com/Kal-el21/booking-room-golang/backend/internal/services"
	"github.com/Kal-el21/booking-room-golang/backend/internal/utils"

	"github.com/gin-gonic/gin"
)

type RoomHandler struct {
	roomService *services.RoomService
}

func NewRoomHandler(roomService *services.RoomService) *RoomHandler {
	return &RoomHandler{
		roomService: roomService,
	}
}

// CreateRoom creates a new room
// @route POST /api/v1/rooms
func (h *RoomHandler) CreateRoom(c *gin.Context) {
	var input services.CreateRoomInput

	if err := c.ShouldBindJSON(&input); err != nil {
		utils.ValidationErrorResponse(c, err.Error())
		return
	}

	user, _ := middleware.GetCurrentUser(c)
	room, err := h.roomService.CreateRoom(input, user.ID)
	if err != nil {
		utils.ErrorResponse(c, 400, "Failed to create room", err.Error())
		return
	}

	utils.SuccessResponse(c, 201, "Room created successfully", room.ToResponse())
}

// GetRoom gets room by ID
// @route GET /api/v1/rooms/:id
func (h *RoomHandler) GetRoom(c *gin.Context) {
	id, err := utils.ParseIDParam(c, "id")
	if err != nil {
		utils.ErrorResponse(c, 400, "Invalid room ID", err.Error())
		return
	}

	room, err := h.roomService.GetRoom(id)
	if err != nil {
		utils.ErrorResponse(c, 404, "Room not found", err.Error())
		return
	}

	utils.SuccessResponse(c, 200, "Room retrieved successfully", room.ToResponse())
}

// ListRooms lists all rooms
// @route GET /api/v1/rooms
func (h *RoomHandler) ListRooms(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "10"))

	filters := make(map[string]interface{})

	if status := c.Query("status"); status != "" {
		filters["status"] = status
	}
	if isActive := c.Query("is_active"); isActive != "" {
		filters["is_active"] = isActive == "true"
	}
	if minCapacity := c.Query("min_capacity"); minCapacity != "" {
		cap, _ := strconv.Atoi(minCapacity)
		filters["min_capacity"] = cap
	}
	if location := c.Query("location"); location != "" {
		filters["location"] = location
	}

	rooms, total, err := h.roomService.ListRooms(page, pageSize, filters)
	if err != nil {
		utils.ErrorResponse(c, 500, "Failed to retrieve rooms", err.Error())
		return
	}

	// Convert to responses
	var responses []interface{}
	for _, room := range rooms {
		responses = append(responses, room.ToResponse())
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

	utils.SuccessResponseWithMeta(c, 200, "Rooms retrieved successfully", responses, meta)
}

// UpdateRoom updates room
// @route PUT /api/v1/rooms/:id
func (h *RoomHandler) UpdateRoom(c *gin.Context) {
	id, err := utils.ParseIDParam(c, "id")
	if err != nil {
		utils.ErrorResponse(c, 400, "Invalid room ID", err.Error())
		return
	}

	var input services.UpdateRoomInput
	if err := c.ShouldBindJSON(&input); err != nil {
		utils.ValidationErrorResponse(c, err.Error())
		return
	}

	room, err := h.roomService.UpdateRoom(id, input)
	if err != nil {
		utils.ErrorResponse(c, 400, "Failed to update room", err.Error())
		return
	}

	utils.SuccessResponse(c, 200, "Room updated successfully", room.ToResponse())
}

// DeleteRoom deletes room
// @route DELETE /api/v1/rooms/:id
func (h *RoomHandler) DeleteRoom(c *gin.Context) {
	id, err := utils.ParseIDParam(c, "id")
	if err != nil {
		utils.ErrorResponse(c, 400, "Invalid room ID", err.Error())
		return
	}

	if err := h.roomService.DeleteRoom(id); err != nil {
		utils.ErrorResponse(c, 400, "Failed to delete room", err.Error())
		return
	}

	utils.SuccessResponse(c, 200, "Room deleted successfully", nil)
}

// CheckAvailability checks room availability
// @route POST /api/v1/rooms/:id/availability
func (h *RoomHandler) CheckAvailability(c *gin.Context) {
	id, err := utils.ParseIDParam(c, "id")
	if err != nil {
		utils.ErrorResponse(c, 400, "Invalid room ID", err.Error())
		return
	}

	var input services.CheckAvailabilityInput
	if err := c.ShouldBindJSON(&input); err != nil {
		utils.ValidationErrorResponse(c, err.Error())
		return
	}

	available, err := h.roomService.CheckAvailability(id, input)
	if err != nil {
		utils.ErrorResponse(c, 400, "Failed to check availability", err.Error())
		return
	}

	utils.SuccessResponse(c, 200, "Availability checked successfully", gin.H{
		"available": available,
	})
}
