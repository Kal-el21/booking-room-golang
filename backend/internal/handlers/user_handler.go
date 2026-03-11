package handlers

import (
	"strconv"

	"github.com/Kal-el21/booking-room-golang/backend/internal/middleware"
	"github.com/Kal-el21/booking-room-golang/backend/internal/services"
	"github.com/Kal-el21/booking-room-golang/backend/internal/utils"

	"github.com/gin-gonic/gin"
)

type UserHandler struct {
	userService *services.UserService
}

func NewUserHandler(userService *services.UserService) *UserHandler {
	return &UserHandler{
		userService: userService,
	}
}

// GetCurrentUser gets current user profile
// @route GET /api/v1/users/me
func (h *UserHandler) GetCurrentUser(c *gin.Context) {
	user, _ := middleware.GetCurrentUser(c)

	// Get preferences
	preferences, _ := h.userService.GetPreferences(user.ID)

	response := user.ToResponse()
	response.Preferences = preferences

	utils.SuccessResponse(c, 200, "User retrieved successfully", response)
}

// UpdateCurrentUser updates current user profile
// @route PUT /api/v1/users/me
func (h *UserHandler) UpdateCurrentUser(c *gin.Context) {
	user, _ := middleware.GetCurrentUser(c)

	var input struct {
		Name     *string `json:"name"`
		Division *string `json:"division"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		utils.ValidationErrorResponse(c, err.Error())
		return
	}

	// Prepare update input for service
	updateInput := services.UpdateUserInput{
		Name:     input.Name,
		Division: input.Division,
	}

	updatedUser, err := h.userService.UpdateUser(user.ID, updateInput)
	if err != nil {
		utils.ErrorResponse(c, 400, "Failed to update profile", err.Error())
		return
	}

	utils.SuccessResponse(c, 200, "Profile updated successfully", updatedUser.ToResponse())
}

// GetUser gets user by ID (GA only)
// @route GET /api/v1/users/:id
func (h *UserHandler) GetUser(c *gin.Context) {
	id, err := utils.ParseIDParam(c, "id")
	if err != nil {
		utils.ErrorResponse(c, 400, "Invalid user ID", err.Error())
		return
	}

	user, err := h.userService.GetUser(uint(id))
	if err != nil {
		utils.ErrorResponse(c, 404, "User not found", err.Error())
		return
	}

	utils.SuccessResponse(c, 200, "User retrieved successfully", user.ToResponse())
}

// ListUsers lists all users (GA only)
// @route GET /api/v1/users
func (h *UserHandler) ListUsers(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "10"))

	users, total, err := h.userService.ListUsers(page, pageSize)
	if err != nil {
		utils.ErrorResponse(c, 500, "Failed to retrieve users", err.Error())
		return
	}

	var responses []interface{}
	for _, user := range users {
		responses = append(responses, user.ToResponse())
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

	utils.SuccessResponseWithMeta(c, 200, "Users retrieved successfully", responses, meta)
}

// UpdateUser updates user (GA only)
// @route PUT /api/v1/users/:id
func (h *UserHandler) UpdateUser(c *gin.Context) {
	id, err := utils.ParseIDParam(c, "id")
	if err != nil {
		utils.ErrorResponse(c, 400, "Invalid user ID", err.Error())
		return
	}

	var input services.UpdateUserInput
	if err := c.ShouldBindJSON(&input); err != nil {
		utils.ValidationErrorResponse(c, err.Error())
		return
	}

	user, err := h.userService.UpdateUser(uint(id), input)
	if err != nil {
		utils.ErrorResponse(c, 400, "Failed to update user", err.Error())
		return
	}

	utils.SuccessResponse(c, 200, "User updated successfully", user.ToResponse())
}

// DeleteUser deletes user (GA only)
// @route DELETE /api/v1/users/:id
func (h *UserHandler) DeleteUser(c *gin.Context) {
	id, err := utils.ParseIDParam(c, "id")
	if err != nil {
		utils.ErrorResponse(c, 400, "Invalid user ID", err.Error())
		return
	}

	if err := h.userService.DeleteUser(uint(id)); err != nil {
		utils.ErrorResponse(c, 400, "Failed to delete user", err.Error())
		return
	}

	utils.SuccessResponse(c, 200, "User deleted successfully", nil)
}

// ChangePassword changes user password
// @route PUT /api/v1/users/change-password
func (h *UserHandler) ChangePassword(c *gin.Context) {
	var input services.ChangePasswordInput
	if err := c.ShouldBindJSON(&input); err != nil {
		utils.ValidationErrorResponse(c, err.Error())
		return
	}

	user, _ := middleware.GetCurrentUser(c)
	if err := h.userService.ChangePassword(user.ID, input); err != nil {
		utils.ErrorResponse(c, 400, "Failed to change password", err.Error())
		return
	}

	utils.SuccessResponse(c, 200, "Password changed successfully", nil)
}

// UpdatePreferences updates user preferences
// @route PUT /api/v1/users/preferences
func (h *UserHandler) UpdatePreferences(c *gin.Context) {
	var input services.UpdatePreferencesInput
	if err := c.ShouldBindJSON(&input); err != nil {
		utils.ValidationErrorResponse(c, err.Error())
		return
	}

	user, _ := middleware.GetCurrentUser(c)
	preferences, err := h.userService.UpdatePreferences(user.ID, input)
	if err != nil {
		utils.ErrorResponse(c, 400, "Failed to update preferences", err.Error())
		return
	}

	utils.SuccessResponse(c, 200, "Preferences updated successfully", preferences)
}

// ResetPassword resets user password (Room Admin only)
// @route POST /api/v1/users/:id/reset-password
func (h *UserHandler) ResetPassword(c *gin.Context) {
	id, err := utils.ParseIDParam(c, "id")
	if err != nil {
		utils.ErrorResponse(c, 400, "Invalid user ID", err.Error())
		return
	}

	var input struct {
		NewPassword string `json:"new_password" binding:"required,min=6"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		utils.ValidationErrorResponse(c, err.Error())
		return
	}

	if err := h.userService.ResetPassword(uint(id), input.NewPassword); err != nil {
		utils.ErrorResponse(c, 400, "Failed to reset password", err.Error())
		return
	}

	utils.SuccessResponse(c, 200, "Password reset successfully", nil)
}
