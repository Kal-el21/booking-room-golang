package handlers

import (
	"github.com/Kal-el21/booking-room-golang/backend/internal/middleware"
	"github.com/Kal-el21/booking-room-golang/backend/internal/services"
	"github.com/Kal-el21/booking-room-golang/backend/internal/utils"

	"github.com/gin-gonic/gin"
)

type AuthHandler struct {
	authService *services.AuthService
}

func NewAuthHandler(authService *services.AuthService) *AuthHandler {
	return &AuthHandler{
		authService: authService,
	}
}

// Register handles user registration
// @route POST /api/v1/auth/register
func (h *AuthHandler) Register(c *gin.Context) {
	var input services.RegisterInput

	if err := c.ShouldBindJSON(&input); err != nil {
		utils.ValidationErrorResponse(c, err.Error())
		return
	}

	user, err := h.authService.Register(input)
	if err != nil {
		utils.ErrorResponse(c, 400, "Registration failed", err.Error())
		return
	}

	utils.SuccessResponse(c, 201, "User registered successfully", user.ToResponse())
}

// Login handles user login
// @route POST /api/v1/auth/login
func (h *AuthHandler) Login(c *gin.Context) {
	var input services.LoginInput

	if err := c.ShouldBindJSON(&input); err != nil {
		utils.ValidationErrorResponse(c, err.Error())
		return
	}

	// Get client info
	ipAddress := c.ClientIP()
	userAgent := c.GetHeader("User-Agent")

	response, err := h.authService.Login(input, &ipAddress, &userAgent)
	if err != nil {
		utils.ErrorResponse(c, 401, "Login failed", err.Error())
		return
	}

	utils.SuccessResponse(c, 200, "Login successful", response)
}

// Logout handles user logout
// @route POST /api/v1/auth/logout
func (h *AuthHandler) Logout(c *gin.Context) {
	// Get token from header
	authHeader := c.GetHeader("Authorization")
	if authHeader == "" {
		utils.ErrorResponse(c, 401, "Authorization header required", nil)
		return
	}

	// Extract token
	token := authHeader[7:] // Remove "Bearer "

	if err := h.authService.Logout(token); err != nil {
		utils.ErrorResponse(c, 500, "Logout failed", err.Error())
		return
	}

	utils.SuccessResponse(c, 200, "Logout successful", nil)
}

// Me returns current authenticated user
// @route GET /api/v1/auth/me
func (h *AuthHandler) Me(c *gin.Context) {
	user, exists := middleware.GetCurrentUser(c)
	if !exists {
		utils.ErrorResponse(c, 401, "Unauthorized", nil)
		return
	}

	utils.SuccessResponse(c, 200, "User retrieved successfully", user.ToResponse())
}

// RefreshToken refreshes access token
// @route POST /api/v1/auth/refresh
func (h *AuthHandler) RefreshToken(c *gin.Context) {
	var input struct {
		RefreshToken string `json:"refresh_token" binding:"required"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		utils.ValidationErrorResponse(c, err.Error())
		return
	}

	response, err := h.authService.RefreshToken(input.RefreshToken)
	if err != nil {
		utils.ErrorResponse(c, 401, "Token refresh failed", err.Error())
		return
	}

	utils.SuccessResponse(c, 200, "Token refreshed successfully", response)
}
