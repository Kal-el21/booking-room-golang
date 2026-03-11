package handlers

import (
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"

	"github.com/Kal-el21/booking-room-golang/backend/internal/middleware"
	"github.com/Kal-el21/booking-room-golang/backend/internal/services"
	"github.com/Kal-el21/booking-room-golang/backend/internal/utils"

	"strconv"

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

	preferences, _ := h.userService.GetPreferences(user.ID)

	response := user.ToResponse()
	response.Preferences = preferences

	utils.SuccessResponse(c, 200, "User retrieved successfully", response)
}

// UpdateCurrentUser updates current user profile (name, division) and optionally avatar.
// Accepts multipart/form-data:
//   - name     (string, optional)
//   - division (string, optional)
//   - avatar   (file,   optional) — JPG / PNG / WebP, max 5 MB
//
// @route PUT /api/v1/users/me
func (h *UserHandler) UpdateCurrentUser(c *gin.Context) {
	user, _ := middleware.GetCurrentUser(c)

	// Limit body size (5 MB for potential image upload)
	c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, MaxUploadSize)

	// Parse multipart form (maxMemory 5 MB)
	if err := c.Request.ParseMultipartForm(MaxUploadSize); err != nil {
		// Fallback: try plain JSON if Content-Type is not multipart
		// (keeps backward compatibility for clients that don't send a file)
		if err.Error() != "request Content-Type isn't multipart/form-data" {
			utils.ValidationErrorResponse(c, err.Error())
			return
		}
	}

	// ── Read text fields ──────────────────────────────────────
	updateInput := services.UpdateUserInput{}

	if name := c.PostForm("name"); name != "" {
		updateInput.Name = &name
	}
	if division := c.PostForm("division"); division != "" {
		updateInput.Division = &division
	}

	// ── Handle avatar file (optional) ────────────────────────
	var newAvatarURL *string

	file, header, fileErr := c.Request.FormFile("avatar")
	if fileErr == nil {
		defer file.Close()

		// Validate size
		if header.Size > MaxUploadSize {
			utils.ErrorResponse(c, 400, "File too large", "Maximum file size is 5MB")
			return
		}

		// Detect MIME type
		mimeType, err := detectMimeType(file)
		if err != nil {
			utils.ErrorResponse(c, 400, "Failed to detect file type", err.Error())
			return
		}
		ext, ok := allowedMimeTypes[mimeType]
		if !ok {
			utils.ErrorResponse(c, 400, "Invalid file type", "Only JPG, PNG, and WebP images are allowed")
			return
		}

		// Build filename: {name}_{email}_{division}.{ext}
		division := ""
		if user.Division != nil {
			division = *user.Division
		}
		// Use updated division value if provided in this request
		if updateInput.Division != nil {
			division = *updateInput.Division
		}
		name := user.Name
		if updateInput.Name != nil {
			name = *updateInput.Name
		}
		filename := buildUserFilename(name, user.Email, division, ext)

		// Ensure upload dir exists
		if err := ensureDir(UserUploadDir); err != nil {
			utils.ErrorResponse(c, 500, "Failed to create upload directory", err.Error())
			return
		}

		// Delete old avatar file if exists
		if user.Avatar != nil && *user.Avatar != "" {
			_ = os.Remove("." + *user.Avatar)
		}

		// Save new file
		destPath := filepath.Join(UserUploadDir, filename)
		destFile, err := os.Create(destPath)
		if err != nil {
			utils.ErrorResponse(c, 500, "Failed to save file", err.Error())
			return
		}
		defer destFile.Close()

		if _, err := io.Copy(destFile, file); err != nil {
			utils.ErrorResponse(c, 500, "Failed to write file", err.Error())
			return
		}

		avatarURL := fmt.Sprintf("/uploads/users/%s", filename)
		newAvatarURL = &avatarURL
	}

	// ── Apply profile updates ─────────────────────────────────
	// Update name/division if provided
	var updatedUser interface{}
	if updateInput.Name != nil || updateInput.Division != nil {
		u, err := h.userService.UpdateUser(user.ID, updateInput)
		if err != nil {
			utils.ErrorResponse(c, 400, "Failed to update profile", err.Error())
			return
		}
		updatedUser = u.ToResponse()
	}

	// Update avatar URL if a new file was uploaded
	if newAvatarURL != nil {
		u, err := h.userService.UpdateAvatar(user.ID, *newAvatarURL)
		if err != nil {
			utils.ErrorResponse(c, 500, "Failed to update avatar", err.Error())
			return
		}
		updatedUser = u.ToResponse()
	}

	// If nothing was changed, just return current user
	if updatedUser == nil {
		u, _ := h.userService.GetUser(user.ID)
		updatedUser = u.ToResponse()
	}

	utils.SuccessResponse(c, 200, "Profile updated successfully", updatedUser)
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
