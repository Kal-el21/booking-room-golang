package handlers

import (
	"strconv"

	"github.com/Kal-el21/booking-room-golang/backend/internal/middleware"
	"github.com/Kal-el21/booking-room-golang/backend/internal/services"
	"github.com/Kal-el21/booking-room-golang/backend/internal/utils"

	"github.com/gin-gonic/gin"
)

type CarHandler struct {
	carService *services.CarService
}

func NewCarHandler(carService *services.CarService) *CarHandler {
	return &CarHandler{
		carService: carService,
	}
}

// CreateCar creates a new car
// @route POST /api/v1/cars
func (h *CarHandler) CreateCar(c *gin.Context) {
	var input services.CreateCarInput

	if err := c.ShouldBindJSON(&input); err != nil {
		utils.ValidationErrorResponse(c, err.Error())
		return
	}

	user, _ := middleware.GetCurrentUser(c)
	car, err := h.carService.CreateCar(input, user.ID)
	if err != nil {
		utils.ErrorResponse(c, 400, "Failed to create car", err.Error())
		return
	}

	utils.SuccessResponse(c, 201, "Car created successfully", car.ToResponse())
}

// GetCar gets car by ID
// @route GET /api/v1/cars/:id
func (h *CarHandler) GetCar(c *gin.Context) {
	id, err := utils.ParseIDParam(c, "id")
	if err != nil {
		utils.ErrorResponse(c, 400, "Invalid car ID", err.Error())
		return
	}

	car, err := h.carService.GetCar(uint(id))
	if err != nil {
		utils.ErrorResponse(c, 404, "Car not found", err.Error())
		return
	}

	utils.SuccessResponse(c, 200, "Car retrieved successfully", car.ToResponse())
}

// UpdateCar updates car
// @route PUT /api/v1/cars/:id
func (h *CarHandler) UpdateCar(c *gin.Context) {
	id, err := utils.ParseIDParam(c, "id")
	if err != nil {
		utils.ErrorResponse(c, 400, "Invalid car ID", err.Error())
		return
	}

	var input services.UpdateCarInput
	if err := c.ShouldBindJSON(&input); err != nil {
		utils.ValidationErrorResponse(c, err.Error())
		return
	}

	_, _ = middleware.GetCurrentUser(c)
	car, err := h.carService.UpdateCar(uint(id), input)
	if err != nil {
		utils.ErrorResponse(c, 400, "Failed to update car", err.Error())
		return
	}

	utils.SuccessResponse(c, 200, "Car updated successfully", car.ToResponse())
}

// DeleteCar deletes car (soft delete)
// @route DELETE /api/v1/cars/:id
func (h *CarHandler) DeleteCar(c *gin.Context) {
	id, err := utils.ParseIDParam(c, "id")
	if err != nil {
		utils.ErrorResponse(c, 400, "Invalid car ID", err.Error())
		return
	}

	if err := h.carService.DeleteCar(uint(id)); err != nil {
		utils.ErrorResponse(c, 400, "Failed to delete car", err.Error())
		return
	}

	utils.SuccessResponse(c, 200, "Car deleted successfully", nil)
}

// ListCars lists all cars with pagination and filters
// @route GET /api/v1/cars
func (h *CarHandler) ListCars(c *gin.Context) {
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
		if cap, err := strconv.Atoi(minCapacity); err == nil {
			filters["min_capacity"] = cap
		}
	}
	if location := c.Query("location"); location != "" {
		filters["location"] = location
	}

	cars, total, err := h.carService.ListCars(page, pageSize, filters)
	if err != nil {
		utils.ErrorResponse(c, 500, "Failed to retrieve cars", err.Error())
		return
	}

	// Convert to responses
	var responses []interface{}
	for _, car := range cars {
		responses = append(responses, car.ToResponse())
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

	utils.SuccessResponseWithMeta(c, 200, "Cars retrieved successfully", responses, meta)
}

// CheckAvailability checks if car is available for booking
// @route POST /api/v1/cars/:id/availability
func (h *CarHandler) CheckAvailability(c *gin.Context) {
	id, err := utils.ParseIDParam(c, "id")
	if err != nil {
		utils.ErrorResponse(c, 400, "Invalid car ID", err.Error())
		return
	}

	var input services.CarCheckAvailabilityInput
	if err := c.ShouldBindJSON(&input); err != nil {
		utils.ValidationErrorResponse(c, err.Error())
		return
	}

	_, _ = middleware.GetCurrentUser(c)
	available, err := h.carService.CheckAvailability(uint(id), input)
	if err != nil {
		utils.ErrorResponse(c, 400, "Failed to check availability", err.Error())
		return
	}

	utils.SuccessResponse(c, 200, "Availability checked successfully", gin.H{"available": available})
}

// GetAvailableCars gets available cars for specific criteria
// @route GET /api/v1/cars/available
func (h *CarHandler) GetAvailableCars(c *gin.Context) {
	capacityStr := c.Query("capacity")
	bookingDate := c.Query("booking_date")
	startTime := c.Query("start_time")
	endTime := c.Query("end_time")

	if capacityStr == "" || bookingDate == "" || startTime == "" || endTime == "" {
		utils.ErrorResponse(c, 400, "Missing required parameters", "capacity, booking_date, start_time, and end_time are required")
		return
	}

	capacity, err := strconv.Atoi(capacityStr)
	if err != nil {
		utils.ErrorResponse(c, 400, "Invalid capacity", "Capacity must be a number")
		return
	}

	cars, err := h.carService.GetAvailableCars(capacity, bookingDate, startTime, endTime)
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

// UpdateCarImage updates car image URL
// @route POST /api/v1/cars/:id/image
func (h *CarHandler) UpdateCarImage(c *gin.Context) {
	id, err := utils.ParseIDParam(c, "id")
	if err != nil {
		utils.ErrorResponse(c, 400, "Invalid car ID", err.Error())
		return
	}

	var input struct {
		ImageURL string `json:"image_url" binding:"required"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		utils.ValidationErrorResponse(c, err.Error())
		return
	}

	_, _ = middleware.GetCurrentUser(c)
	car, err := h.carService.UpdateCarImage(uint(id), input.ImageURL)
	if err != nil {
		utils.ErrorResponse(c, 400, "Failed to update car image", err.Error())
		return
	}

	utils.SuccessResponse(c, 200, "Car image updated successfully", car.ToResponse())
}
